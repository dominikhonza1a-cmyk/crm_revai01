import { randomUUID } from "node:crypto";
import { z } from "zod";
import { and, eq, isNull, desc, sql } from "drizzle-orm";
import { router, protectedProcedure } from "@/api/trpc";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { NotFound } from "@/domain/errors";
import { supabaseServer } from "@/shared/supabase";
import { ideas } from "./idea.entity";

// Obrázky v nápadech → veřejný bucket (stabilní URL bez expirace, aby šly vložit inline do markdownu).
const IMG_BUCKET = "idea-images";
async function ensureImageBucket() {
  const sb = supabaseServer();
  const { data } = await sb.storage.getBucket(IMG_BUCKET);
  if (!data) await sb.storage.createBucket(IMG_BUCKET, { public: true, fileSizeLimit: "10MB", allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"] });
}

/**
 * Nápady: sdílený blok poznámek mimo klienty (nápady, odkazy, plány).
 * Detail se ukládá autosave (updateContent) — bez tlačítka Uložit.
 */
export const ideasRouter = router({
  /** Kořenové nápady (podstránky se zobrazují v detailu rodiče). */
  list: protectedProcedure.query(async () => {
    const ws = currentWorkspaceId();
    return db().select({
      id: ideas.id, title: ideas.title,
      snippet: sql<string>`left(${ideas.content}, 180)`,
      updatedAt: ideas.updatedAt,
      childCount: sql<number>`(select count(*)::int from idea c where c.parent_id = ${ideas.id} and c.deleted_at is null)`,
    }).from(ideas)
      .where(and(eq(ideas.workspaceId, ws), isNull(ideas.deletedAt), isNull(ideas.parentId)))
      .orderBy(desc(ideas.updatedAt));
  }),

  /** Podstránky nápadu (jako v Notionu). */
  children: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
    const ws = currentWorkspaceId();
    return db().select({ id: ideas.id, title: ideas.title, snippet: sql<string>`left(${ideas.content}, 120)`, updatedAt: ideas.updatedAt })
      .from(ideas)
      .where(and(eq(ideas.workspaceId, ws), eq(ideas.parentId, input.id), isNull(ideas.deletedAt)))
      .orderBy(desc(ideas.updatedAt));
  }),

  get: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
    const ws = currentWorkspaceId();
    const row = (await db().select().from(ideas)
      .where(and(eq(ideas.id, input.id), eq(ideas.workspaceId, ws), isNull(ideas.deletedAt))).limit(1))[0];
    if (!row) throw new NotFound("Nápad nenalezen");
    return row;
  }),

  create: protectedProcedure
    .input(z.object({ title: z.string().trim().max(200).optional(), parentId: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      const ws = currentWorkspaceId();
      const id = randomUUID();
      await db().insert(ideas).values({ id, workspaceId: ws, title: input.title?.trim() || (input.parentId ? "Nová podstránka" : "Nový nápad"), parentId: input.parentId ?? null, createdBy: ctx.userId });
      return { id };
    }),

  /** Autosave titulku i obsahu (debounced z UI). */
  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(200).optional(), content: z.string().max(500_000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const ws = currentWorkspaceId();
      await db().update(ideas).set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
        updatedAt: new Date(), updatedBy: ctx.userId,
      }).where(and(eq(ideas.id, input.id), eq(ideas.workspaceId, ws)));
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const ws = currentWorkspaceId();
      await db().update(ideas).set({ deletedAt: new Date() })
        .where(and(eq(ideas.id, input.id), eq(ideas.workspaceId, ws)));
    }),

  /** Podepsaná URL pro nahrání obrázku (vložení do textu nápadu). Vrací i veřejnou URL pro markdown. */
  imageUploadUrl: protectedProcedure
    .input(z.object({ filename: z.string().min(1).max(200) }))
    .mutation(async ({ input }) => {
      await ensureImageBucket();
      const ws = currentWorkspaceId();
      const clean = input.filename.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "obrazek.png";
      const path = `${ws}/${randomUUID()}-${clean}`;
      const sb = supabaseServer();
      const { data, error } = await sb.storage.from(IMG_BUCKET).createSignedUploadUrl(path);
      if (error || !data) throw new Error(`Nahrání obrázku se nepodařilo připravit: ${error?.message ?? "neznámá chyba"}`);
      const { data: pub } = sb.storage.from(IMG_BUCKET).getPublicUrl(path);
      return { path: data.path, token: data.token, bucket: IMG_BUCKET, publicUrl: pub.publicUrl };
    }),
});
