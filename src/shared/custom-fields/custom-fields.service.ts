import { z } from "zod";
import type { TaggableEntity } from "@/domain/enums";
import { ValidationFailed } from "@/domain/errors";

/**
 * Custom fields: definice v tabulce, hodnoty v JSONB na hostiteli (NE EAV). Viz docs/data-model/custom-fields.md.
 * Tento service sestaví za běhu zod schéma z definic a zvaliduje `custom_fields` payload.
 * Používá se JAK pro API, TAK pro CSV import (jeden zdroj pravdy).
 */
export interface CustomFieldDefinition {
  entityType: TaggableEntity;
  key: string;                 // immutable slug
  label: string;
  fieldType: "text" | "number" | "date" | "boolean" | "select" | "multiselect" | "url" | "currency";
  options: string[] | null;
  required: boolean;
  isPii: boolean;
  archivedAt: string | null;
}

export function buildSchema(defs: CustomFieldDefinition[]): z.ZodType<Record<string, unknown>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const d of defs) {
    if (d.archivedAt) continue;
    let s: z.ZodTypeAny;
    switch (d.fieldType) {
      case "number": case "currency": s = z.number(); break;
      case "boolean": s = z.boolean(); break;
      case "date": s = z.string().datetime({ offset: true }); break;
      case "url": s = z.string().url(); break;
      case "select": s = z.enum((d.options ?? [""]) as [string, ...string[]]); break;
      case "multiselect": s = z.array(z.enum((d.options ?? [""]) as [string, ...string[]])); break;
      default: s = z.string();
    }
    shape[d.key] = d.required ? s : s.optional();
  }
  return z.object(shape).passthrough();
}

export function validateValues(defs: CustomFieldDefinition[], values: Record<string, unknown>): Record<string, unknown> {
  const parsed = buildSchema(defs).safeParse(values);
  if (!parsed.success) throw new ValidationFailed("Neplatné custom fields.", parsed.error.issues);
  return parsed.data;
}

/** Klíče PII polí — vstup pro GDPR scrub. */
export const piiKeys = (defs: CustomFieldDefinition[]): string[] => defs.filter((d) => d.isPii).map((d) => d.key);
