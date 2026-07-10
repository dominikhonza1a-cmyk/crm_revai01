import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "@/api/trpc";
import { dealCreateSchema, dealUpdateSchema, dealMoveStageSchema } from "./deal.validation";
import { dealService } from "./deal.service";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { and, eq } from "drizzle-orm";
import { deals } from "./deal.entity";
import { audit } from "@/shared/audit/audit.service";
import { dealRepository } from "./deal.repository";

const idInput = z.object({ id: z.string().uuid() });
const listInput = z.object({
  stageId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
}).optional();

/** tRPC router dealů. moveStage hlídá deal-stage.policy a emituje deal.won (spustí W2 ve fázi 2). */
export const dealsRouter = router({
  stages: protectedProcedure.use(requirePermission("deals", "read")).query(() => dealRepository.listStages()),

  list: protectedProcedure.use(requirePermission("deals", "read"))
    .input(listInput).query(({ ctx, input }) => dealService.list(ctx, input ?? {})),

  get: protectedProcedure.use(requirePermission("deals", "read"))
    .input(idInput).query(({ ctx, input }) => dealService.get(ctx, input.id)),

  create: protectedProcedure.use(requirePermission("deals", "write"))
    .input(dealCreateSchema).mutation(({ ctx, input }) => dealService.create(ctx, input)),

  update: protectedProcedure.use(requirePermission("deals", "write"))
    .input(idInput.merge(dealUpdateSchema))
    .mutation(({ ctx, input }) => { const { id, ...rest } = input; return dealService.update(ctx, id, rest); }),

  remove: protectedProcedure.use(requirePermission("deals", "write"))
    .input(idInput)
    .mutation(async ({ ctx, input }) => {
      const ws = currentWorkspaceId();
      await db().update(deals).set({ deletedAt: new Date() }).where(and(eq(deals.id, input.id), eq(deals.workspaceId, ws)));
      await audit.audited(ctx, "record_deleted", { type: "deal", id: input.id });
    }),

  moveStage: protectedProcedure.use(requirePermission("deals", "write"))
    .input(dealMoveStageSchema)
    .mutation(({ ctx, input }) => dealService.moveStage(ctx, input, ctx.permissions.roleKeys.includes("admin"))),

  archive: protectedProcedure.use(requirePermission("deals", "manage"))
    .input(idInput).mutation(({ ctx, input }) => dealService.archive(ctx, input.id)),
});
