import type { TenantContext } from "@/shared";
import { audit, eventBus } from "@/shared";
import { assertDealStageChange, isWinTransition, type StageInfo } from "@/domain/policies/deal-stage.policy";
import type { StageKind } from "@/domain/enums";
import { NotFound } from "@/domain/errors";
import { dealRepository, type DealStageExtra } from "./deal.repository";
import type { DealCreateInput, DealUpdateInput, DealMoveStageInput, DealListFilter } from "./deal.types";
import type { DealRow } from "./deal.entity";
import { asId, type WorkspaceId, type DealId, type UserId, type PipelineStageId, type OrganizationId } from "@/domain/ids";

/**
 * Use-casy modulu deals. Klíčové: moveStage() hlídané deal-stage.policy → audit → event (deal.won spustí W2).
 * Field-level (financials) maskuje serialize() dle role.
 */
export const dealService = {
  async create(ctx: TenantContext, input: DealCreateInput): Promise<DealRow> {
    const stages = await dealRepository.listStages();
    const stageId = input.pipelineStageId ?? stages.find((s) => s.kind === "open")?.id ?? stages[0]?.id;
    if (!stageId) throw new NotFound("PipelineStage");
    return dealRepository.create({ ...input, pipelineStageId: stageId, createdBy: ctx.userId ?? undefined });
  },

  async update(_ctx: TenantContext, id: string, input: DealUpdateInput): Promise<DealRow> {
    return dealRepository.update(id, input);
  },

  async list(_ctx: TenantContext, filter: DealListFilter) {
    return dealRepository.list(filter);
  },

  async get(_ctx: TenantContext, id: string): Promise<DealRow | null> {
    return dealRepository.getById(id);
  },

  async archive(ctx: TenantContext, id: string): Promise<void> {
    await dealRepository.softDelete(id);
    await audit.audited(ctx, "record_deleted", { type: "deal", id });
  },

  /** Přesun mezi fázemi pipeline — policy, audit, event, přepočet pravděpodobnosti.
   *  `actorIsAdmin` předává router z ctx.permissions (TenantContext role nenese). */
  async moveStage(ctx: TenantContext, input: DealMoveStageInput, actorIsAdmin = false): Promise<DealRow> {
    const deal = await dealRepository.getById(input.dealId);
    if (!deal) throw new NotFound("Deal", input.dealId);
    const toStage = await dealRepository.getStage(input.toStageId);
    if (!toStage) throw new NotFound("PipelineStage", input.toStageId);
    const fromStage = await dealRepository.getStage(deal.pipelineStageId);

    const from: StageInfo | null = fromStage
      ? { id: fromStage.id, position: fromStage.position, kind: fromStage.kind as StageKind } : null;
    const to: StageInfo = { id: toStage.id, position: toStage.position, kind: toStage.kind as StageKind };

    const isAdminOrOwner = actorIsAdmin || ctx.userId === deal.ownerId;
    assertDealStageChange({ from, to, lostReason: input.lostReason ?? null, actorIsAdminOrOwner: isAdminOrOwner });

    const now = new Date();
    const extra: DealStageExtra = { probability: toStage.probabilityDefault };
    if (to.kind === "won") extra.wonAt = now;
    if (to.kind === "lost") { extra.lostAt = now; extra.lostReason = input.lostReason ?? null; extra.lostNote = input.lostNote ?? null; }

    const updated = await dealRepository.setStage(deal.id, toStage.id, extra);

    await audit.audited(ctx, "deal_stage_changed", { type: "deal", id: deal.id },
      { pipeline_stage_id: { from: deal.pipelineStageId, to: toStage.id } });

    const base = {
      workspaceId: asId<WorkspaceId>(ctx.workspaceId), occurredAt: now.toISOString(),
      actorId: ctx.userId ? asId<UserId>(ctx.userId) : null,
    };
    await eventBus.publish({
      ...base, type: "deal.stage_changed", dealId: asId<DealId>(deal.id),
      fromStageId: from ? asId<PipelineStageId>(from.id) : null, toStageId: asId<PipelineStageId>(to.id),
    });
    if (isWinTransition({ from, to, lostReason: null, actorIsAdminOrOwner: isAdminOrOwner })) {
      await eventBus.publish({ ...base, type: "deal.won", dealId: asId<DealId>(deal.id), organizationId: asId<OrganizationId>(deal.organizationId) });
    }
    return updated;
  },
};
