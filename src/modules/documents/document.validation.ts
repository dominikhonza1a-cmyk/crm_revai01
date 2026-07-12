import { z } from "zod";
import { urlish } from "@/shared/validation";

/** CHECK v datech (kind=secret_ref ⇒ external_url prázdné) je vynucen i tady na úrovni validace. */
export const documentCreateSchema = z.object({
  kind: z.enum(["external_ref", "native_file", "secret_ref"]),
  title: z.string().min(1).max(300),
  entityType: z.enum(["organization", "contact", "deal", "project", "task", "idea"]),
  entityId: z.string().uuid(),
  docCategory: z.enum(["contract", "proposal", "spec", "credentials_ref", "deliverable", "questionnaire", "other"]),
  categoryLabel: z.string().max(100).optional(),   // volný popis při „Jiné"
  storageProvider: z.enum(["gdrive", "sharepoint", "url", "local", "supabase"]).optional(),
  storageKey: z.string().max(500).optional(),      // native_file → cesta v Supabase Storage
  mimeType: z.string().max(120).optional(),
  externalUrl: urlish.optional(),
  secretLocation: z.string().max(500).optional(),
  secretPolicyNote: z.string().max(1000).optional(),
  containsPii: z.boolean().default(false),
}).refine(
  (v) => !(v.kind === "secret_ref" && v.externalUrl),
  { message: "Secret reference nesmí obsahovat externalUrl — hodnota secretu nemá kam zatéct." },
);
