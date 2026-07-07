import type { WorkflowDefinition } from "./dsl";
import { dealWonCreateProject } from "./definitions/deal-won-create-project.workflow";
import { taskOverdueEscalation } from "./definitions/task-overdue-escalation.workflow";
import { slaBreachRisk } from "./definitions/sla-breach-risk.workflow";
import { recurringTasks } from "./definitions/recurring-tasks.workflow";
import { emailReminders } from "./definitions/email-reminders.workflow";
import { accountReview } from "./definitions/account-review.workflow";

/** Katalog vestavěných workflowů. Per-workspace enable/disable přes tabulku workflow_enablement. */
export const builtInWorkflows: WorkflowDefinition[] = [
  dealWonCreateProject,
  taskOverdueEscalation,
  slaBreachRisk,
  recurringTasks,
  emailReminders,
  accountReview,
];

export function getWorkflow(key: string): WorkflowDefinition | undefined {
  return builtInWorkflows.find((w) => w.key === key);
}
