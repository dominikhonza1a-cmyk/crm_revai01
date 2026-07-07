import type { TenantContext } from "@/shared";
import { activityRepository } from "./activity.repository";
import type { ActivityCreateInput, TimelineWriteInput, TimelineListFilter } from "./activity.types";

/**
 * JEDINÝ zapisovač timeline. Services i workflow engine volají writeTimeline() — nikdo nezapisuje
 * TimelineEvent přímo. UI čte pouze timeline (list). Viz docs/data-model/activity-vs-timeline.md.
 */
export const activityService = {
  async logActivity(ctx: TenantContext, input: ActivityCreateInput): Promise<{ activityId: string }> {
    const a = await activityRepository.createActivity({ ...input, workspaceId: ctx.workspaceId, ownerId: ctx.userId });
    if (a.status === "done") {
      await this.writeTimeline(ctx, {
        entityType: input.entityType, entityId: input.entityId,
        eventType: input.type === "email" ? "email_sent" : "note_added",
        title: input.subject, sourceType: "activity", sourceId: a.id,
      });
    }
    return { activityId: a.id };
  },

  /** Idempotentní zápis do timeline. actorId se bere z ctx (nebo null = systém). */
  async writeTimeline(ctx: TenantContext, input: TimelineWriteInput): Promise<void> {
    await activityRepository.insertTimelineEvent({ ...input, workspaceId: ctx.workspaceId, actorId: input.actorId ?? ctx.userId });
  },

  async listTimeline(_ctx: TenantContext, filter: TimelineListFilter) {
    return activityRepository.listTimeline(filter);
  },
};
