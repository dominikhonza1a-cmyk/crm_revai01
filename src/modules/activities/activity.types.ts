import type { ActivityType, TimelineHostEntity } from "@/domain/enums";

export interface ActivityCreateInput {
  type: ActivityType;              // call | meeting | email | note | demo | task_note
  subject: string;
  body?: string;
  entityType: TimelineHostEntity;  // organization | contact | deal | project | task
  entityId: string;
  scheduledAt?: string;            // planned aktivita
  completedAt?: string;
}

/** Systémový zápis do timeline (jediný povolený zapisovač je activities.service). */
export interface TimelineWriteInput {
  entityType: TimelineHostEntity;
  entityId: string;
  organizationId?: string;         // denorm — org-level timeline
  eventType: string;               // enum event_type
  title: string;
  payload?: Record<string, unknown>;
  sourceType?: string;
  sourceId?: string;
  actorId?: string | null;
}

export interface TimelineListFilter { entityType: TimelineHostEntity; entityId: string; eventTypes?: string[]; }
