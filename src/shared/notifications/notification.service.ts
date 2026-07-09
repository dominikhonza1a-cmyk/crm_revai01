import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { notificationRules as rules } from "@/config/notification-rules";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { logger } from "@/shared/logger";
import { resolveChatNotifier } from "@/adapters/chat";
import { resolveEmailProvider } from "@/adapters/email";
import { appUsers } from "@/modules/security/security.entity";
import { notificationOutbox } from "./notification.entity";
import { notificationPreferences } from "./notification-preference.entity";

/**
 * Doručování notifikací. Kritické → immediate (chat+email), běžné → daily_digest. Dedup klíč
 * (ws:user:kategorie:kanál:zdroj:den) brání spamu. Per-user preference (Nastavení → Notifikace)
 * přepisují config defaulty; mode "off" kanál vypne. Viz docs/workflows/notifications.md.
 */
export type NotificationCategory = keyof typeof rules.categories;

export interface NotifyInput {
  category: NotificationCategory;
  userIds: (string | null | undefined)[];
  title: string;
  body?: string;
  link?: string;
  /** ID zdrojové entity pro dedup (task/deal/tracker id). */
  sourceId?: string;
}

const CFG: Record<string, { channels: readonly string[]; mode: "immediate" | "daily_digest" }> = rules.categories;

export const notifications = {
  async notify(input: NotifyInput): Promise<void> {
    const cfg = CFG[input.category] ?? { channels: ["email"], mode: "daily_digest" as const };
    const ws = currentWorkspaceId();
    const day = new Date().toISOString().slice(0, 10);
    const userIds = [...new Set(input.userIds.filter((u): u is string => !!u))];
    if (!userIds.length) return;

    // per-user přepis defaultů (Nastavení → Notifikace); klíč user:channel → mode
    const prefRows = await db().select().from(notificationPreferences)
      .where(and(eq(notificationPreferences.workspaceId, ws), eq(notificationPreferences.eventCategory, input.category), inArray(notificationPreferences.userId, userIds)));
    const prefs = new Map(prefRows.map((p) => [`${p.userId}:${p.channel}`, p.mode as "immediate" | "daily_digest" | "off"]));

    let anyImmediate = false;
    for (const userId of userIds) {
      for (const channel of cfg.channels) {
        const mode = prefs.get(`${userId}:${channel}`) ?? cfg.mode;
        if (mode === "off") continue;
        if (mode === "immediate") anyImmediate = true;
        await db().insert(notificationOutbox).values({
          id: randomUUID(), workspaceId: ws, userId, category: input.category, channel, mode,
          title: input.title, body: input.body ?? null, link: input.link ?? null, sourceId: input.sourceId ?? null,
          dedupKey: `${ws}:${userId}:${input.category}:${channel}:${input.sourceId ?? input.title}:${day}`,
        }).onConflictDoNothing();
      }
    }
    if (anyImmediate) await this.dispatchImmediate();
  },

  /** Odešle čekající immediate notifikace (chat webhook + email). Volá se po notify() i z workeru. */
  async dispatchImmediate(): Promise<void> {
    const ws = currentWorkspaceId();
    const pending = await db().select().from(notificationOutbox)
      .where(and(eq(notificationOutbox.workspaceId, ws), eq(notificationOutbox.status, "pending"), eq(notificationOutbox.mode, "immediate")));
    if (!pending.length) return;

    const emailByUser = await userEmails(pending.map((p) => p.userId).filter((u): u is string => !!u));
    const chat = resolveChatNotifier();
    const email = resolveEmailProvider();

    for (const n of pending) {
      try {
        if (n.channel === "chat") {
          await chat.postMessage({}, { title: n.title, body: n.body ?? undefined, link: n.link ?? undefined });
        } else {
          const to = n.userId ? emailByUser.get(n.userId) : null;
          if (to) await email.send({ to: [to], subject: n.title, html: `<p>${n.title}</p>${n.body ? `<p>${n.body}</p>` : ""}${n.link ? `<p><a href="${n.link}">Otevřít v CRM</a></p>` : ""}` });
        }
        await db().update(notificationOutbox).set({ status: "sent", sentAt: new Date() }).where(eq(notificationOutbox.id, n.id));
      } catch (err) {
        logger.error("notifikace selhala", { id: n.id, err: String(err) });
        await db().update(notificationOutbox).set({ status: "failed", error: String(err) }).where(eq(notificationOutbox.id, n.id));
      }
    }
  },

  /** Denní digest: agreguje čekající daily_digest řádky per uživatel do jednoho emailu. */
  async sendDigest(): Promise<{ users: number; items: number }> {
    const ws = currentWorkspaceId();
    const pending = await db().select().from(notificationOutbox)
      .where(and(eq(notificationOutbox.workspaceId, ws), eq(notificationOutbox.status, "pending"), eq(notificationOutbox.mode, "daily_digest")));
    if (!pending.length) return { users: 0, items: 0 };

    const byUser = new Map<string, typeof pending>();
    for (const n of pending) { if (!n.userId) continue; const list = byUser.get(n.userId) ?? []; list.push(n); byUser.set(n.userId, list); }
    const emailByUser = await userEmails([...byUser.keys()]);
    const email = resolveEmailProvider();

    for (const [userId, items] of byUser) {
      const to = emailByUser.get(userId);
      if (to) {
        const lines = items.map((i) => `<li>${i.title}${i.link ? ` — <a href="${i.link}">otevřít</a>` : ""}</li>`).join("");
        await email.send({ to: [to], subject: `revai CRM — denní přehled (${items.length})`, html: `<ul>${lines}</ul>` });
      }
      await db().update(notificationOutbox).set({ status: "digested", sentAt: new Date() })
        .where(inArray(notificationOutbox.id, items.map((i) => i.id)));
    }
    return { users: byUser.size, items: pending.length };
  },
};

async function userEmails(userIds: string[]): Promise<Map<string, string>> {
  if (!userIds.length) return new Map();
  const rows = await db().select({ id: appUsers.id, email: appUsers.email }).from(appUsers).where(inArray(appUsers.id, userIds));
  return new Map(rows.map((r) => [r.id, r.email]));
}
