import { pgTable, uuid, text, char, jsonb, index } from "drizzle-orm/pg-core";
import { tenantColumns, auditColumns, softDelete } from "@/shared/db/columns";

/**
 * Organization (Klient) — prospekt i klient v jedné entitě (lifecycle_stage). Migrace 0002.
 * custom_fields JSONB + GIN index; support_sla_policy_id bez FK (sla_policy vzniká v 0003).
 */
export const organizations = pgTable("organization", {
  id: uuid("id").primaryKey(),
  ...tenantColumns,
  name: text("name").notNull(),
  legalName: text("legal_name"),
  lifecycleStage: text("lifecycle_stage").notNull().default("prospect"),
  website: text("website"),
  country: char("country", { length: 2 }),
  city: text("city"),
  employeeBand: text("employee_band"),
  industry: text("industry"),
  ownerId: uuid("owner_id"),
  supportSlaPolicyId: uuid("support_sla_policy_id"),
  healthStatus: text("health_status"),
  billingNotes: text("billing_notes"),
  source: text("source"),
  customFields: jsonb("custom_fields").notNull().default({}),
  ...auditColumns,
  ...softDelete,
}, (t) => ({
  wsIdx: index("organization_ws_idx").on(t.workspaceId),
}));

export type OrganizationRow = typeof organizations.$inferSelect;
export type OrganizationInsert = typeof organizations.$inferInsert;
