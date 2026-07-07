import type { TenantContext } from "@/shared";
import { audit } from "@/shared";
import { organizationRepository } from "./organization.repository";
import type { OrganizationCreateInput, OrganizationUpdateInput, OrganizationListFilter } from "./organization.types";
import type { OrganizationRow } from "./organization.entity";

/** Use-casy modulu organizations. CRUD + agregace pro klientskou kartu. */
export const organizationService = {
  async create(ctx: TenantContext, input: OrganizationCreateInput): Promise<OrganizationRow> {
    return organizationRepository.create({ ...input, createdBy: ctx.userId ?? undefined });
  },

  async update(_ctx: TenantContext, id: string, input: OrganizationUpdateInput): Promise<OrganizationRow> {
    return organizationRepository.update(id, input);
  },

  async list(_ctx: TenantContext, filter: OrganizationListFilter) {
    return organizationRepository.list(filter);
  },

  async get(_ctx: TenantContext, id: string): Promise<OrganizationRow | null> {
    return organizationRepository.getById(id);
  },

  async archive(ctx: TenantContext, id: string): Promise<void> {
    await organizationRepository.softDelete(id);
    await audit.audited(ctx, "record_deleted", { type: "organization", id });
  },
};
