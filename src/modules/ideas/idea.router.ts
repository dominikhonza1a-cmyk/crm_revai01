import { randomUUID } from "node:crypto";
import { z } from "zod";
import { and, eq, isNull, desc, sql } from "drizzle-orm";
import { router, protectedProcedure } from "@/api/trpc";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { NotFound } from "@/domain/errors";
import { ideas } from "./idea.entity";

/**
 * Nápady: sdílený blok poznámek mimo klienty (nápady, odkazy, plány).
 * Detail se ukládá autosave (updateContent) — bez tlačítka Uložit.
 */
export const ideasRouter = router({
  list: protectedProcedure.query(async () => {
    const ws = currentWorkspaceId();
    return db().select({
      id: ideas.id, title: ideas.title,
      snippet: sql<string>`left(${ideas.content}, 180)`,
      updatedAt: ideas.updatedAt,
    }).from(ideas)
      .where(and(eq(ideas.workspaceId, ws), isNull(ideas.deletedAt)))
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
    .input(z.object({ title: z.string().trim().max(200).optional() }))
    .mutation(async ({ ctx, input }) => {
      const ws = currentWorkspaceId();
      const id = randomUUID();
      await db().insert(ideas).values({ id, workspaceId: ws, title: input.title?.trim() || "Nový nápad", createdBy: ctx.userId });
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
});
