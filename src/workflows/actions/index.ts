import type { Action } from "../dsl";

/**
 * Katalog akcí, které workflow engine umí spustit. Každá akce je idempotentní.
 * Akce delegují na service vrstvu modulů (ne přímé SQL).
 */
export type ActionHandler = (params: Record<string, unknown>, ctx: unknown) => Promise<void>;

export const actionHandlers: Record<Action["type"], ActionHandler> = {
  "create-project-from-template": async () => { throw new Error("action create-project-from-template: fáze 2 → projects.service.createFromTemplate"); },
  "provision-tasks": async () => { throw new Error("action provision-tasks: fáze 2 → projects.service.provisionTasks"); },
  "create-task": async () => { throw new Error("action create-task: fáze 2 → tasks.service.create"); },
  "notify": async () => { throw new Error("action notify: fáze 2 → notifications.notify"); },
  "escalate": async () => { throw new Error("action escalate: fáze 2 → sla escalation"); },
  "create-reminder": async () => { throw new Error("action create-reminder: fáze 2"); },
  "write-timeline": async () => { throw new Error("action write-timeline: fáze 1 → activities.service.writeTimeline"); },
  "call-webhook": async () => { throw new Error("action call-webhook: fáze 3"); },
  "send-email": async () => { throw new Error("action send-email: fáze 1 → email adapter"); },
};
