import { pgTable, uuid, text, bigint, numeric, date, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { tenantColumns, auditColumns, softDelete } from "@/shared/db/columns";

/**
 * Project (sub-karta klienta) + ProjectPhase (snapshot ze šablony). Migrace 0003.
 * project.deal_id UNIQUE (idempotence Won→Project); on_hold je status, ne fáze.
 */
export const projects = pgTable("project", {
  id: uuid("id").primaryKey(),
  ...tenantColumns,
  organizationId: uuid("organization_id").notNull(),
  dealId: uuid("deal_id"),
  templateId: uuid("template_id"),
  name: text("name").notNull(),
  code: text("code"),
  projectType: text("project_type").notNull(),
  engagementType: text("engagement_type").notNull(),   // one_off | retainer
  monthlyAmountMinor: bigint("monthly_amount_minor", { mode: "bigint" }),   // retainer CZK/měs (haléře)
  status: text("status").notNull().default("draft"),   // draft | active | on_hold | closed
  currentPhaseId: uuid("current_phase_id"),
  ownerId: uuid("owner_id"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  budgetMinor: bigint("budget_minor", { mode: "bigint" }),
  retainerFeeMinor: bigint("retainer_fee_minor", { mode: "bigint" }),
  retainerPeriod: text("retainer_period"),
  retainerHoursIncluded: numeric("retainer_hours_included"),
  deliverySlaPolicyId: uuid("delivery_sla_policy_id"),
  customFields: jsonb("custom_fields").notNull().default({}),
  ...auditColumns,
  ...softDelete,
}, (t) => ({
  orgIdx: index("project_org_idx").on(t.workspaceId, t.organizationId),
}));

export const projectPhases = pgTable("project_phase", {
  id: uuid("id").primaryKey(),
  ...tenantColumns,
  projectId: uuid("project_id").notNull(),
  key: text("key").notNull(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  status: text("status").notNull().default("pending"),
  dueDate: date("due_date"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...auditColumns,
}, (t) => ({
  projIdx: index("project_phase_proj_idx").on(t.projectId, t.position),
}));

export type ProjectRow = typeof projects.$inferSelect;
export type ProjectInsert = typeof projects.$inferInsert;
export type ProjectPhaseRow = typeof projectPhases.$inferSelect;
