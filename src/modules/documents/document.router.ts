import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "@/api/trpc";
import { documentCreateSchema } from "./document.validation";
import { documentService } from "./document.service";

const entityInput = z.object({ entityType: z.enum(["organization", "contact", "deal", "project", "task"]), entityId: z.string().uuid() });
const idInput = z.object({ id: z.string().uuid() });

/** tRPC router dokumentů. Primárně reference na externí úložiště; secret_ref bez externalUrl (CHECK). */
export const documentsRouter = router({
  list: protectedProcedure.use(requirePermission("documents", "read"))
    .input(entityInput).query(({ ctx, input }) => documentService.list(ctx, input.entityType, input.entityId)),

  versions: protectedProcedure.use(requirePermission("documents", "read"))
    .input(idInput).query(({ ctx, input }) => documentService.versions(ctx, input.id)),

  link: protectedProcedure.use(requirePermission("documents", "write"))
    .input(documentCreateSchema).mutation(({ ctx, input }) => documentService.link(ctx, input)),

  archive: protectedProcedure.use(requirePermission("documents", "manage"))
    .input(idInput).mutation(({ ctx, input }) => documentService.archive(ctx, input.id)),
});
