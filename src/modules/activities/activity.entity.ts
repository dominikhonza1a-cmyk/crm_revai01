/**
 * Drizzle table pro Activity (mutable lidská akce) + TimelineEvent (append-only systémový záznam).
 * Rozlišení viz docs/data-model/activity-vs-timeline.md.
 * TimelineEvent: bez updated_at/deleted_at; unique (source_type, source_id, event_type) proti duplikátům;
 * index (workspace_id, organization_id, occurred_at DESC) a (workspace_id, entity_type, entity_id, occurred_at DESC).
 */
export const ACTIVITY_ENTITY_NOTE = "Activity mutable; TimelineEvent append-only + denorm organization_id.";
