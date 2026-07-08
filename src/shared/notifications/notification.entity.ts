import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";

/** Durable fronta notifikací (migrace 0006). Dedup přes dedup_key; digest řádky vyzvedne noční job. */
export const notificationOutbox = pgTable("notification_outbox", {
  id: uuid("id").primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  userId: uuid("user_id"),
  category: text("category").notNull(),
  channel: text("channel").notNull(),           // chat | email
  mode: text("mode").notNull(),                 // immediate | daily_digest
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  sourceId: text("source_id"),
  dedupKey: text("dedup_key").notNull(),
  status: text("status").notNull().default("pending"),  // pending | sent | failed | digested
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
}, (t) => ({
  dedupUq: uniqueIndex("notification_dedup_uq").on(t.dedupKey),
  pendingIdx: index("notification_pending_idx").on(t.workspaceId, t.status, t.mode),
}));

export type NotificationRow = typeof notificationOutbox.$inferSelect;
