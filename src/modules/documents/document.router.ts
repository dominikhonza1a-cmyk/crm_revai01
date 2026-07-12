import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "@/api/trpc";
import { documentCreateSchema } from "./document.validation";
import { documentService } from "./document.service";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { and, eq } from "drizzle-orm";
import { documents } from "./document.entity";
import { audit } from "@/shared/audit/audit.service";
import { supabaseServer } from "@/shared/supabase";
import { randomUUID } from "node:crypto";

const entityInput = z.object({ entityType: z.enum(["organization", "contact", "deal", "project", "task", "idea"]), entityId: z.string().uuid() });
const idInput = z.object({ id: z.string().uuid() });
const BUCKET = "documents";

async function ensureBucket() {
  const sb = supabaseServer();
  const { data } = await sb.storage.getBucket(BUCKET);
  if (!data) await sb.storage.createBucket(BUCKET, { public: false, fileSizeLimit: "25MB" });
}

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

  /** Podepsaná URL pro nahrání souboru přímo z prohlížeče do Supabase Storage (bucket documents). */
  uploadUrl: protectedProcedure.use(requirePermission("documents", "write"))
    .input(z.object({ filename: z.string().min(1).max(200) }))
    .mutation(async ({ input }) => {
      await ensureBucket();
      const ws = currentWorkspaceId();
      const clean = input.filename.replace(/[^\w.\-]+/g, "_").slice(0, 120);
      const path = `${ws}/${randomUUID()}-${clean}`;
      const { data, error } = await supabaseServer().storage.from(BUCKET).createSignedUploadUrl(path);
      if (error || !data) throw new Error(`Nahrání se nepodařilo připravit: ${error?.message ?? "neznámá chyba"}`);
      return { path: data.path, token: data.token, bucket: BUCKET };
    }),

  /** Podepsaná URL ke stažení nahraného souboru (platí 1 h). */
  downloadUrl: protectedProcedure.use(requirePermission("documents", "read"))
    .input(idInput).mutation(async ({ input }) => {
      const ws = currentWorkspaceId();
      const doc = (await db().select({ storageKey: documents.storageKey }).from(documents)
        .where(and(eq(documents.id, input.id), eq(documents.workspaceId, ws))).limit(1))[0];
      if (!doc?.storageKey) throw new Error("Soubor nenalezen.");
      const { data, error } = await supabaseServer().storage.from(BUCKET).createSignedUrl(doc.storageKey, 3600);
      if (error || !data) throw new Error("Odkaz ke stažení se nepodařilo vytvořit.");
      return { url: data.signedUrl };
    }),

  archive: protectedProcedure.use(requirePermission("documents", "manage"))
    .input(idInput).mutation(({ ctx, input }) => documentService.archive(ctx, input.id)),
});
