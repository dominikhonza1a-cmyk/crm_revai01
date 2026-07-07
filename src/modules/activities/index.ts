/**
 * Modul ACTIVITIES — lidské aktivity + agregovaná timeline.
 * Soubory: activity.types.ts · activity.entity.ts (Activity + TimelineEvent) · activity.repository.ts ·
 *          activity.service.ts (JEDINÝ zapisovač timeline) · activity.workflow.ts (projekce eventů → timeline).
 * Timeline agreguje obchod + delivery + support (viz docs/data-model/activity-vs-timeline.md).
 */
export * from "./activity.types";
export { activityService } from "./activity.service";
export { activityRepository } from "./activity.repository";
export { registerActivityWorkflows } from "./activity.workflow";
export function registerModule(): void { /* registerActivityWorkflows() z bootstrapu */ }

export const ACTIVITIES_ROUTER_NOTE = "activities.{logActivity,listTimeline,listUpcoming}; timeline read-only feed.";
