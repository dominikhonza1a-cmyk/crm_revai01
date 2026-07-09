import { randomUUID } from "node:crypto";
import { z } from "zod";
import { and, eq, isNull, asc, sql } from "drizzle-orm";
import { router, protectedProcedure, requirePermission } from "@/api/trpc";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { ValidationFailed } from "@/domain/errors";
import { organizations } from "@/modules/organizations/organization.entity";
import { deals } from "@/modules/deals/deal.entity";
import { projects } from "@/modules/projects/project.entity";
import { customFieldDefinitions } from "./custom-field.entity";

const entityEnum = z.enum(["organization", "deal", "project"]);
const typeEnum = z.enum(["text", "number", "date", "select", "url"]);

/** Hostitelské tabulky s custom_fields JSONB (hodnoty žijí tam, definice tady). */
const HOSTS = { organization: organizations, deal: deals, project: projects } as const;

const slugify = (label: string) =>
  label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "pole";

/**
 * Custom fields: definice per entita (Nastavení, admin) + zápis hodnot do custom_fields
 * JSONB na klientovi/dealu/projektu. Validace hodnoty dle field_type.
 */
export const customFieldsRouter = router({
  definitions: protectedProcedure
    .input(z.object({ entityType: entityEnum }))
    .query(async ({ input }) => {
      const ws = currentWorkspaceId();
      return db().select({
        id: customFieldDefinitions.id, key: customFieldDefinitions.key, label: customFieldDefinitions.label,
        fieldType: customFieldDefinitions.fieldType, options: customFieldDefinitions.options, position: customFieldDefinitions.position,
      }).from(customFieldDefinitions)
        .where(and(eq(customFieldDefinitions.workspaceId, ws), eq(customFieldDefinitions.entityType, input.entityType), isNull(customFieldDefinitions.archivedAt)))
        .orderBy(asc(customFieldDefinitions.position), asc(customFieldDefinitions.label));
    }),

  allDefinitions: protectedProcedure.use(requirePermission("settings", "manage")).query(async () => {
    const ws = currentWorkspaceId();
    return db().select().from(customFieldDefinitions)
      .where(and(eq(customFieldDefinitions.workspaceId, ws), isNull(customFieldDefinitions.archivedAt)))
      .orderBy(asc(customFieldDefinitions.entityType), asc(customFieldDefinitions.position));
  }),

  createDefinition: protectedProcedure.use(requirePermission("settings", "manage"))
    .input(z.object({
      entityType: entityEnum,
      label: z.string().trim().min(1).max(60),
      fieldType: typeEnum,
      options: z.array(z.string().trim().min(1)).max(30).optional(),   // jen pro select
    }))
    .mutation(async ({ ctx, input }) => {
      const ws = currentWorkspaceId();
      if (input.fieldType === "select" && !input.options?.length) throw new ValidationFailed("Select potřebuje alespoň jednu možnost.");
      const key = slugify(input.label);
      const dup = (await db().select({ id: customFieldDefinitions.id }).from(customFieldDefinitions)
        .where(and(eq(customFieldDefinitions.workspaceId, ws), eq(customFieldDefinitions.entityType, input.entityType), eq(customFieldDefinitions.key, key))).limit(1))[0];
      if (dup) throw new ValidationFailed(`Pole s klíčem „${key}" už pro tuto entitu existuje.`);
      const count = await db().select({ id: customFieldDefinitions.id }).from(customFieldDefinitions)
        .where(and(eq(customFieldDefinitions.workspaceId, ws), eq(customFieldDefinitions.entityType, input.entityType)));
      const id = randomUUID();
      await db().insert(customFieldDefinitions).values({
        id, workspaceId: ws, entityType: input.entityType, key, label: input.label,
        fieldType: input.fieldType, options: input.options ?? null, position: count.length, createdBy: ctx.userId,
      });
      return { id, key };
    }),

  archiveDefinition: protectedProcedure.use(requirePermission("settings", "manage"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const ws = currentWorkspaceId();
      await db().update(customFieldDefinitions).set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(customFieldDefinitions.id, input.id), eq(customFieldDefinitions.workspaceId, ws)));
    }),

  /** Zápis hodnoty do custom_fields JSONB hostitele. null/prázdno = smazat klíč. */
  setValue: protectedProcedure
    .input(z.object({
      entityType: entityEnum, entityId: z.string().uuid(),
      key: z.string().min(1).max(40),
      value: z.union([z.string(), z.number(), z.null()]),
    }))
    .mutation(async ({ input }) => {
      const ws = currentWorkspaceId();
      const def = (await db().select().from(customFieldDefinitions)
        .where(and(eq(customFieldDefinitions.workspaceId, ws), eq(customFieldDefinitions.entityType, input.entityType), eq(customFieldDefinitions.key, input.key), isNull(customFieldDefinitions.archivedAt))).limit(1))[0];
      if (!def) throw new ValidationFailed("Neznámé custom pole.");

      let value = input.value;
      if (value !== null && value !== "") {
        if (def.fieldType === "number" && Number.isNaN(Number(value))) throw new ValidationFailed("Hodnota musí být číslo.");
        if (def.fieldType === "number") value = Number(value);
        if (def.fieldType === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw new ValidationFailed("Datum ve formátu RRRR-MM-DD.");
        if (def.fieldType === "select" && !((def.options as string[]) ?? []).includes(String(value))) throw new ValidationFailed("Hodnota není mezi možnostmi.");
        if (def.fieldType === "url" && !/^https?:\/\//.test(String(value))) value = `https://${value}`;
      }

      const host = HOSTS[input.entityType];
      const patch = value === null || value === ""
        ? sql`custom_fields - ${input.key}`
        : sql`custom_fields || ${JSON.stringify({ [input.key]: value })}::jsonb`;
      await db().update(host)
        .set({ customFields: patch as never, updatedAt: new Date() } as never)
        .where(and(eq(host.id, input.entityId), eq(host.workspaceId, ws)));
    }),
});
