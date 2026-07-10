import { randomUUID } from "node:crypto";
import { and, eq, isNull, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { clampLimit, type Page } from "@/shared/pagination";
import { projects, projectPhases, type ProjectRow, type ProjectPhaseRow } from "./project.entity";
import type { ProjectListFilter } from "./project.types";

export interface ProjectInsertData {
  organizationId: string; dealId?: string | null; templateId?: string | null;
  name: string; code?: string | null; projectType: string; engagementType: string;
  ownerId?: string | null; startDate?: string | null; createdBy?: string | null;
}

export const projectRepository = {
  async getById(id: string): Promise<ProjectRow | null> {
    const ws = currentWorkspaceId();
    return (await db().select().from(projects)
      .where(and(eq(projects.id, id), eq(projects.workspaceId, ws), isNull(projects.deletedAt))).limit(1))[0] ?? null;
  },

  async findByDealId(dealId: string): Promise<ProjectRow | null> {
    const ws = currentWorkspaceId();
    return (await db().select().from(projects)
      .where(and(eq(projects.dealId, dealId), eq(projects.workspaceId, ws))).limit(1))[0] ?? null;
  },

  async list(filter: ProjectListFilter, limit?: number): Promise<Page<ProjectRow>> {
    const ws = currentWorkspaceId();
    const conds = [eq(projects.workspaceId, ws), isNull(projects.deletedAt)];
    if (filter.organizationId) conds.push(eq(projects.organizationId, filter.organizationId));
    if (filter.status) conds.push(eq(projects.status, filter.status));
    if (filter.engagementType) conds.push(eq(projects.engagementType, filter.engagementType));
    if (filter.ownerId) conds.push(eq(projects.ownerId, filter.ownerId));
    const items = await db().select().from(projects)
      .where(and(...conds)).orderBy(desc(projects.createdAt)).limit(clampLimit(limit));
    return { items, nextCursor: null };
  },

  async create(data: ProjectInsertData): Promise<ProjectRow> {
    const ws = currentWorkspaceId();
    const id = randomUUID();
    await db().insert(projects).values({
      id, workspaceId: ws,
      organizationId: data.organizationId, dealId: data.dealId ?? null, templateId: data.templateId ?? null,
      name: data.name, code: data.code ?? null, projectType: data.projectType, engagementType: data.engagementType,
      status: "draft", ownerId: data.ownerId ?? null, startDate: data.startDate ?? null, createdBy: data.createdBy ?? null,
    });
    return (await this.getById(id))!;
  },

  async insertPhases(projectId: string, phases: { key: string; name: string; position: number; dueDate?: string | null }[]): Promise<ProjectPhaseRow[]> {
    const ws = currentWorkspaceId();
    if (!phases.length) return [];
    await db().insert(projectPhases).values(phases.map((p) => ({
      id: randomUUID(), workspaceId: ws, projectId, key: p.key, name: p.name, position: p.position,
      status: "pending", dueDate: p.dueDate ?? null,
    })));
    return db().select().from(projectPhases).where(eq(projectPhases.projectId, projectId)).orderBy(projectPhases.position);
  },

  async listPhases(projectId: string): Promise<ProjectPhaseRow[]> {
    const ws = currentWorkspaceId();
    return db().select().from(projectPhases)
      .where(and(eq(projectPhases.workspaceId, ws), eq(projectPhases.projectId, projectId))).orderBy(projectPhases.position);
  },

  async setCurrentPhase(projectId: string, phaseId: string, phaseKey: string): Promise<void> {
    const ws = currentWorkspaceId();
    await db().update(projects).set({ currentPhaseId: phaseId, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, ws)));
    await db().update(projectPhases).set({ status: "active", startedAt: new Date() })
      .where(and(eq(projectPhases.id, phaseId), eq(projectPhases.workspaceId, ws)));
    void phaseKey;
  },

  /** Nastaví aktuální fázi BEZ aktivace (draft projekt — fáze zůstávají pending). */
  async setCurrentPhaseNoActivate(projectId: string, phaseId: string): Promise<void> {
    const ws = currentWorkspaceId();
    await db().update(projects).set({ currentPhaseId: phaseId, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, ws)));
  },

  /** Upsert jednoho klíče v custom_fields (např. git_repo). null = odstranit. */
  /** Měsíční fakturace retaineru (CZK haléře) — pro dashboard finance. */
  async setMonthlyAmount(projectId: string, amountMinor: bigint | null): Promise<void> {
    const ws = currentWorkspaceId();
    await db().update(projects).set({ monthlyAmountMinor: amountMinor, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, ws)));
  },

  /** Finance projektu: sjednaná cena + přepínač „retainer běží". */
  async setFinance(projectId: string, input: { priceMinor?: bigint | null; retainerActive?: boolean }): Promise<void> {
    const ws = currentWorkspaceId();
    await db().update(projects).set({
      ...(input.priceMinor !== undefined ? { priceMinor: input.priceMinor } : {}),
      ...(input.retainerActive !== undefined ? { retainerActive: input.retainerActive } : {}),
      updatedAt: new Date(),
    }).where(and(eq(projects.id, projectId), eq(projects.workspaceId, ws)));
  },

  /** Přidá platbu (záloha/doplatek) do evidence plateb projektu. */
  async addPayment(projectId: string, payment: { amountMinor: number; date: string; note?: string }): Promise<void> {
    const ws = currentWorkspaceId();
    const p = await this.getById(projectId);
    if (!p) throw new Error("Projekt nenalezen");
    const payments = [...((p.payments as { amountMinor: number; date: string; note?: string }[]) ?? []), payment];
    await db().update(projects).set({ payments, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, ws)));
  },

  /** Odebere platbu dle indexu. */
  async removePayment(projectId: string, index: number): Promise<void> {
    const ws = currentWorkspaceId();
    const p = await this.getById(projectId);
    if (!p) throw new Error("Projekt nenalezen");
    const payments = ((p.payments as unknown[]) ?? []).filter((_, i) => i !== index);
    await db().update(projects).set({ payments, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, ws)));
  },

  async setCustomField(projectId: string, key: string, value: unknown | null): Promise<ProjectRow> {
    const ws = currentWorkspaceId();
    const p = await this.getById(projectId);
    if (!p) throw new Error("Projekt nenalezen");
    const cf = { ...(p.customFields as Record<string, unknown>) };
    if (value === null || value === "") delete cf[key];
    else cf[key] = value;
    await db().update(projects).set({ customFields: cf, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, ws)));
    return (await this.getById(projectId))!;
  },

  async setStatus(projectId: string, status: string): Promise<ProjectRow> {
    const ws = currentWorkspaceId();
    await db().update(projects).set({ status, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, ws)));
    return (await this.getById(projectId))!;
  },
};
