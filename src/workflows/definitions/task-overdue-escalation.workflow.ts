import { defineWorkflow } from "../dsl";
import { CRON_JOBS } from "@/shared/scheduler";

/** W4: Overdue delivery tasky → reminder + eskalace. waiting_on_client pauzuje. Viz docs/workflows/catalog.md#w4. */
export const taskOverdueEscalation = defineWorkflow({
  key: "task-overdue-escalation",
  title: "Overdue tasky → eskalace",
  trigger: { type: "schedule", cron: CRON_JOBS.overdueTasks },
  conditions: [
    { field: "task.status", op: "in", value: ["todo", "in_progress", "blocked"] },
    { field: "task.dueAt", op: "isNotNull" },
  ],
  actions: [
    { type: "escalate", params: { metric: "due_date", steps: "sla_policy.escalation_rules" } },
    { type: "write-timeline", params: { eventType: "task_overdue" } },
    { type: "notify", params: { category: "task_overdue" } },
  ],
  enabledByDefault: true,
});
