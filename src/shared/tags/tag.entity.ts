import { pgTable, uuid, text, index } from "drizzle-orm/pg-core";
import { tenantColumns, auditColumns, softDelete } from "@/shared/db/columns";

/** Tag + Tagging (polymorfní přes entity_type/entity_id). Migrace 0002. */
export const tags = pgTable("tag", {
  id: uuid("id").primaryKey(),
  ...tenantColumns,
  name: text("name").notNull(),
  color: text("color"),
  ...auditColumns,
  ...softDelete,
});

export const taggings = pgTable("tagging", {
  id: uuid("id").primaryKey(),
  ...tenantColumns,
  tagId: uuid("tag_id").notNull(),
  entityType: text("entity_type").notNull(),   // organization | contact | deal | project | task | document
  entityId: uuid("entity_id").notNull(),
}, (t) => ({
  entityIdx: index("tagging_entity_idx").on(t.workspaceId, t.entityType, t.entityId),
}));

export type TagRow = typeof tags.$inferSelect;
