import { randomUUID } from "node:crypto";
import { and, eq, isNull, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { clampLimit, type Page } from "@/shared/pagination";
import { deals, pipelineStages, type DealRow, type PipelineStageRow } from "./deal.entity";
import type { DealCreateInput, DealUpdateInput, DealListFilter } from "./deal.types";

/** Pole, která smí nastavit přechod stage (probability + won/lost stopy). */
export type DealStageExtra = Partial<Pick<DealRow, "probability" | "wonAt" | "lostAt" | "lostReason" | "lostNote">>;

/** Repository dealů + pipeline stages. Tenant-scoped, soft-delete aware. */
export const dealRepository = {
  async getById(id: string): Promise<DealRow | null> {
    const ws = currentWorkspaceId();
    const row = (await db().select().from(deals)
      .where(and(eq(deals.id, id), eq(deals.workspaceId, ws), isNull(deals.deletedAt))).limit(1))[0];
    return row ?? null;
  },

  async list(filter: DealListFilter, limit?: number): Promise<Page<DealRow>> {
    const ws = currentWorkspaceId();
    const conds = [eq(deals.workspaceId, ws), isNull(deals.deletedAt)];
    if (filter.stageId) conds.push(eq(deals.pipelineStageId, filter.stageId));
    if (filter.ownerId) conds.push(eq(deals.ownerId, filter.ownerId));
    if (filter.organizationId) conds.push(eq(deals.organizationId, filter.organizationId));
    const items = await db().select().from(deals)
      .where(and(...conds)).orderBy(desc(deals.createdAt)).limit(clampLimit(limit));
    return { items, nextCursor: null };
  },

  async listStages(): Promise<PipelineStageRow[]> {
    const ws = currentWorkspaceId();
    return db().select().from(pipelineStages)
      .where(eq(pipelineStages.workspaceId, ws)).orderBy(pipelineStages.position);
  },

  async getStage(id: string): Promise<PipelineStageRow | null> {
    const ws = currentWorkspaceId();
    return (await db().select().from(pipelineStages)
      .where(and(eq(pipelineStages.id, id), eq(pipelineStages.workspaceId, ws))).limit(1))[0] ?? null;
  },

  async create(input: DealCreateInput & { pipelineStageId: string; createdBy?: string }): Promise<DealRow> {
    const ws = currentWorkspaceId();
    const id = randomUUID();
    await db().insert(deals).values({
      id, workspaceId: ws,
      organizationId: input.organizationId,
      pipelineStageId: input.pipelineStageId,
      primaryContactId: input.primaryContactId ?? null,
      title: input.title,
      amountMinor: input.amountMinor ?? null,
      currency: input.currency ?? null,
      expectedMarginPct: input.expectedMarginPct != null ? String(input.expectedMarginPct) : null,
      expectedCloseDate: input.expectedCloseDate ?? null,
      ownerId: input.ownerId ?? null,
      projectTypeHint: input.projectTypeHint ?? null,
      customFields: input.customFields ?? {},
      createdBy: input.createdBy ?? null,
    });
    return (await this.getById(id))!;
  },

  async update(id: string, input: DealUpdateInput): Promise<DealRow> {
    const ws = currentWorkspaceId();
    await db().update(deals).set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.pipelineStageId !== undefined ? { pipelineStageId: input.pipelineStageId } : {}),
      ...(input.primaryContactId !== undefined ? { primaryContactId: input.primaryContactId } : {}),
      ...(input.amountMinor !== undefined ? { amountMinor: input.amountMinor } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.expectedMarginPct !== undefined ? { expectedMarginPct: String(input.expectedMarginPct) } : {}),
      ...(input.expectedCloseDate !== undefined ? { expectedCloseDate: input.expectedCloseDate } : {}),
      ...(input.ownerId !== undefined ? { ownerId: input.ownerId } : {}),
      ...(input.projectTypeHint !== undefined ? { projectTypeHint: input.projectTypeHint } : {}),
      ...(input.customFields !== undefined ? { customFields: input.customFields } : {}),
      updatedAt: new Date(),
    }).where(and(eq(deals.id, id), eq(deals.workspaceId, ws)));
    return (await this.getById(id))!;
  },

  /** Přesun stage — reset stage_entered_at (základ stale detekce). */
  async setStage(id: string, stageId: string, extra: DealStageExtra = {}): Promise<DealRow> {
    const ws = currentWorkspaceId();
    await db().update(deals).set({ pipelineStageId: stageId, stageEnteredAt: new Date(), updatedAt: new Date(), ...extra })
      .where(and(eq(deals.id, id), eq(deals.workspaceId, ws)));
    return (await this.getById(id))!;
  },

  async softDelete(id: string): Promise<void> {
    const ws = currentWorkspaceId();
    await db().update(deals).set({ deletedAt: new Date() })
      .where(and(eq(deals.id, id), eq(deals.workspaceId, ws)));
  },

  /** Idempotence Won→Project: naváže vzniklý projekt na deal. */
  async setCreatedProject(dealId: string, projectId: string): Promise<void> {
    const ws = currentWorkspaceId();
    await db().update(deals).set({ createdProjectId: projectId, updatedAt: new Date() })
      .where(and(eq(deals.id, dealId), eq(deals.workspaceId, ws)));
  },

  /** Stale dealy (W8): otevřená fáze se stale_after_days, deal v ní stojí déle než limit. */
  async listStale(now: Date): Promise<{ deal: DealRow; stageName: string; daysInStage: number }[]> {
    const ws = currentWorkspaceId();
    const rows = await db().select({ deal: deals, stageName: pipelineStages.name, staleAfterDays: pipelineStages.staleAfterDays })
      .from(deals)
      .innerJoin(pipelineStages, eq(deals.pipelineStageId, pipelineStages.id))
      .where(and(eq(deals.workspaceId, ws), isNull(deals.deletedAt), eq(pipelineStages.kind, "open")));
    return rows.flatMap((r) => {
      if (r.staleAfterDays == null) return [];
      const anchor = r.deal.lastActivityAt ?? r.deal.stageEnteredAt;
      const days = Math.floor((now.getTime() - anchor.getTime()) / 86_400_000);
      return days > r.staleAfterDays ? [{ deal: r.deal, stageName: r.stageName, daysInStage: days }] : [];
    });
  },
};
