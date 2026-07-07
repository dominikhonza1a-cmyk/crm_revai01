/**
 * Drizzle table definice pro Project + ProjectPhase.
 * project.deal_id UNIQUE (idempotence Won→Project). project.status enum(draft|active|on_hold|closed).
 * project_phase je SNAPSHOT ze šablony (kopie, ne živá reference) — viz docs/data-model/conventions.md.
 */

// export const projects = pgTable("project", {
//   id, workspaceId, organizationId,
//   dealId: uuid("deal_id").unique(),               // idempotence
//   engagementType: text("engagement_type").notNull(),  // one_off | retainer
//   status: text("status").notNull().default("draft"),
//   currentPhaseId: uuid("current_phase_id"),
//   endDate: date("end_date"),                       // retainer: null
//   ...timestamps,
// });
//
// export const projectPhases = pgTable("project_phase", {
//   id, workspaceId, projectId,
//   key: text("key").notNull(),                      // enum ProjectPhaseKey
//   position: integer("position").notNull(),
//   status: text("status").notNull().default("pending"),
//   dueDate: date("due_date"),
//   ...timestamps,
// });

export const PROJECT_ENTITY_NOTE = "project.deal_id UNIQUE; project_phase = snapshot; on_hold je status, ne fáze.";
