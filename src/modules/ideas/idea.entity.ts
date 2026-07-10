import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";

/** Nápad — volná poznámka mimo klienty (nekonečné psaní, autosave). Migrace 0010. */
export const ideas = pgTable("idea", {
  id: uuid("id").primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  title: text("title").notNull().default("Nový nápad"),
  content: text("content").notNull().default(""),
  parentId: uuid("parent_id"),   // podstránka (hierarchie jako v Notionu)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  wsIdx: index("idea_ws_idx2").on(t.workspaceId, t.updatedAt),
}));

export type IdeaRow = typeof ideas.$inferSelect;
