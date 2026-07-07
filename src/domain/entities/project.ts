import type { WorkspaceId, ProjectId, OrganizationId, DealId, ProjectPhaseId, UserId, SlaPolicyId } from "../ids";
import type { ProjectType, EngagementType, ProjectStatus } from "../enums";

export interface Project {
  id: ProjectId;
  workspaceId: WorkspaceId;
  organizationId: OrganizationId;
  dealId: DealId | null;               // unique — idempotence Won→Project
  templateId: string | null;
  name: string;
  code: string | null;                 // např. ACME-CHB-01
  projectType: ProjectType;
  engagementType: EngagementType;
  status: ProjectStatus;
  currentPhaseId: ProjectPhaseId | null;
  ownerId: UserId | null;              // PM
  startDate: string | null;
  endDate: string | null;             // retainer: null
  budgetMinor: bigint | null;
  retainerFeeMinor: bigint | null;
  retainerPeriod: "monthly" | "quarterly" | null;
  retainerHoursIncluded: number | null;
  deliverySlaPolicyId: SlaPolicyId | null;
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
