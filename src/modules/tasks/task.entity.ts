/**
 * Drizzle table pro Task (univerzální: delivery/support/sales_followup/internal) + SLATracker.
 * CHECK: type≠internal ⇒ project_id OR organization_id NOT NULL.
 * Recurrence: recurrence_rule jen na masteru; unique (recurrence_parent_id, due_at) proti duplikátům (W7).
 * Support pole (reporter_contact_id, channel, first_responded_at, resolved_at) NULL u jiných typů.
 */

// export const tasks = pgTable("task", { ... type, status, priority, dueAt, recurrenceRule,
//   recurrenceParentId (self FK), ... }, (t) => ({
//     recurUnique: uniqueIndex().on(t.recurrenceParentId, t.dueAt),
//     ...
//   }));
//
// export const slaTrackers = pgTable("sla_tracker", { ... slaPolicyId, entityType, entityId, metric,
//   dueAt, pausedTotalMs, status, escalationLevel, ... });

export const TASK_ENTITY_NOTE = "Task univerzální; SLATracker per metrika; unique (recurrence_parent_id,due_at).";
