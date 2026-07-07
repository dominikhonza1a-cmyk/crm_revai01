import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "@/api/trpc";
import { taskCreateSchema, taskStatusChangeSchema } from "./task.validation";
import { taskService } from "./task.service";

const idInput = z.object({ id: z.string().uuid() });
const listInput = z.object({
  type: z.enum(["delivery", "support", "sales_followup", "internal"]).optional(),
  status: z.enum(["todo", "in_progress", "waiting_on_client", "blocked", "done", "canceled"]).optional(),
  projectId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  view: z.enum(["my_work", "ticket_queue", "all"]).optional(),
}).optional();

/** tRPC router tasků. Pohledy: my_work, ticket_queue (dle SLA due), all. Ticket = type=support s SLA trackery. */
export const tasksRouter = router({
  list: protectedProcedure.use(requirePermission("tasks", "read"))
    .input(listInput).query(({ ctx, input }) => taskService.list(ctx, input ?? {})),

  get: protectedProcedure.use(requirePermission("tasks", "read"))
    .input(idInput).query(({ ctx, input }) => taskService.get(ctx, input.id)),

  create: protectedProcedure.use(requirePermission("tasks", "write"))
    .input(taskCreateSchema).mutation(({ ctx, input }) => taskService.create(ctx, input)),

  changeStatus: protectedProcedure.use(requirePermission("tasks", "write"))
    .input(taskStatusChangeSchema).mutation(({ ctx, input }) => taskService.changeStatus(ctx, input)),

  respond: protectedProcedure.use(requirePermission("tasks", "write"))
    .input(idInput).mutation(({ ctx, input }) => taskService.recordFirstResponse(ctx, input.id)),
});
