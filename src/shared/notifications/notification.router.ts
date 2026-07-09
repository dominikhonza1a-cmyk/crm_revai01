import { randomUUID } from "node:crypto";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { router, protectedProcedure } from "@/api/trpc";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { notificationRules } from "@/config/notification-rules";
import { notificationPreferences } from "./notification-preference.entity";

const categoryEnum = z.enum(Object.keys(notificationRules.categories) as [string, ...string[]]);
const modeEnum = z.enum(["immediate", "daily_digest", "off"]);

/** Notifikační preference přihlášeného uživatele (přepis config defaultů). */
export const notificationsRouter = router({
  myPreferences: protectedProcedure.query(async ({ ctx }) => {
    const ws = currentWorkspaceId();
    const rows = await db().select().from(notificationPreferences)
      .where(and(eq(notificationPreferences.workspaceId, ws), eq(notificationPreferences.userId, ctx.userId!)));
    const byKey = new Map(rows.map((r) => [`${r.eventCategory}:${r.channel}`, r.mode]));

    return Object.entries(notificationRules.categories).map(([category, cfg]) => ({
      category,
      severity: cfg.severity,
      email: {
        available: (cfg.channels as readonly string[]).includes("email"),
        default: cfg.mode,
        mode: byKey.get(`${category}:email`) ?? cfg.mode,
      },
    }));
  }),

  setPreference: protectedProcedure
    .input(z.object({ category: categoryEnum, channel: z.enum(["email", "chat"]), mode: modeEnum }))
    .mutation(async ({ ctx, input }) => {
      const ws = currentWorkspaceId();
      const existing = (await db().select({ id: notificationPreferences.id }).from(notificationPreferences)
        .where(and(
          eq(notificationPreferences.workspaceId, ws), eq(notificationPreferences.userId, ctx.userId!),
          eq(notificationPreferences.eventCategory, input.category), eq(notificationPreferences.channel, input.channel),
        )).limit(1))[0];
      if (existing) {
        await db().update(notificationPreferences).set({ mode: input.mode, updatedAt: new Date() })
          .where(eq(notificationPreferences.id, existing.id));
      } else {
        await db().insert(notificationPreferences).values({
          id: randomUUID(), workspaceId: ws, userId: ctx.userId!,
          eventCategory: input.category, channel: input.channel, mode: input.mode,
        });
      }
    }),

  /** Návrat k defaultům (smaže všechny přepisy uživatele). */
  resetPreferences: protectedProcedure.mutation(async ({ ctx }) => {
    const ws = currentWorkspaceId();
    const rows = await db().select({ id: notificationPreferences.id }).from(notificationPreferences)
      .where(and(eq(notificationPreferences.workspaceId, ws), eq(notificationPreferences.userId, ctx.userId!)));
    if (rows.length) await db().delete(notificationPreferences).where(inArray(notificationPreferences.id, rows.map((r) => r.id)));
  }),
});
