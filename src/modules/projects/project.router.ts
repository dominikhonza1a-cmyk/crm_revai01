/**
 * tRPC router modulu projects. Procedury projects.<action>. Guard requirePermission("projects", …).
 * (pm=manage, dev=write, sales=read, support=read — viz docs/security/roles-permissions.md).
 */
// export const projectsRouter = router({
//   list, get,
//   create:       auditedProcedure.use(requirePermission("projects","manage")).input(projectCreateSchema).mutation(...),
//   update:       auditedProcedure.use(requirePermission("projects","write")).input(projectUpdateSchema).mutation(...),
//   advancePhase: auditedProcedure.use(requirePermission("projects","write")).input(advancePhaseSchema)
//                   .mutation(({ctx,input}) => projectService.advancePhase(ctx,input)),
//   changeStatus: auditedProcedure.use(requirePermission("projects","manage")).input(changeStatusSchema)
//                   .mutation(({ctx,input}) => projectService.changeStatus(ctx,input)),  // draft→active potvrzení
//   confirmDraft: alias changeStatus(active),
// });

export const PROJECTS_ROUTER_NOTE = "projects.{list,get,create,update,advancePhase,changeStatus}; sub-karty pod klientem.";
