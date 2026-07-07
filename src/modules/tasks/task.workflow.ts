import { CRON_JOBS } from "@/shared/scheduler";

/**
 * Scheduled hooky modulu tasks (registrují se ve worker.ts):
 *  - W4 overdueTasks: findOverdue → eskalace + timeline(task_overdue) + notify(task_overdue)
 *  - W7 recurringTasks: findRecurrenceMasters → createRecurrenceInstance (klouzavé okno 60 dní)
 */
export const taskScheduledJobs = [
  { key: "tasks.overdue", cron: CRON_JOBS.overdueTasks },
  { key: "tasks.recurring", cron: CRON_JOBS.recurringTasks },
] as const;
