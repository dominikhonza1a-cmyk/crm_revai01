import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "@/api/trpc";
import { advancePhaseSchema, changeStatusSchema } from "./project.validation";
import { projectService } from "./project.service";

const idInput = z.object({ id: z.string().uuid() });
const listInput = z.object({
  organizationId: z.string().uuid().optional(),
  status: z.enum(["draft", "active", "on_hold", "closed"]).optional(),
  engagementType: z.enum(["one_off", "retainer"]).optional(),
  ownerId: z.string().uuid().optional(),
}).optional();

/** tRPC router projektů (sub-karty klienta). Vznikají přes Won→projekt (W2); zde jejich čtení a lifecycle. */
export const projectsRouter = router({
  list: protectedProcedure.use(requirePermission("projects", "read"))
    .input(listInput).query(({ ctx, input }) => projectService.list(ctx, input ?? {})),

  get: protectedProcedure.use(requirePermission("projects", "read"))
    .input(idInput).query(({ ctx, input }) => projectService.get(ctx, input.id)),

  phases: protectedProcedure.use(requirePermission("projects", "read"))
    .input(idInput).query(({ ctx, input }) => projectService.phases(ctx, input.id)),

  advancePhase: protectedProcedure.use(requirePermission("projects", "write"))
    .input(advancePhaseSchema).mutation(({ ctx, input }) => projectService.advancePhase(ctx, input)),

  // draft → active potvrzuje PM ("Confirm draft"), i on_hold/closed
  changeStatus: protectedProcedure.use(requirePermission("projects", "manage"))
    .input(changeStatusSchema).mutation(({ ctx, input }) => projectService.changeStatus(ctx, input)),
});
