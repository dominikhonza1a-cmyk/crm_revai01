import { randomUUID } from "node:crypto";
import { z } from "zod";
import { and, eq, isNull, inArray } from "drizzle-orm";
import { router, protectedProcedure, requirePermission } from "@/api/trpc";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { tags, taggings } from "./tag.entity";

const entityEnum = z.enum(["organization", "contact", "deal", "project", "task", "document"]);

/** Barvy nových tagů rotují z palety doodle stylu (mint/zlatá/fialová/šalvěj/nebeská/růžová). */
const PALETTE = ["#34d399", "#ffc93c", "#7b5ea7", "#9cb380", "#38bdf8", "#f472b6"];

/**
 * Tagy: polymorfní štítky (klient/deal/projekt/…). list = všechny tagy workspace,
 * forEntity = tagy entity, assign/unassign, create (barva se přidělí automaticky).
 */
export const tagsRouter = router({
  list: protectedProcedure.query(async () => {
    const ws = currentWorkspaceId();
    return db().select({ id: tags.id, name: tags.name, color: tags.color })
      .from(tags).where(and(eq(tags.workspaceId, ws), isNull(tags.deletedAt))).orderBy(tags.name);
  }),

  forEntity: protectedProcedure
    .input(z.object({ entityType: entityEnum, entityId: z.string().uuid() }))
    .query(async ({ input }) => {
      const ws = currentWorkspaceId();
      return db().select({ id: tags.id, name: tags.name, color: tags.color, taggingId: taggings.id })
        .from(taggings).innerJoin(tags, eq(taggings.tagId, tags.id))
        .where(and(eq(taggings.workspaceId, ws), eq(taggings.entityType, input.entityType), eq(taggings.entityId, input.entityId), isNull(tags.deletedAt)))
        .orderBy(tags.name);
    }),

  create: protectedProcedure.use(requirePermission("settings", "write"))
    .input(z.object({ name: z.string().trim().min(1).max(40) }))
    .mutation(async ({ input }) => {
      const ws = currentWorkspaceId();
      const existing = (await db().select({ id: tags.id }).from(tags)
        .where(and(eq(tags.workspaceId, ws), eq(tags.name, input.name), isNull(tags.deletedAt))).limit(1))[0];
      if (existing) return { id: existing.id };
      const count = (await db().select({ id: tags.id }).from(tags).where(eq(tags.workspaceId, ws))).length;
      const id = randomUUID();
      await db().insert(tags).values({ id, workspaceId: ws, name: input.name, color: PALETTE[count % PALETTE.length] });
      return { id };
    }),

  assign: protectedProcedure
    .input(z.object({ tagId: z.string().uuid(), entityType: entityEnum, entityId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const ws = currentWorkspaceId();
      await db().insert(taggings)
        .values({ id: randomUUID(), workspaceId: ws, tagId: input.tagId, entityType: input.entityType, entityId: input.entityId })
        .onConflictDoNothing();
    }),

  unassign: protectedProcedure
    .input(z.object({ tagId: z.string().uuid(), entityType: entityEnum, entityId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const ws = currentWorkspaceId();
      const rows = await db().select({ id: taggings.id }).from(taggings)
        .where(and(eq(taggings.workspaceId, ws), eq(taggings.tagId, input.tagId), eq(taggings.entityType, input.entityType), eq(taggings.entityId, input.entityId)));
      if (rows.length) await db().delete(taggings).where(inArray(taggings.id, rows.map((r) => r.id)));
    }),
});
