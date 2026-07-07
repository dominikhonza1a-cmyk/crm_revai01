import { randomUUID } from "node:crypto";
import { and, eq, isNull, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { clampLimit, type Page } from "@/shared/pagination";
import { contacts, contactRoles, type ContactRow } from "./contact.entity";
import type { ContactCreateInput, ContactUpdateInput, ContactListFilter } from "./contact.types";

/** Repository kontaktů + rolí. Tenant-scoped, soft-delete aware. */
export const contactRepository = {
  async getById(id: string): Promise<ContactRow | null> {
    const ws = currentWorkspaceId();
    const row = (await db().select().from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.workspaceId, ws), isNull(contacts.deletedAt))).limit(1))[0];
    return row ?? null;
  },

  async list(filter: ContactListFilter, limit?: number): Promise<Page<ContactRow>> {
    const ws = currentWorkspaceId();
    const conds = [eq(contacts.workspaceId, ws), isNull(contacts.deletedAt)];
    if (filter.organizationId) conds.push(eq(contacts.organizationId, filter.organizationId));
    const items = await db().select().from(contacts)
      .where(and(...conds)).orderBy(desc(contacts.createdAt)).limit(clampLimit(limit));
    return { items, nextCursor: null };
  },

  async create(input: ContactCreateInput & { createdBy?: string }): Promise<ContactRow> {
    const ws = currentWorkspaceId();
    const id = randomUUID();
    await db().insert(contacts).values({
      id, workspaceId: ws,
      organizationId: input.organizationId ?? null,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      jobTitle: input.jobTitle ?? null,
      legalBasis: input.legalBasis ?? "legitimate_interest",
      customFields: input.customFields ?? {},
      createdBy: input.createdBy ?? null,
    });
    if (input.roles?.length) {
      await db().insert(contactRoles).values(input.roles.map((r) => ({
        id: randomUUID(), workspaceId: ws, contactId: id,
        organizationId: r.organizationId, projectId: r.projectId ?? null,
        role: r.role, isPrimary: r.isPrimary ?? false,
      })));
    }
    return (await this.getById(id))!;
  },

  async update(id: string, input: ContactUpdateInput): Promise<ContactRow> {
    const ws = currentWorkspaceId();
    const { roles: _roles, ...fields } = input;
    await db().update(contacts).set({ ...fields, updatedAt: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.workspaceId, ws)));
    return (await this.getById(id))!;
  },

  async softDelete(id: string): Promise<void> {
    const ws = currentWorkspaceId();
    await db().update(contacts).set({ deletedAt: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.workspaceId, ws)));
  },

  async findByEmail(email: string): Promise<ContactRow | null> {
    const ws = currentWorkspaceId();
    const row = (await db().select().from(contacts)
      .where(and(eq(contacts.workspaceId, ws), eq(contacts.email, email), isNull(contacts.deletedAt))).limit(1))[0];
    return row ?? null;
  },
};
