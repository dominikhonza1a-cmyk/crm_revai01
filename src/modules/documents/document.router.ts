import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "@/api/trpc";
import { documentCreateSchema } from "./document.validation";
import { documentService } from "./document.service";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { and, eq } from "drizzle-orm";
import { documents } from "./document.entity";
import { audit } from "@/shared/audit/audit.service";

const entityInput = z.object({ entityType: z.enum(["organization", "contact", "deal", "project", "task", "idea"]), entityId: z.string().uuid() });
const idInput = z.object({ id: z.string().uuid() });

/** tRPC router dokumentů. Primárně reference na externí úložiště; secret_ref bez externalUrl (CHECK). */
export const documentsRouter = router({
  remove: protectedProcedure.use(requirePermission("documents", "write"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const ws = currentWorkspaceId();
      await db().update(documents).set({ deletedAt: new Date() }).where(and(eq(documents.id, input.id), eq(documents.workspaceId, ws)));
      await audit.audited(ctx, "record_deleted", { type: "document", id: input.id });
    }),

  list: protectedProcedure.use(requirePermission("documents", "read"))
    .input(entityInput).query(({ ctx, input }) => documentService.list(ctx, input.entityType, input.entityId)),

  versions: protectedProcedure.use(requirePermission("documents", "read"))
    .input(idInput).query(({ ctx, input }) => documentService.versions(ctx, input.id)),

  link: protectedProcedure.use(requirePermission("documents", "write"))
    .input(documentCreateSchema).mutation(({ ctx, input }) => documentService.link(ctx, input)),

  archive: protectedProcedure.use(requirePermission("documents", "manage"))
    .input(idInput).mutation(({ ctx, input }) => documentService.archive(ctx, input.id)),
});
