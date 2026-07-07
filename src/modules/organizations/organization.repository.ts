import { randomUUID } from "node:crypto";
import { and, eq, isNull, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { clampLimit, type Page } from "@/shared/pagination";
import { organizations, type OrganizationRow } from "./organization.entity";
import type { OrganizationCreateInput, OrganizationUpdateInput, OrganizationListFilter } from "./organization.types";

/**
 * Repository organizací. Jediné místo se SQL; každý dotaz filtruje workspace_id (tenant-context)
 * a defaultně deleted_at IS NULL.
 */
export const organizationRepository = {
  async getById(id: string): Promise<OrganizationRow | null> {
    const ws = currentWorkspaceId();
    const row = (await db().select().from(organizations)
      .where(and(eq(organizations.id, id), eq(organizations.workspaceId, ws), isNull(organizations.deletedAt))).limit(1))[0];
    return row ?? null;
  },

  async list(filter: OrganizationListFilter, limit?: number): Promise<Page<OrganizationRow>> {
    const ws = currentWorkspaceId();
    const conds = [eq(organizations.workspaceId, ws), isNull(organizations.deletedAt)];
    if (filter.lifecycleStage) conds.push(eq(organizations.lifecycleStage, filter.lifecycleStage));
    if (filter.ownerId) conds.push(eq(organizations.ownerId, filter.ownerId));
    if (filter.healthStatus) conds.push(eq(organizations.healthStatus, filter.healthStatus));
    const items = await db().select().from(organizations)
      .where(and(...conds)).orderBy(desc(organizations.createdAt)).limit(clampLimit(limit));
    return { items, nextCursor: null };
  },

  async create(input: OrganizationCreateInput & { createdBy?: string }): Promise<OrganizationRow> {
    const ws = currentWorkspaceId();
    const id = randomUUID();
    await db().insert(organizations).values({
      id, workspaceId: ws,
      name: input.name,
      website: input.website ?? null,
      lifecycleStage: input.lifecycleStage ?? "prospect",
      employeeBand: input.employeeBand ?? null,
      industry: input.industry ?? null,
      ownerId: input.ownerId ?? null,
      supportSlaPolicyId: input.supportSlaPolicyId ?? null,
      customFields: input.customFields ?? {},
      createdBy: input.createdBy ?? null,
    });
    return (await this.getById(id))!;
  },

  async update(id: string, input: OrganizationUpdateInput): Promise<OrganizationRow> {
    const ws = currentWorkspaceId();
    await db().update(organizations).set({ ...input, updatedAt: new Date() })
      .where(and(eq(organizations.id, id), eq(organizations.workspaceId, ws)));
    return (await this.getById(id))!;
  },

  async softDelete(id: string): Promise<void> {
    const ws = currentWorkspaceId();
    await db().update(organizations).set({ deletedAt: new Date() })
      .where(and(eq(organizations.id, id), eq(organizations.workspaceId, ws)));
  },

  async findByDomain(domain: string): Promise<OrganizationRow | null> {
    const ws = currentWorkspaceId();
    const rows = await db().select().from(organizations)
      .where(and(eq(organizations.workspaceId, ws), isNull(organizations.deletedAt)));
    return rows.find((r) => r.website && r.website.toLowerCase().includes(domain.toLowerCase())) ?? null;
  },
};
