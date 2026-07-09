import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { runWithTenant, currentWorkspaceId, type TenantContext } from "@/shared/tenant-context";
import { asId, type WorkspaceId } from "@/domain/ids";
import { organizations } from "@/modules/organizations/organization.entity";
import { contacts } from "@/modules/contacts/contact.entity";
import { activityService } from "@/modules/activities/activity.service";
import { integrationConnections } from "./google.entity";
import { googleService } from "./google.service";

/**
 * Sync job (frequent): pro každé aktivní Google připojení stáhne poslední e-maily (48 h)
 * a nadcházející kalendářní události (14 dní), spáruje je s klienty (e-mail kontaktu, jinak
 * doména webu klienta) a idempotentně zapíše do timeline organizace. Jen čtení (readonly scopes).
 */
const MAX_MESSAGES = 40;
const MAX_EVENTS = 50;

/** Deterministické UUID z libovolného řetězce (Gmail/Calendar ID nejsou UUID; timeline source_id je uuid). */
function uuidFrom(s: string): string {
  const h = createHash("md5").update(s).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const emailsIn = (s: string | undefined) => (s ?? "").toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g) ?? [];
const domainOf = (email: string) => email.split("@")[1] ?? "";
const hostToDomain = (url: string | null) => {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; }
};

async function matchingMaps() {
  const ws = currentWorkspaceId();
  const orgs = await db().select({ id: organizations.id, website: organizations.website })
    .from(organizations).where(and(eq(organizations.workspaceId, ws), isNull(organizations.deletedAt)));
  const cts = await db().select({ email: contacts.email, organizationId: contacts.organizationId })
    .from(contacts).where(and(eq(contacts.workspaceId, ws), isNull(contacts.deletedAt)));

  const byEmail = new Map<string, string>();
  for (const c of cts) if (c.email && c.organizationId) byEmail.set(c.email.toLowerCase(), c.organizationId);
  const byDomain = new Map<string, string>();
  for (const o of orgs) { const d = hostToDomain(o.website); if (d && !byDomain.has(d)) byDomain.set(d, o.id); }
  return { byEmail, byDomain };
}

function findOrg(addr: string, maps: { byEmail: Map<string, string>; byDomain: Map<string, string> }): string | null {
  return maps.byEmail.get(addr) ?? maps.byDomain.get(domainOf(addr)) ?? null;
}

async function gapi(token: string, url: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) { logger.warn("google api chyba", { url: url.split("?")[0], status: res.status }); return null; }
  return (await res.json()) as Record<string, unknown>;
}

async function syncGmail(ctx: TenantContext, token: string, ownEmail: string, maps: Awaited<ReturnType<typeof matchingMaps>>): Promise<number> {
  const ownDomain = domainOf(ownEmail);
  const list = await gapi(token, `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent("newer_than:2d -in:chats")}&maxResults=${MAX_MESSAGES}`);
  const ids = ((list?.messages as { id: string }[] | undefined) ?? []).map((m) => m.id);
  let written = 0;

  for (const id of ids) {
    const msg = await gapi(token, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Subject&metadataHeaders=Date`);
    if (!msg) continue;
    const headers = ((msg.payload as { headers?: { name: string; value: string }[] })?.headers ?? []);
    const h = (n: string) => headers.find((x) => x.name.toLowerCase() === n.toLowerCase())?.value;
    const from = emailsIn(h("From"));
    const others = [...emailsIn(h("To")), ...emailsIn(h("Cc")), ...from].filter((a) => domainOf(a) !== ownDomain);
    const outgoing = from.some((a) => a === ownEmail.toLowerCase() || domainOf(a) === ownDomain);

    const orgId = others.map((a) => findOrg(a, maps)).find(Boolean);
    if (!orgId) continue;

    await activityService.writeTimeline(ctx, {
      entityType: "organization", entityId: orgId, organizationId: orgId,
      eventType: outgoing ? "email_out" : "email_in",
      title: `📧 ${h("Subject") ?? "(bez předmětu)"}`,
      payload: { from: h("From"), to: h("To"), date: h("Date"), via: ownEmail },
      sourceType: "integration_event", sourceId: uuidFrom(`gmail:${id}:${orgId}`),
    });
    written++;
  }
  return written;
}

async function syncCalendar(ctx: TenantContext, token: string, ownEmail: string, maps: Awaited<ReturnType<typeof matchingMaps>>, now: Date): Promise<number> {
  const ownDomain = domainOf(ownEmail);
  const timeMax = new Date(now.getTime() + 14 * 24 * 3600_000);
  const list = await gapi(token, `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now.toISOString())}&timeMax=${encodeURIComponent(timeMax.toISOString())}&singleEvents=true&orderBy=startTime&maxResults=${MAX_EVENTS}`);
  const items = (list?.items as { id: string; summary?: string; start?: { dateTime?: string; date?: string }; attendees?: { email?: string }[] }[] | undefined) ?? [];
  let written = 0;

  for (const ev of items) {
    const attendees = (ev.attendees ?? []).map((a) => (a.email ?? "").toLowerCase()).filter((a) => a && domainOf(a) !== ownDomain);
    const orgId = attendees.map((a) => findOrg(a, maps)).find(Boolean);
    if (!orgId) continue;
    const start = ev.start?.dateTime ?? ev.start?.date ?? "";

    await activityService.writeTimeline(ctx, {
      entityType: "organization", entityId: orgId, organizationId: orgId,
      eventType: "meeting",
      title: `📅 ${ev.summary ?? "Schůzka"} · ${start.slice(0, 16).replace("T", " ")}`,
      payload: { start, attendees, via: ownEmail },
      sourceType: "integration_event", sourceId: uuidFrom(`gcal:${ev.id}:${orgId}`),
    });
    written++;
  }
  return written;
}

export async function runGoogleSync(now = new Date()): Promise<{ connections: number; emails: number; events: number }> {
  const conns = await db().select().from(integrationConnections)
    .where(and(eq(integrationConnections.provider, "google"), eq(integrationConnections.status, "active")));

  let emails = 0, events = 0;
  for (const conn of conns) {
    const ctx: TenantContext = { workspaceId: asId<WorkspaceId>(conn.workspaceId), userId: null, requestId: `google-sync:${conn.id}` };
    try {
      await runWithTenant(ctx, async () => {
        const token = await googleService.accessToken(conn.refreshTokenEnc);
        const maps = await matchingMaps();
        const own = (conn.externalEmail ?? "").toLowerCase();
        emails += await syncGmail(ctx, token, own, maps);
        events += await syncCalendar(ctx, token, own, maps, now);
      });
      await db().update(integrationConnections).set({ lastSyncedAt: now, lastError: null, updatedAt: now }).where(eq(integrationConnections.id, conn.id));
    } catch (err) {
      const msg = String((err as Error)?.message ?? err);
      logger.warn("google sync selhal", { conn: conn.id, err: msg });
      await db().update(integrationConnections).set({
        lastError: msg.slice(0, 500), updatedAt: now,
        // invalid_grant = token odvolán/expirl → connection označit, ať UI ukáže „připoj znovu"
        ...(msg.includes("invalid_grant") ? { status: "error" } : {}),
      }).where(eq(integrationConnections.id, conn.id));
    }
  }
  if (conns.length) logger.info("google sync hotov", { connections: conns.length, emails, events });
  return { connections: conns.length, emails, events };
}
