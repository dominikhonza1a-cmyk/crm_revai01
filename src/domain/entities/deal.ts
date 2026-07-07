import type { WorkspaceId, DealId, OrganizationId, ContactId, PipelineStageId, UserId, ProjectId } from "../ids";
import type { LostReason, ProjectType } from "../enums";

export interface Deal {
  id: DealId;
  workspaceId: WorkspaceId;
  organizationId: OrganizationId;
  primaryContactId: ContactId | null;
  pipelineStageId: PipelineStageId;
  title: string;
  amountMinor: bigint | null;
  currency: string | null;
  expectedMarginPct: number | null;   // field-level restricted
  probability: number;
  expectedCloseDate: string | null;    // date
  ownerId: UserId | null;
  source: string | null;
  projectTypeHint: ProjectType | null;
  stageEnteredAt: string;              // reset při změně stage → základ stale detekce
  lastActivityAt: string | null;
  lostReason: LostReason | null;
  lostNote: string | null;
  wonAt: string | null;
  lostAt: string | null;
  createdProjectId: ProjectId | null;  // idempotence Won→Project
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
