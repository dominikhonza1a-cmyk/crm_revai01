/**
 * Modul ACTIVITIES — lidské aktivity + agregovaná timeline.
 * Soubory: activity.types · activity.entity (Activity + TimelineEvent) · activity.repository ·
 *          activity.service (JEDINÝ zapisovač timeline) · activity.router · activity.workflow.
 * Timeline agreguje obchod + delivery + support (viz docs/data-model/activity-vs-timeline.md).
 */
export * from "./activity.types";
export { activityService } from "./activity.service";
export { activityRepository } from "./activity.repository";
export { activitiesRouter } from "./activity.router";
export { registerActivityWorkflows } from "./activity.workflow";
