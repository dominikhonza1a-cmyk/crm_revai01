import { pgTable, uuid, text, boolean, integer, jsonb, index } from "drizzle-orm/pg-core";
import { tenantColumns, auditColumns } from "@/shared/db/columns";

/** ProjectTemplate + TaskTemplate. Migrace 0003. Při Won→projekt se fáze/tasky KOPÍRUJÍ (snapshot). */
export const projectTemplates = pgTable("project_template", {
  id: uuid("id").primaryKey(),
  ...tenantColumns,
  key: text("key").notNull(),
  name: text("name").notNull(),
  projectType: text("project_type").notNull(),
  engagementType: text("engagement_type").notNull(),
  defaultSlaTier: text("default_sla_tier"),
  phases: jsonb("phases").notNull().default([]),      // [{key,name,position,duration_days}]
  isDefault: boolean("is_default").notNull().default(false),
  ...auditColumns,
});

export const taskTemplates = pgTable("task_template", {
  id: uuid("id").primaryKey(),
  ...tenantColumns,
  projectTemplateId: uuid("project_template_id").notNull(),
  phaseKey: text("phase_key").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  defaultAssigneeRole: text("default_assignee_role"),
  offsetDays: integer("offset_days").notNull().default(0),
  estimateMinutes: integer("estimate_minutes"),
  recurrenceRule: text("recurrence_rule"),
  position: integer("position").notNull().default(0),
  ...auditColumns,
}, (t) => ({
  tplIdx: index("task_template_tpl_idx").on(t.projectTemplateId),
}));

export type ProjectTemplateRow = typeof projectTemplates.$inferSelect;
export type TaskTemplateRow = typeof taskTemplates.$inferSelect;
