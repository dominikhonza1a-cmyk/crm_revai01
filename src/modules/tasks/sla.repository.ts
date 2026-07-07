import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { slaPolicies, slaTrackers, type SlaPolicyRow, type SlaTrackerRow } from "./task.entity";

/** Repository SLA politik a trackerů. */
export const slaRepository = {
  async getPolicyById(id: string): Promise<SlaPolicyRow | null> {
    const ws = currentWorkspaceId();
    return (await db().select().from(slaPolicies).where(and(eq(slaPolicies.id, id), eq(slaPolicies.workspaceId, ws))).limit(1))[0] ?? null;
  },

  /** Support politika klienta (policyId), fallback default support politika workspace. */
  async getSupportPolicy(policyId?: string | null): Promise<SlaPolicyRow | null> {
    if (policyId) { const p = await this.getPolicyById(policyId); if (p) return p; }
    return this.getDefault("support");
  },

  async getDefault(appliesTo: string): Promise<SlaPolicyRow | null> {
    const ws = currentWorkspaceId();
    const rows = await db().select().from(slaPolicies).where(and(eq(slaPolicies.workspaceId, ws), eq(slaPolicies.appliesTo, appliesTo)));
    return rows.find((r) => r.isDefault) ?? rows[0] ?? null;
  },

  async createTracker(data: {
    slaPolicyId: string; entityType: "task" | "deal"; entityId: string;
    metric: "first_response" | "resolution" | "due_date" | "followup"; dueAt: Date;
  }): Promise<SlaTrackerRow> {
    const ws = currentWorkspaceId();
    const id = randomUUID();
    await db().insert(slaTrackers).values({
      id, workspaceId: ws, slaPolicyId: data.slaPolicyId, entityType: data.entityType, entityId: data.entityId,
      metric: data.metric, startedAt: new Date(), dueAt: data.dueAt, status: "running",
    });
    return (await db().select().from(slaTrackers).where(eq(slaTrackers.id, id)).limit(1))[0]!;
  },

  async listForEntity(entityType: string, entityId: string): Promise<SlaTrackerRow[]> {
    const ws = currentWorkspaceId();
    return db().select().from(slaTrackers)
      .where(and(eq(slaTrackers.workspaceId, ws), eq(slaTrackers.entityType, entityType), eq(slaTrackers.entityId, entityId)));
  },

  async setStatus(id: string, patch: Partial<Pick<SlaTrackerRow, "status" | "satisfiedAt" | "breachedAt" | "pausedAt" | "pausedTotalMs" | "escalationLevel" | "lastEscalatedAt">>): Promise<void> {
    const ws = currentWorkspaceId();
    await db().update(slaTrackers).set({ ...patch, updatedAt: new Date() })
      .where(and(eq(slaTrackers.id, id), eq(slaTrackers.workspaceId, ws)));
  },
};

/**
 * Výpočet due_at. FÁZE 1: jednoduchý wall-clock (start + minuty). FÁZE 2: business-hours-aware
 * (domain/policies/sla.policy.addBusinessMinutes) + svátky + eskalační scheduler.
 */
export function computeDueAt(start: Date, minutes: number): Date {
  return new Date(start.getTime() + minutes * 60_000);
}

/** Vytáhne cílové minuty z targets pro danou prioritu a metriku. */
export function targetMinutes(targets: unknown, priority: string, metric: "first_response" | "resolution"): number | null {
  const t = (targets as Record<string, { first_response_min?: number; resolution_min?: number }>)?.[priority];
  if (!t) return null;
  return metric === "first_response" ? t.first_response_min ?? null : t.resolution_min ?? null;
}
