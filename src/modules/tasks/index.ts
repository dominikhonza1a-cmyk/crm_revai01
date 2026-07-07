/**
 * Modul TASKS — univerzální pracovní jednotka: delivery task, support ticket (+SLA), sales follow-up, interní.
 * Soubory: task.types · task.validation · task.entity (Task + SLAPolicy + SLATracker) · task.repository ·
 *          sla.repository · task.service (tickety, SLA, changeStatus) · task.router · task.workflow (W4/W7 fáze 2).
 */
export * from "./task.types";
export { taskService } from "./task.service";
export { taskRepository } from "./task.repository";
export { tasksRouter } from "./task.router";
export { slaRepository } from "./sla.repository";
