import { defineWorkflow } from "../dsl";

/** W2: Won deal → projekt v draftu ze šablony. Idempotence přes deal.createdProjectId. Viz docs/workflows/catalog.md#w2. */
export const dealWonCreateProject = defineWorkflow({
  key: "deal-won-create-project",
  title: "Won deal → projekt (draft)",
  trigger: { type: "event", event: "deal.won" },
  conditions: [{ field: "deal.createdProjectId", op: "isNull" }],
  actions: [
    { type: "create-project-from-template", params: { templateFrom: "deal.projectTypeHint", status: "draft" } },
    { type: "provision-tasks", params: {} },
    { type: "write-timeline", params: { eventType: "project_created" } },
    { type: "notify", params: { category: "task_assigned", to: "project.owner", title: "Nový projekt v draftu — potvrď tým a termíny" } },
  ],
  enabledByDefault: true,
});
