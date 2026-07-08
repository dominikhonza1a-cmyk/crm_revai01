import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";

/** Erasure tombstone (migrace 0007) — po restore ze zálohy se výmaz re-aplikuje. */
export const erasureTombstones = pgTable("erasure_tombstone", {
  id: uuid("id").primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  contactId: uuid("contact_id").notNull(),
  subjectEmailHash: text("subject_email_hash"),
  executedBy: uuid("executed_by"),
  executedAt: timestamp("executed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  wsIdx: index("erasure_ws_idx").on(t.workspaceId, t.executedAt),
}));
