import type { Organization } from "@/domain/entities";
import type { LifecycleStage, EmployeeBand } from "@/domain/enums";

export interface OrganizationCreateInput {
  name: string;
  website?: string;
  lifecycleStage?: LifecycleStage;
  employeeBand?: EmployeeBand;
  industry?: string;
  ownerId?: string;
  supportSlaPolicyId?: string;
  customFields?: Record<string, unknown>;
}
export type OrganizationUpdateInput = Partial<OrganizationCreateInput>;
export interface OrganizationListFilter { lifecycleStage?: LifecycleStage; ownerId?: string; healthStatus?: string; q?: string; }
export type OrganizationView = Organization;
