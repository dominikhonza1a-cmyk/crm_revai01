import type { TenantContext } from "@/shared";
import { audit } from "@/shared";
import { fieldAccess, type EffectivePermissions } from "@/domain/policies/permission.policy";
import { contactRepository } from "./contact.repository";
import type { ContactCreateInput, ContactUpdateInput, ContactListFilter } from "./contact.types";
import type { ContactRow } from "./contact.entity";

/**
 * Use-casy modulu contacts. KLÍČOVÉ: field-level masking PII při serializaci dle role (contact.pii).
 * dev role → phone/notes/linkedin maskované.
 */
export const contactService = {
  async create(ctx: TenantContext, input: ContactCreateInput): Promise<ContactRow> {
    return contactRepository.create({ ...input, createdBy: ctx.userId ?? undefined });
  },

  async update(_ctx: TenantContext, id: string, input: ContactUpdateInput): Promise<ContactRow> {
    return contactRepository.update(id, input);
  },

  async list(_ctx: TenantContext, filter: ContactListFilter) {
    return contactRepository.list(filter);
  },

  async get(_ctx: TenantContext, id: string): Promise<ContactRow | null> {
    return contactRepository.getById(id);
  },

  async archive(ctx: TenantContext, id: string): Promise<void> {
    await contactRepository.softDelete(id);
    await audit.audited(ctx, "record_deleted", { type: "contact", id });
  },

  /** Aplikuje field-level policy contact.pii (hidden/masked/read/write) na výstup dle role uživatele. */
  serialize(permissions: EffectivePermissions, contact: ContactRow): Partial<ContactRow> {
    const access = fieldAccess(permissions, "contact.pii");
    if (access === "write" || access === "read") return contact;
    const masked: Record<string, unknown> = { ...contact };
    for (const k of ["phone", "notes", "linkedinUrl"]) {
      if (access === "hidden") delete masked[k];
      else masked[k] = masked[k] ? "•••" : null;   // masked
    }
    return masked as Partial<ContactRow>;
  },
};
