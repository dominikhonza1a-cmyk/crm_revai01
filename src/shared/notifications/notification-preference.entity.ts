import { pgTable, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Per-user notifikační preference: user × event_category × channel → mode.
 * Chybějící řádek = platí default z config/notification-rules.ts. Migrace 0009.
 */
export const notificationPreferences = pgTable("notification_preference", {
  id: uuid("id").primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  userId: uuid("user_id").notNull(),
  eventCategory: text("event_category").notNull(),
  channel: text("channel").notNull(),            // email | chat
  mode: text("mode").notNull(),                  // immediate | daily_digest | off
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uq: uniqueIndex("notification_preference_uq").on(t.workspaceId, t.userId, t.eventCategory, t.channel),
}));

export type NotificationPreferenceRow = typeof notificationPreferences.$inferSelect;
