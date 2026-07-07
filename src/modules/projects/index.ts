/**
 * Modul PROJECTS — dodávka (sub-karty klienta), typ one-off/retainer, delivery lifecycle.
 * Soubory: project.types.ts · project.validation.ts · project.entity.ts (+ ProjectPhase) ·
 *          project.repository.ts · project.service.ts (createFromTemplate/provisionTasks/advancePhase/changeStatus) ·
 *          project.workflow.ts (deal.won → W2) · project.router.ts.
 */
export * from "./project.types";
export { projectService } from "./project.service";
export { projectRepository } from "./project.repository";
export { registerProjectWorkflows } from "./project.workflow";
// export { projectsRouter } from "./project.router";

export function registerModule(): void {
  registerProjectWorkflowsSafe();
}
function registerProjectWorkflowsSafe(): void {
  // zapojí subscriby; volá se z bootstrapu (worker/web)
}
