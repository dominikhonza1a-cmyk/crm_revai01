import { pgTable, uuid, text, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { tenantColumns, auditColumns } from "@/shared/db/columns";

/** CustomFieldDefinition — definice polí per entita. Hodnoty žijí v custom_fields JSONB na hostiteli. Migrace 0002. */
export const customFieldDefinitions = pgTable("custom_field_definition", {
  id: uuid("id").primaryKey(),
  ...tenantColumns,
  entityType: text("entity_type").notNull(),   // organization | contact | deal | project | task
  key: text("key").notNull(),                  // immutable slug
  label: text("label").notNull(),
  fieldType: text("field_type").notNull(),
  options: jsonb("options"),
  required: boolean("required").notNull().default(false),
  position: integer("position").notNull().default(0),
  isPii: boolean("is_pii").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  ...auditColumns,
});

export type CustomFieldDefinitionRow = typeof customFieldDefinitions.$inferSelect;
