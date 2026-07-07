import type { TenantContext } from "@/shared";
import { NotFound } from "@/domain/errors";
import { activityService } from "@/modules/activities/activity.service";
import { organizationRepository } from "@/modules/organizations/organization.repository";
import { taskRepository } from "./task.repository";
import { slaRepository, computeDueAt, targetMinutes } from "./sla.repository";
import type { TaskCreateInput, TaskStatusChangeInput, TaskListFilter } from "./task.types";
import type { TaskRow } from "./task.entity";

/**
 * Use-casy modulu tasks. Support ticket (type=support) → 2 SLA trackery (first_response, resolution).
 * waiting_on_client pauzuje trackery; done je vyřeší. Business-hours-aware due_at + eskalace = fáze 2.
 */
export const taskService = {
  async create(ctx: TenantContext, input: TaskCreateInput): Promise<{ taskId: string }> {
    const task = await taskRepository.create({
      type: input.type, title: input.title, projectId: input.projectId, organizationId: input.organizationId,
      phaseId: input.phaseId, description: input.description, priority: input.priority, assigneeId: input.assigneeId,
      dueAt: input.dueAt ? new Date(input.dueAt) : null, reporterContactId: input.reporterContactId, channel: input.channel,
      recurrenceRule: input.recurrenceRule, createdBy: ctx.userId,
    });

    if (input.type === "support" && input.organizationId) {
      const org = await organizationRepository.getById(input.organizationId);
      const policy = await slaRepository.getSupportPolicy(org?.supportSlaPolicyId ?? null);
      if (policy) {
        const now = new Date();
        for (const metric of ["first_response", "resolution"] as const) {
          const mins = targetMinutes(policy.targets, task.priority, metric);
          if (mins != null) await slaRepository.createTracker({ slaPolicyId: policy.id, entityType: "task", entityId: task.id, metric, dueAt: computeDueAt(now, mins) });
        }
      }
      await activityService.writeTimeline(ctx, {
        entityType: "task", entityId: task.id, organizationId: input.organizationId,
        eventType: "ticket_opened", title: `Ticket: ${task.title}`, sourceType: "task", sourceId: task.id,
      });
    }
    return { taskId: task.id };
  },

  async changeStatus(ctx: TenantContext, input: TaskStatusChangeInput): Promise<TaskRow> {
    const task = await taskRepository.getById(input.taskId);
    if (!task) throw new NotFound("Task", input.taskId);
    const trackers = await slaRepository.listForEntity("task", task.id);
    const now = new Date();

    // pauza / obnova SLA při waiting_on_client
    if (input.toStatus === "waiting_on_client") {
      for (const tr of trackers) if (tr.status === "running") await slaRepository.setStatus(tr.id, { status: "paused", pausedAt: now });
    } else if (task.status === "waiting_on_client") {
      for (const tr of trackers) if (tr.status === "paused" && tr.pausedAt) {
        const add = BigInt(now.getTime() - tr.pausedAt.getTime());
        await slaRepository.setStatus(tr.id, { status: "running", pausedAt: null, pausedTotalMs: tr.pausedTotalMs + add });
      }
    }

    const patch: Partial<Pick<TaskRow, "status" | "resolvedAt">> = { status: input.toStatus };
    if (input.toStatus === "done") {
      patch.resolvedAt = now;
      for (const tr of trackers) if (tr.status === "running" || tr.status === "paused") await slaRepository.setStatus(tr.id, { status: "met", satisfiedAt: now });
      await activityService.writeTimeline(ctx, {
        entityType: "task", entityId: task.id, organizationId: task.organizationId ?? undefined,
        eventType: task.type === "support" ? "ticket_resolved" : "task_completed", title: `Hotovo: ${task.title}`,
      });
    }
    return taskRepository.setStatus(task.id, patch);
  },

  /** První odchozí reakce assignee → splní first_response tracker. */
  async recordFirstResponse(_ctx: TenantContext, taskId: string): Promise<void> {
    const now = new Date();
    await taskRepository.setStatus(taskId, { firstRespondedAt: now });
    const trackers = await slaRepository.listForEntity("task", taskId);
    for (const tr of trackers) if (tr.metric === "first_response" && tr.status !== "met") await slaRepository.setStatus(tr.id, { status: "met", satisfiedAt: now });
  },

  async list(ctx: TenantContext, filter: TaskListFilter) {
    return taskRepository.list(filter, ctx.userId);
  },

  async get(_ctx: TenantContext, id: string): Promise<TaskRow | null> {
    return taskRepository.getById(id);
  },
};
