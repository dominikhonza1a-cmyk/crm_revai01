import { z } from "zod";
import { and, eq, desc, inArray, sql } from "drizzle-orm";
import { router, protectedProcedure, requirePermission } from "@/api/trpc";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { timelineEvents } from "@/modules/activities/activity.entity";
import { organizations } from "@/modules/organizations/organization.entity";
import { integrationConnections } from "./google.entity";
import { googleService } from "./google.service";
import { runGoogleSync } from "./google-sync.job";

/** tRPC router integrací. Google připojení je per-user (každý si připojí svůj účet). */
export const integrationsRouter = router({
  googleStatus: protectedProcedure.query(({ ctx }) => googleService.status(ctx)),

  googleAuthUrl: protectedProcedure.mutation(({ ctx }) => googleService.authUrl(ctx)),

  googleDisconnect: protectedProcedure.mutation(({ ctx }) => googleService.disconnect(ctx)),

  // ruční spuštění synchronizace (jinak běží automaticky v frequent jobu)
  googleSyncNow: protectedProcedure.use(requirePermission("settings", "manage"))
    .mutation(() => runGoogleSync()),

  /** Dnešní schůzky přihlášeného uživatele — živě z jeho Google kalendáře. */
  todayAgenda: protectedProcedure.query(async ({ ctx }) => {
    const ws = currentWorkspaceId();
    const conn = (await db().select().from(integrationConnections)
      .where(and(eq(integrationConnections.workspaceId, ws), eq(integrationConnections.userId, ctx.userId!),
        eq(integrationConnections.provider, "google"), eq(integrationConnections.status, "active"))).limit(1))[0];
    if (!conn) return { connected: false as const, events: [] };

    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(); dayEnd.setHours(23, 59, 59, 999);
    try {
      const token = await googleService.accessToken(conn.refreshTokenEnc);
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(dayStart.toISOString())}&timeMax=${encodeURIComponent(dayEnd.toISOString())}&singleEvents=true&orderBy=startTime&maxResults=15`,
        { headers: { authorization: `Bearer ${token}` } });
      if (!res.ok) return { connected: true as const, events: [], error: `Google ${res.status}` };
      const data = (await res.json()) as { items?: { summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string }; attendees?: { email?: string }[]; hangoutLink?: string }[] };
      return {
        connected: true as const,
        events: (data.items ?? []).map((e) => ({
          summary: e.summary ?? "(bez názvu)",
          start: e.start?.dateTime ?? e.start?.date ?? "",
          end: e.end?.dateTime ?? null,
          allDay: !e.start?.dateTime,
          attendees: (e.attendees ?? []).map((a) => a.email ?? "").filter(Boolean).slice(0, 6),
          meetLink: e.hangoutLink ?? null,
        })),
      };
    } catch (err) {
      return { connected: true as const, events: [], error: String((err as Error)?.message ?? err) };
    }
  }),

  /** Historie e-mailů z timeline (párované na klienty). mine=true → jen z mé schránky. */
  emailFeed: protectedProcedure
    .input(z.object({ mine: z.boolean().default(true) }))
    .query(async ({ ctx, input }) => {
      const ws = currentWorkspaceId();
      const myConn = (await db().select({ email: integrationConnections.externalEmail }).from(integrationConnections)
        .where(and(eq(integrationConnections.workspaceId, ws), eq(integrationConnections.userId, ctx.userId!),
          eq(integrationConnections.provider, "google"))).limit(1))[0];
      const rows = await db().select({
        id: timelineEvents.id, eventType: timelineEvents.eventType, title: timelineEvents.title,
        occurredAt: timelineEvents.occurredAt, payload: timelineEvents.payload,
        organizationId: timelineEvents.organizationId, orgName: organizations.name,
      }).from(timelineEvents)
        .innerJoin(organizations, eq(timelineEvents.organizationId, organizations.id))
        .where(and(eq(timelineEvents.workspaceId, ws), inArray(timelineEvents.eventType, ["email_in", "email_out"]),
          ...(input.mine && myConn?.email ? [sql`${timelineEvents.payload}->>'via' = ${myConn.email}`] : [])))
        .orderBy(desc(timelineEvents.occurredAt)).limit(100);
      return { myEmail: myConn?.email ?? null, items: rows };
    }),
});
