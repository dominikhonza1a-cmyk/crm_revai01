import type { TenantContext } from "@/shared";
import type { ActivityCreateInput, TimelineWriteInput, TimelineListFilter } from "./activity.types";

/**
 * JEDINÝ zapisovač timeline v celé aplikaci. Services i workflow engine volají writeTimeline() — nikdo
 * nezapisuje TimelineEvent přímo. Activity (lidská akce) se při dokončení projektuje do TimelineEventu.
 * UI čte pouze timeline (list) — jeden dotaz, jedno řazení. Viz docs/data-model/activity-vs-timeline.md.
 */
export interface ActivityService {
  logActivity(ctx: TenantContext, input: ActivityCreateInput): Promise<{ activityId: string }>;
  /** Idempotentní zápis do timeline (unique source_type+source_id+event_type). */
  writeTimeline(ctx: TenantContext, input: TimelineWriteInput): Promise<void>;
  listTimeline(ctx: TenantContext, filter: TimelineListFilter): Promise<unknown>;
}

export const activityService: ActivityService = {
  async logActivity(_ctx, input) {
    // vytvoř Activity; při completedAt → writeTimeline(activity_logged / email_sent / meeting_held …)
    void input; throw new Error("activityService.logActivity: fáze 1.");
  },
  async writeTimeline(_ctx, input) {
    // INSERT timeline_event ON CONFLICT (source_type, source_id, event_type) DO NOTHING (idempotence)
    void input; throw new Error("activityService.writeTimeline: fáze 1.");
  },
  async listTimeline(_ctx, filter) {
    void filter; throw new Error("activityService.listTimeline: fáze 1 (cursor pagination).");
  },
};
