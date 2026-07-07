/**
 * Modul TASKS — univerzální pracovní jednotka: delivery task, support ticket (+SLA), sales follow-up, interní.
 * Soubory: task.types.ts · task.validation.ts · task.entity.ts (+ SLATracker) · task.repository.ts ·
 *          task.service.ts (tickety, SLA, recurrence) · task.workflow.ts (overdue W4, recurring W7) · task.router.ts.
 */
export * from "./task.types";
export { taskService } from "./task.service";
export { taskRepository } from "./task.repository";
export { taskScheduledJobs } from "./task.workflow";
// export { tasksRouter } from "./task.router";

export function registerModule(): void {
  // scheduled joby se registrují ve worker.ts z taskScheduledJobs
}
