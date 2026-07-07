import { pgTable, uuid, text, integer, bigint, boolean, date, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { tenantColumns, auditColumns, softDelete } from "@/shared/db/columns";

/**
 * Task (delivery / support ticket / sales_followup / interní) + SLAPolicy + SLATracker. Migrace 0004.
 * Support ticket = type=support (nullable ticket pole). CHECK type≠internal ⇒ project_id OR organization_id.
 */
export const tasks = pgTable("task", {
  id: uuid("id").primaryKey(),
  ...tenantColumns,
  projectId: uuid("project_id"),
  organizationId: uuid("organization_id"),
  phaseId: uuid("phase_id"),
  type: text("type").notNull().default("delivery"),   // delivery | support | sales_followup | internal
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"),   // todo | in_progress | waiting_on_client | blocked | done | canceled
  priority: text("priority").notNull().default("p3"),
  assigneeId: uuid("assignee_id"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  estimateMinutes: integer("estimate_minutes"),
  spentMinutes: integer("spent_minutes"),
  // support ticket
  reporterContactId: uuid("reporter_contact_id"),
  channel: text("channel"),
  firstRespondedAt: timestamp("first_responded_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  // recurrence (master)
  recurrenceRule: text("recurrence_rule"),
  recurrenceParentId: uuid("recurrence_parent_id"),
  recurrenceUntil: date("recurrence_until"),
  customFields: jsonb("custom_fields").notNull().default({}),
  ...auditColumns,
  ...softDelete,
}, (t) => ({
  assigneeIdx: index("task_assignee_idx").on(t.workspaceId, t.assigneeId, t.status),
  projectIdx: index("task_project_idx").on(t.workspaceId, t.projectId),
  supportIdx: index("task_support_idx").on(t.workspaceId, t.type, t.status),
}));

export const slaPolicies = pgTable("sla_policy", {
  id: uuid("id").primaryKey(),
  ...tenantColumns,
  name: text("name").notNull(),
  appliesTo: text("applies_to").notNull(),            // support | delivery | sales_followup
  tier: text("tier"),
  targets: jsonb("targets").notNull().default({}),
  businessHours: jsonb("business_hours"),
  useBusinessHours: boolean("use_business_hours").notNull().default(true),
  escalationRules: jsonb("escalation_rules").notNull().default([]),
  isDefault: boolean("is_default").notNull().default(false),
  ...auditColumns,
});

export const slaTrackers = pgTable("sla_tracker", {
  id: uuid("id").primaryKey(),
  ...tenantColumns,
  slaPolicyId: uuid("sla_policy_id").notNull(),
  entityType: text("entity_type").notNull(),          // task | deal
  entityId: uuid("entity_id").notNull(),
  metric: text("metric").notNull(),                   // first_response | resolution | due_date | followup
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  pausedTotalMs: bigint("paused_total_ms", { mode: "bigint" }).notNull().default(0n),
  satisfiedAt: timestamp("satisfied_at", { withTimezone: true }),
  breachedAt: timestamp("breached_at", { withTimezone: true }),
  status: text("status").notNull().default("running"),  // running | paused | met | breached | canceled
  escalationLevel: integer("escalation_level").notNull().default(0),
  lastEscalatedAt: timestamp("last_escalated_at", { withTimezone: true }),
  ...auditColumns,
}, (t) => ({
  entityIdx: index("sla_tracker_entity_idx").on(t.workspaceId, t.entityType, t.entityId),
}));

export type TaskRow = typeof tasks.$inferSelect;
export type TaskInsert = typeof tasks.$inferInsert;
export type SlaPolicyRow = typeof slaPolicies.$inferSelect;
export type SlaTrackerRow = typeof slaTrackers.$inferSelect;
