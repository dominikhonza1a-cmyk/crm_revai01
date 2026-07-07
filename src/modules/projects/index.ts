/**
 * Modul PROJECTS — dodávka (sub-karty klienta), typ one-off/retainer, delivery lifecycle.
 * Soubory: project.types · project.validation · project.entity (+ ProjectPhase) · project-template.entity ·
 *          project.repository · project-template.repository · project.service (createFromTemplate=W2, advancePhase,
 *          changeStatus) · project.workflow (deal.won → W2) · project.router.
 */
export * from "./project.types";
export { projectService } from "./project.service";
export { projectRepository } from "./project.repository";
export { projectsRouter } from "./project.router";
export { registerProjectWorkflows } from "./project.workflow";
