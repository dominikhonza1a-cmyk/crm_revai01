import type { Project } from "@/domain/entities";
import type { ProjectType, EngagementType, ProjectStatus, ProjectPhaseKey } from "@/domain/enums";

export interface ProjectCreateInput {
  organizationId: string;
  name: string;
  projectType: ProjectType;
  engagementType: EngagementType;
  ownerId?: string;
  dealId?: string;
  templateId?: string;
  startDate?: string;
  budgetMinor?: bigint;
  retainerFeeMinor?: bigint;
  retainerPeriod?: "monthly" | "quarterly";
  customFields?: Record<string, unknown>;
}

export type ProjectUpdateInput = Partial<Omit<ProjectCreateInput, "organizationId">>;

/** Vstup pro automat Won→projekt (W2). projectType je string (z deal.project_type_hint / DB). */
export interface CreateFromTemplateInput {
  dealId: string;
  organizationId: string;
  projectType: string;
  templateKey?: string;             // default dle projectType
}

export interface AdvancePhaseInput { projectId: string; toPhase: ProjectPhaseKey; allowBackwards?: boolean; }
export interface ChangeStatusInput { projectId: string; toStatus: ProjectStatus; }

export interface ProjectListFilter {
  organizationId?: string;
  status?: ProjectStatus;
  engagementType?: EngagementType;
  ownerId?: string;
}

export type ProjectView = Project;
