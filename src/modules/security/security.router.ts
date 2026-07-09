import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "@/api/trpc";
import { apiKeyService } from "./api-key.service";
import { securityService } from "./security.service";

const roleEnum = z.enum(["admin", "sales", "pm", "dev", "support"]);

/** tRPC router security — správa uživatelů a API klíčů (jen admin / settings:manage). */
export const securityRouter = router({
  listUsers: protectedProcedure.use(requirePermission("settings", "manage"))
    .query(({ ctx }) => securityService.listUsers(ctx)),

  inviteUser: protectedProcedure.use(requirePermission("settings", "manage"))
    .input(z.object({ email: z.string().email(), fullName: z.string().min(1).max(120), roleKey: roleEnum }))
    .mutation(({ ctx, input }) => securityService.inviteUser(ctx, input)),

  setRole: protectedProcedure.use(requirePermission("settings", "manage"))
    .input(z.object({ userId: z.string().uuid(), roleKey: roleEnum }))
    .mutation(({ ctx, input }) => securityService.setRole(ctx, input.userId, input.roleKey)),

  deactivateUser: protectedProcedure.use(requirePermission("settings", "manage"))
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(({ ctx, input }) => securityService.deactivateUser(ctx, input.userId)),

  listApiKeys: protectedProcedure.use(requirePermission("settings", "manage"))
    .query(() => apiKeyService.list()),

  createApiKey: protectedProcedure.use(requirePermission("settings", "manage"))
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(({ ctx, input }) => apiKeyService.create(ctx, input.name)),

  revokeApiKey: protectedProcedure.use(requirePermission("settings", "manage"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => apiKeyService.revoke(ctx, input.id)),
});
