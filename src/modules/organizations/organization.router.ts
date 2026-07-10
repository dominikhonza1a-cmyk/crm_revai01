import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "@/api/trpc";
import { organizationCreateSchema, organizationUpdateSchema } from "./organization.validation";
import { organizationService } from "./organization.service";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { sql } from "drizzle-orm";
import { audit } from "@/shared/audit/audit.service";

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

  /** Soft delete klienta VČETNĚ jeho kontaktů, dealů, projektů a úkolů (vratné v DB). */
  remove: protectedProcedure.use(requirePermission("organizations", "manage"))
    .input(idInput)
    .mutation(async ({ ctx, input }) => {
      const ws = currentWorkspaceId();
      const now = new Date().toISOString();
      await db().execute(sql`UPDATE task SET deleted_at = ${now} WHERE workspace_id = ${ws} AND organization_id = ${input.id} AND deleted_at IS NULL`);
      await db().execute(sql`UPDATE task SET deleted_at = ${now} WHERE workspace_id = ${ws} AND deleted_at IS NULL AND project_id IN (SELECT id FROM project WHERE organization_id = ${input.id})`);
      await db().execute(sql`UPDATE project SET deleted_at = ${now} WHERE workspace_id = ${ws} AND organization_id = ${input.id} AND deleted_at IS NULL`);
      await db().execute(sql`UPDATE deal SET deleted_at = ${now} WHERE workspace_id = ${ws} AND organization_id = ${input.id} AND deleted_at IS NULL`);
      await db().execute(sql`UPDATE contact SET deleted_at = ${now} WHERE workspace_id = ${ws} AND organization_id = ${input.id} AND deleted_at IS NULL`);
      await db().execute(sql`UPDATE organization SET deleted_at = ${now} WHERE workspace_id = ${ws} AND id = ${input.id}`);
      await audit.audited(ctx, "record_deleted", { type: "organization", id: input.id });
    }),

  archive: protectedProcedure.use(requirePermission("organizations", "manage"))
    .input(idInput).mutation(({ ctx, input }) => organizationService.archive(ctx, input.id)),
});
