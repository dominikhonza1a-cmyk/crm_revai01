import { defineWorkflow } from "@/workflows/dsl";

/**
 * Ukázka VLASTNÍ automatizace (mimo 6 vestavěných). Definice je data → lze ji přidat do registry,
 * per-workspace zapnout a později editovat v UI. Viz docs/workflows/engine.md.
 *
 * Scénář: když projekt vstoupí do fáze Deploy, vytvoř support ticket "Post-deploy smoke test"
 * a upozorni PM.
 */
export const postDeploySmokeTest = defineWorkflow({
  key: "post-deploy-smoke-test",
  title: "Po nasazení → smoke test ticket",
  trigger: { type: "event", event: "project.phase_changed" },
  conditions: [{ field: "project.currentPhaseKey", op: "eq", value: "deploy" }],
  actions: [
    { type: "create-task", params: { type: "support", title: "Post-deploy smoke test", assigneeRole: "dev", priority: "p2" } },
    { type: "notify", params: { category: "task_assigned", to: "project.owner" } },
  ],
  enabledByDefault: false,
});
