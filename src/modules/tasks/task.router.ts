import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "@/api/trpc";
import { taskCreateSchema, taskStatusChangeSchema } from "./task.validation";
import { taskService } from "./task.service";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { and, eq } from "drizzle-orm";
import { tasks } from "./task.entity";
import { audit } from "@/shared/audit/audit.service";

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

  // editace polí úkolu (stav se mění přes changeStatus)
  update: protectedProcedure.use(requirePermission("tasks", "write"))
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().trim().min(1).max(200).optional(),
      description: z.string().max(5000).nullable().optional(),
      priority: z.enum(["p1", "p2", "p3", "p4"]).optional(),
      dueAt: z.string().datetime({ offset: true }).nullable().optional(),
      assigneeId: z.string().uuid().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const ws = currentWorkspaceId();
      const { id, dueAt, ...rest } = input;
      await db().update(tasks).set({
        ...rest,
        ...(dueAt !== undefined ? { dueAt: dueAt ? new Date(dueAt) : null } : {}),
        updatedAt: new Date(),
      }).where(and(eq(tasks.id, id), eq(tasks.workspaceId, ws)));
    }),

  remove: protectedProcedure.use(requirePermission("tasks", "write"))
    .input(idInput)
    .mutation(async ({ ctx, input }) => {
      const ws = currentWorkspaceId();
      await db().update(tasks).set({ deletedAt: new Date() }).where(and(eq(tasks.id, input.id), eq(tasks.workspaceId, ws)));
      await audit.audited(ctx, "record_deleted", { type: "task", id: input.id });
    }),

  changeStatus: protectedProcedure.use(requirePermission("tasks", "write"))
    .input(taskStatusChangeSchema).mutation(({ ctx, input }) => taskService.changeStatus(ctx, input)),

  respond: protectedProcedure.use(requirePermission("tasks", "write"))
    .input(idInput).mutation(({ ctx, input }) => taskService.recordFirstResponse(ctx, input.id)),
});
