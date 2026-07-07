import type { TenantContext } from "@/shared";
import { assertPhaseChange, assertStatusChange } from "@/domain/policies/project-phase.policy";
import type { CreateFromTemplateInput, AdvancePhaseInput, ChangeStatusInput } from "./project.types";

/**
 * Use-casy modulu projects. Referenční implementace modulové konvence:
 * createFromTemplate (W2), provisionTasks (W3), advancePhase, changeStatus (draft→active potvrzení PM).
 */
export interface ProjectService {
  createFromTemplate(ctx: TenantContext, input: CreateFromTemplateInput): Promise<{ projectId: string }>;
  provisionTasks(ctx: TenantContext, projectId: string): Promise<void>;
  advancePhase(ctx: TenantContext, input: AdvancePhaseInput): Promise<void>;
  changeStatus(ctx: TenantContext, input: ChangeStatusInput): Promise<void>;
}

export const projectService: ProjectService = {
  async createFromTemplate(_ctx, input) {
    // IDEMPOTENCE: v transakci SELECT deal FOR UPDATE; pokud deal.createdProjectId != null → vrať existující
    // 1) najdi ProjectTemplate dle input.templateKey / projectType (default)
    // 2) vytvoř Project(status=draft) + zkopíruj (snapshot) fáze do project_phase
    // 3) provisionTasks(projectId)  ← W3
    // 4) dealRepository.setCreatedProject(dealId, projectId)
    // 5) eventBus.publish(project.created); activities.writeTimeline(project_created)
    void input; throw new Error("projectService.createFromTemplate: implementace fáze 2 (policy hotová v domain).");
  },
  async provisionTasks(_ctx, _projectId) {
    // z TaskTemplate: vytvoř Task s due_at = start + Σ(předchozí fáze duration) + offset_days,
    // přiřaď dle default_assignee_role (nejbližší user s rolí, jinak nepřiřazeno).
    // recurring TaskTemplate → master task s recurrence_rule.
    throw new Error("projectService.provisionTasks: implementace fáze 2.");
  },
  async advancePhase(_ctx, input) {
    // assertPhaseChange(engagement, from, to, allowBackwards)  ← domain policy
    void assertPhaseChange; void input;
    // audit.audited(ctx, "project_phase_changed", …); eventBus.publish(project.phase_changed)
    throw new Error("projectService.advancePhase: implementace fáze 1.");
  },
  async changeStatus(_ctx, input) {
    // assertStatusChange(from, to)  ← draft→active potvrzuje PM
    void assertStatusChange; void input;
    // audit.audited(ctx, "project_status_changed", …); publish(project.status_changed)
    throw new Error("projectService.changeStatus: implementace fáze 1.");
  },
};
