import { registerProjectWorkflows } from "@/modules/projects/project.workflow";

/**
 * Zaregistruje event subscribery (workflow) jednou při startu procesu (web i worker).
 * Volá se side-effectem z api/root.ts a z worker.ts.
 */
let done = false;
export function bootstrap(): void {
  if (done) return;
  done = true;
  registerProjectWorkflows();       // W2: deal.won → projekt draft
  // další moduly (activities projekce, tasks) se přidají zde
}
