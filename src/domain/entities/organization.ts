import type { WorkspaceId, OrganizationId, UserId, SlaPolicyId } from "../ids";
import type { LifecycleStage, EmployeeBand } from "../enums";

export interface Organization {
  id: OrganizationId;
  workspaceId: WorkspaceId;
  name: string;
  legalName: string | null;
  lifecycleStage: LifecycleStage;
  website: string | null;
  country: string | null;         // char(2)
  city: string | null;
  employeeBand: EmployeeBand | null;
  industry: string | null;
  ownerId: UserId | null;
  supportSlaPolicyId: SlaPolicyId | null;
  healthStatus: "healthy" | "at_risk" | "churn_risk" | null;
  billingNotes: string | null;
  source: "referral" | "inbound" | "outbound" | "event" | "import" | null;
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
