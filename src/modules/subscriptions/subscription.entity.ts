import { pgTable, uuid, text, char, bigint, timestamp, date, index } from "drizzle-orm/pg-core";

/** Předplatné (fixní náklad) — Claude, GPT, hosting… Heslo jen šifrované. Migrace 0011. */
export const subscriptions = pgTable("subscription", {
  id: uuid("id").primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  name: text("name").notNull(),
  purpose: text("purpose"),
  email: text("email"),
  passwordEnc: text("password_enc"),
  url: text("url"),
  amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull().default(0n),
  currency: char("currency", { length: 3 }).notNull().default("USD"),
  period: text("period").notNull().default("monthly"),   // monthly | yearly | one_off
  paidOn: date("paid_on"),                               // u one_off: datum zaplacení
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  wsIdx: index("subscription_ws_idx2").on(t.workspaceId),
}));

export type SubscriptionRow = typeof subscriptions.$inferSelect;
