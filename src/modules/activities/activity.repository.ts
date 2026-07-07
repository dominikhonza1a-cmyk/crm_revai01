import { randomUUID } from "node:crypto";
import { and, eq, desc, isNull, inArray } from "drizzle-orm";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { clampLimit, type Page } from "@/shared/pagination";
import { activities, timelineEvents, type ActivityRow, type TimelineEventRow } from "./activity.entity";
import type { ActivityCreateInput, TimelineWriteInput, TimelineListFilter } from "./activity.types";

/** Repository aktivit + timeline. TimelineEvent je append-only a idempotentní (ON CONFLICT DO NOTHING). */
export const activityRepository = {
  async createActivity(input: ActivityCreateInput & { workspaceId: string; ownerId: string | null }): Promise<ActivityRow> {
    const id = randomUUID();
    await db().insert(activities).values({
      id, workspaceId: input.workspaceId,
      type: input.type, subject: input.subject, body: input.body ?? null,
      status: input.completedAt ? "done" : input.scheduledAt ? "planned" : "done",
      ownerId: input.ownerId, scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      completedAt: input.completedAt ? new Date(input.completedAt) : null,
      entityType: input.entityType, entityId: input.entityId,
    });
    return (await db().select().from(activities).where(eq(activities.id, id)).limit(1))[0]!;
  },

  /** Idempotentní zápis do timeline (unique source_type+source_id+event_type). */
  async insertTimelineEvent(input: TimelineWriteInput & { workspaceId: string }): Promise<void> {
    await db().insert(timelineEvents).values({
      id: randomUUID(), workspaceId: input.workspaceId,
      entityType: input.entityType, entityId: input.entityId,
      organizationId: input.organizationId ?? null,
      eventType: input.eventType, occurredAt: new Date(),
      actorType: input.actorId ? "user" : "system", actorId: input.actorId ?? null,
      sourceType: input.sourceType ?? null, sourceId: input.sourceId ?? null,
      title: input.title, payload: input.payload ?? null,
    }).onConflictDoNothing();
  },

  async listTimeline(filter: TimelineListFilter, limit?: number): Promise<Page<TimelineEventRow>> {
    const ws = currentWorkspaceId();
    const conds = [eq(timelineEvents.workspaceId, ws), eq(timelineEvents.entityType, filter.entityType), eq(timelineEvents.entityId, filter.entityId)];
    if (filter.eventTypes?.length) conds.push(inArray(timelineEvents.eventType, filter.eventTypes));
    const items = await db().select().from(timelineEvents)
      .where(and(...conds)).orderBy(desc(timelineEvents.occurredAt)).limit(clampLimit(limit));
    return { items, nextCursor: null };
  },

  async listUpcomingActivities(userId: string): Promise<ActivityRow[]> {
    const ws = currentWorkspaceId();
    return db().select().from(activities)
      .where(and(eq(activities.workspaceId, ws), eq(activities.ownerId, userId), eq(activities.status, "planned"), isNull(activities.deletedAt)))
      .orderBy(activities.scheduledAt).limit(50);
  },
};
