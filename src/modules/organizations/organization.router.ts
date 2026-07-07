import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "@/api/trpc";
import { organizationCreateSchema, organizationUpdateSchema } from "./organization.validation";
import { organizationService } from "./organization.service";

const idInput = z.object({ id: z.string().uuid() });
const listInput = z.object({
  lifecycleStage: z.enum(["prospect", "active_client", "past_client", "partner"]).optional(),
  ownerId: z.string().uuid().optional(),
  healthStatus: z.string().optional(),
}).optional();

/** tRPC router organizací. requirePermission("organizations", …). Klientská karta = get + sub-taby (projekty/kontakty…). */
export const organizationsRouter = router({
  list: protectedProcedure.use(requirePermission("organizations", "read"))
    .input(listInput).query(({ ctx, input }) => organizationService.list(ctx, input ?? {})),

  get: protectedProcedure.use(requirePermission("organizations", "read"))
    .input(idInput).query(({ ctx, input }) => organizationService.get(ctx, input.id)),

  create: protectedProcedure.use(requirePermission("organizations", "write"))
    .input(organizationCreateSchema).mutation(({ ctx, input }) => organizationService.create(ctx, input)),

  update: protectedProcedure.use(requirePermission("organizations", "write"))
    .input(idInput.merge(organizationUpdateSchema))
    .mutation(({ ctx, input }) => { const { id, ...rest } = input; return organizationService.update(ctx, id, rest); }),

  archive: protectedProcedure.use(requirePermission("organizations", "manage"))
    .input(idInput).mutation(({ ctx, input }) => organizationService.archive(ctx, input.id)),
});
