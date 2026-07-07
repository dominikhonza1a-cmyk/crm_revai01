import { defineWorkflow } from "../dsl";
import { CRON_JOBS } from "@/shared/scheduler";

/** W6: Recurring account review pro retainery ve fázi ongoing. Vytvoří review task pro PM s checklistem. */
export const accountReview = defineWorkflow({
  key: "account-review",
  title: "Recurring account review (retainer)",
  trigger: { type: "schedule", cron: CRON_JOBS.accountReview },
  conditions: [
    { field: "project.engagementType", op: "eq", value: "retainer" },
    { field: "project.status", op: "eq", value: "active" },
  ],
  actions: [
    { type: "create-task", params: { title: "Account review", assigneeRole: "pm", checklist: "account-review" } },
    { type: "write-timeline", params: { eventType: "task_created" } },
    { type: "notify", params: { category: "task_assigned", to: "project.owner" } },
  ],
  enabledByDefault: true,
});
