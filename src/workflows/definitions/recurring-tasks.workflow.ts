import { defineWorkflow } from "../dsl";
import { CRON_JOBS } from "@/shared/scheduler";

/** W7: Materializace recurring tasků (retainery) klouzavým oknem. Idempotence (recurrence_parent_id, due_at). */
export const recurringTasks = defineWorkflow({
  key: "recurring-tasks",
  title: "Recurring tasky — materializace",
  trigger: { type: "schedule", cron: CRON_JOBS.recurringTasks },
  conditions: [{ field: "task.recurrenceRule", op: "isNotNull" }],
  actions: [
    { type: "create-task", params: { fromRecurrenceMaster: true, windowDays: 60 } },
  ],
  enabledByDefault: true,
});
