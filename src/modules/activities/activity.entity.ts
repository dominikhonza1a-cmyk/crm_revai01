import { pgTable, uuid, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { tenantColumns, auditColumns, softDelete } from "@/shared/db/columns";

/**
 * Activity (mutable lidská akce) + TimelineEvent (append-only systémový záznam). Migrace 0003.
 * Rozlišení viz docs/data-model/activity-vs-timeline.md. TimelineEvent: unique (source_type, source_id, event_type).
 */
export const activities = pgTable("activity", {
  id: uuid("id").primaryKey(),
  ...tenantColumns,
  type: text("type").notNull(),                 // call | meeting | email | note | demo | task_note
  subject: text("subject"),
  body: text("body"),
  direction: text("direction"),                 // inbound | outbound
  status: text("status").notNull().default("done"),  // planned | done | canceled
  ownerId: uuid("owner_id"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  durationMinutes: integer("duration_minutes"),
  entityType: text("entity_type").notNull(),    // organization | contact | deal | project | task
  entityId: uuid("entity_id").notNull(),
  organizationId: uuid("organization_id"),      // denorm
  contactId: uuid("contact_id"),
  emailMessageId: text("email_message_id"),
  emailThreadId: text("email_thread_id"),
  emailMetadata: jsonb("email_metadata"),
  ...auditColumns,
  ...softDelete,
}, (t) => ({
  entityIdx: index("activity_entity_idx").on(t.workspaceId, t.entityType, t.entityId),
}));

export const timelineEvents = pgTable("timeline_event", {
  id: uuid("id").primaryKey(),
  ...tenantColumns,
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  organizationId: uuid("organization_id"),      // denorm — org timeline bez fan-outu
  eventType: text("event_type").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  actorType: text("actor_type").notNull().default("system"),  // user | system | integration
  actorId: uuid("actor_id"),
  sourceType: text("source_type"),
  sourceId: uuid("source_id"),
  title: text("title").notNull(),
  payload: jsonb("payload"),
}, (t) => ({
  orgIdx: index("timeline_org_idx").on(t.workspaceId, t.organizationId, t.occurredAt),
  entityIdx: index("timeline_entity_idx").on(t.workspaceId, t.entityType, t.entityId, t.occurredAt),
}));

export type ActivityRow = typeof activities.$inferSelect;
export type TimelineEventRow = typeof timelineEvents.$inferSelect;
