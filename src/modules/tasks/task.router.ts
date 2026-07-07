/**
 * tRPC router modulu tasks. Procedury tasks.<action>. Guard requirePermission("tasks", …).
 * Pohledy: my_work, ticket_queue (řazeno dle SLA due), all. Support tickety = filtr type=support.
 */
// export const tasksRouter = router({
//   list:         protectedProcedure.use(requirePermission("tasks","read")).input(taskListSchema).query(...),
//   create:       auditedProcedure.use(requirePermission("tasks","write")).input(taskCreateSchema).mutation(...),
//   update:       auditedProcedure.use(requirePermission("tasks","write")).input(taskUpdateSchema).mutation(...),
//   changeStatus: auditedProcedure.use(requirePermission("tasks","write")).input(taskStatusChangeSchema)
//                   .mutation(({ctx,input}) => taskService.changeStatus(ctx,input)),
// });

export const TASKS_ROUTER_NOTE = "tasks.{list,create,update,changeStatus}; ticket = type=support s SLA.";
