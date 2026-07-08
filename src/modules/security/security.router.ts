import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "@/api/trpc";
import { apiKeyService } from "./api-key.service";

/** tRPC router security — správa API klíčů pro REST fasádu (jen admin / settings:manage). */
export const securityRouter = router({
  listApiKeys: protectedProcedure.use(requirePermission("settings", "manage"))
    .query(() => apiKeyService.list()),

  createApiKey: protectedProcedure.use(requirePermission("settings", "manage"))
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(({ ctx, input }) => apiKeyService.create(ctx, input.name)),

  revokeApiKey: protectedProcedure.use(requirePermission("settings", "manage"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => apiKeyService.revoke(ctx, input.id)),
});
