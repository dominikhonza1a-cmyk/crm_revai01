import { randomUUID } from "node:crypto";
import { and, eq, isNull, desc, inArray } from "drizzle-orm";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { clampLimit, type Page } from "@/shared/pagination";
import { tasks, type TaskRow } from "./task.entity";
import type { TaskListFilter } from "./task.types";

export interface TaskInsertData {
  type: string; title: string; projectId?: string | null; organizationId?: string | null; phaseId?: string | null;
  description?: string | null; priority?: string; assigneeId?: string | null; dueAt?: Date | null;
  reporterContactId?: string | null; channel?: string | null;
  recurrenceRule?: string | null; recurrenceParentId?: string | null; createdBy?: string | null;
}

export const taskRepository = {
  async getById(id: string): Promise<TaskRow | null> {
    const ws = currentWorkspaceId();
    return (await db().select().from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, ws), isNull(tasks.deletedAt))).limit(1))[0] ?? null;
  },

  async list(filter: TaskListFilter, userId: string | null, limit?: number): Promise<Page<TaskRow>> {
    const ws = currentWorkspaceId();
    const conds = [eq(tasks.workspaceId, ws), isNull(tasks.deletedAt)];
    if (filter.type) conds.push(eq(tasks.type, filter.type));
    if (filter.status) conds.push(eq(tasks.status, filter.status));
    if (filter.projectId) conds.push(eq(tasks.projectId, filter.projectId));
    if (filter.organizationId) conds.push(eq(tasks.organizationId, filter.organizationId));
    if (filter.assigneeId) conds.push(eq(tasks.assigneeId, filter.assigneeId));
    if (filter.view === "my_work" && userId) {
      conds.push(eq(tasks.assigneeId, userId));
      conds.push(inArray(tasks.status, ["todo", "in_progress", "blocked"]));
    }
    if (filter.view === "ticket_queue") {
      conds.push(eq(tasks.type, "support"));
      conds.push(inArray(tasks.status, ["todo", "in_progress", "waiting_on_client", "blocked"]));
    }
    const items = await db().select().from(tasks)
      .where(and(...conds)).orderBy(filter.view === "ticket_queue" ? tasks.dueAt : desc(tasks.createdAt)).limit(clampLimit(limit));
    return { items, nextCursor: null };
  },

  async create(data: TaskInsertData): Promise<TaskRow> {
    const ws = currentWorkspaceId();
    const id = randomUUID();
    await db().insert(tasks).values({
      id, workspaceId: ws, type: data.type, title: data.title,
      projectId: data.projectId ?? null, organizationId: data.organizationId ?? null, phaseId: data.phaseId ?? null,
      description: data.description ?? null, priority: data.priority ?? "p3", assigneeId: data.assigneeId ?? null,
      dueAt: data.dueAt ?? null, reporterContactId: data.reporterContactId ?? null, channel: data.channel ?? null,
      recurrenceRule: data.recurrenceRule ?? null, recurrenceParentId: data.recurrenceParentId ?? null, createdBy: data.createdBy ?? null,
    });
    return (await this.getById(id))!;
  },

  async setStatus(id: string, patch: Partial<Pick<TaskRow, "status" | "firstRespondedAt" | "resolvedAt">>): Promise<TaskRow> {
    const ws = currentWorkspaceId();
    await db().update(tasks).set({ ...patch, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, ws)));
    return (await this.getById(id))!;
  },

  async softDelete(id: string): Promise<void> {
    const ws = currentWorkspaceId();
    await db().update(tasks).set({ deletedAt: new Date() }).where(and(eq(tasks.id, id), eq(tasks.workspaceId, ws)));
  },
};
