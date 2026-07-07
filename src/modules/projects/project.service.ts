import type { TenantContext } from "@/shared";
import { audit } from "@/shared";
import { assertPhaseChange, assertStatusChange } from "@/domain/policies/project-phase.policy";
import type { ProjectPhaseKey, EngagementType, ProjectStatus } from "@/domain/enums";
import { NotFound } from "@/domain/errors";
import { projectRepository } from "./project.repository";
import { projectTemplateRepository } from "./project-template.repository";
import { dealRepository } from "@/modules/deals/deal.repository";
import { activityService } from "@/modules/activities/activity.service";
import type { CreateFromTemplateInput, AdvancePhaseInput, ChangeStatusInput, ProjectListFilter } from "./project.types";
import type { ProjectRow } from "./project.entity";

type TemplatePhase = { key: string; name: string; position: number; duration_days?: number };

/**
 * Use-casy modulu projects. createFromTemplate = W2 (Won→projekt draft, idempotentní přes deal_id).
 * Fáze/tasky se KOPÍRUJÍ (snapshot). Task provisioning (W3) se dopočítá s modulem tasks.
 */
export const projectService = {
  async createFromTemplate(ctx: TenantContext, input: CreateFromTemplateInput): Promise<{ projectId: string; created: boolean }> {
    // IDEMPOTENCE: existuje-li projekt pro deal, vrať ho (opakovaný webhook/klik nevytvoří druhý)
    const existing = await projectRepository.findByDealId(input.dealId);
    if (existing) return { projectId: existing.id, created: false };

    const template = input.templateKey
      ? await projectTemplateRepository.getByKey(input.templateKey)
      : await projectTemplateRepository.getByProjectType(input.projectType);

    const project = await projectRepository.create({
      organizationId: input.organizationId, dealId: input.dealId, templateId: template?.id ?? null,
      name: template?.name ?? "Nový projekt", projectType: input.projectType,
      engagementType: (template?.engagementType as EngagementType) ?? "one_off",
      ownerId: ctx.userId, createdBy: ctx.userId,
    });

    const phases = ((template?.phases as TemplatePhase[] | undefined) ?? []).map((p) => ({ key: p.key, name: p.name, position: p.position }));
    const inserted = await projectRepository.insertPhases(project.id, phases);
    if (inserted[0]) await projectRepository.setCurrentPhaseNoActivate(project.id, inserted[0].id);

    await dealRepository.setCreatedProject(input.dealId, project.id);
    await activityService.writeTimeline(ctx, {
      entityType: "project", entityId: project.id, organizationId: input.organizationId,
      eventType: "project_created", title: `Projekt vytvořen z dealu (${template?.name ?? input.projectType})`,
      sourceType: "project", sourceId: project.id,
    });
    return { projectId: project.id, created: true };
  },

  async advancePhase(ctx: TenantContext, input: AdvancePhaseInput): Promise<void> {
    const project = await projectRepository.getById(input.projectId);
    if (!project) throw new NotFound("Project", input.projectId);
    const phases = await projectRepository.listPhases(input.projectId);
    const current = phases.find((p) => p.id === project.currentPhaseId);
    const target = phases.find((p) => p.key === input.toPhase);
    if (!target) throw new NotFound("ProjectPhase", input.toPhase);

    assertPhaseChange(project.engagementType as EngagementType, (current?.key as ProjectPhaseKey) ?? null, input.toPhase, input.allowBackwards);
    await projectRepository.setCurrentPhase(input.projectId, target.id, target.key);
    await audit.audited(ctx, "project_phase_changed", { type: "project", id: project.id },
      { current_phase: { from: current?.key ?? null, to: target.key } });
    await activityService.writeTimeline(ctx, {
      entityType: "project", entityId: project.id, organizationId: project.organizationId,
      eventType: "phase_changed", title: `Fáze → ${target.name}`, payload: { to: target.key },
    });
  },

  async changeStatus(ctx: TenantContext, input: ChangeStatusInput): Promise<ProjectRow> {
    const project = await projectRepository.getById(input.projectId);
    if (!project) throw new NotFound("Project", input.projectId);
    assertStatusChange(project.status as ProjectStatus, input.toStatus);
    const updated = await projectRepository.setStatus(input.projectId, input.toStatus);
    await audit.audited(ctx, "project_status_changed", { type: "project", id: project.id },
      { status: { from: project.status, to: input.toStatus } });
    return updated;
  },

  async list(_ctx: TenantContext, filter: ProjectListFilter) {
    return projectRepository.list(filter);
  },

  async get(_ctx: TenantContext, id: string): Promise<ProjectRow | null> {
    return projectRepository.getById(id);
  },

  async phases(_ctx: TenantContext, projectId: string) {
    return projectRepository.listPhases(projectId);
  },
};
