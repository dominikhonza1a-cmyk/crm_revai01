import { db } from "@/shared/db";
import { runWithTenant, type TenantContext } from "@/shared/tenant-context";
import { logger } from "@/shared/logger";
import { loadConfig } from "@/config/app.config";
import { workspaces } from "@/modules/security/security.entity";
import { securityRepository } from "@/modules/security/security.repository";
import { taskRepository } from "@/modules/tasks/task.repository";
import { slaRepository } from "@/modules/tasks/sla.repository";
import { dealRepository } from "@/modules/deals/deal.repository";
import { projectRepository } from "@/modules/projects/project.repository";
import { activityService } from "@/modules/activities/activity.service";
import { notifications } from "@/shared/notifications/notification.service";
import { elapsedFraction, nextEscalationStep } from "@/domain/policies/sla.policy";
import { nextOccurrences } from "@/domain/policies/recurrence.policy";
import { asId, type WorkspaceId } from "@/domain/ids";

/**
 * Automatizační joby (W4–W8 + digest). Spouští je worker (pg-boss cron) nebo jednorázově scripts/run-jobs.ts.
 * Každý job běží per-workspace uvnitř tenant contextu (repositories tak samy filtrují workspace_id).
 */
type EscalationStep = { at_pct: number; notify: string[]; channels?: string[]; delay_min?: number };

export async function forEachWorkspace(jobName: string, fn: (ctx: TenantContext) => Promise<void>): Promise<void> {
  const wss = await db().select({ id: workspaces.id }).from(workspaces);
  for (const w of wss) {
    const ctx: TenantContext = { workspaceId: asId<WorkspaceId>(w.id), userId: null, requestId: `job:${jobName}` };
    try {
      await runWithTenant(ctx, () => fn(ctx));
    } catch (err) {
      logger.error(`job ${jobName} selhal`, { workspaceId: w.id, err: String(err) });
    }
  }
}

/** Příjemci eskalačního kroku: assignee / project_owner / admins → user ids. */
async function resolveRecipients(step: EscalationStep, task: { assigneeId: string | null; projectId: string | null }): Promise<(string | null)[]> {
  const out: (string | null)[] = [];
  for (const who of step.notify) {
    if (who === "assignee") out.push(task.assigneeId);
    else if (who === "project_owner" && task.projectId) out.push((await projectRepository.getById(task.projectId))?.ownerId ?? null);
    else if (who === "admins") out.push(...await securityRepository.listAdminUserIds());
  }
  return out;
}

/** W5 — SLA eskalace: 75 % okna → warning, 100 % → breach (+ timeline). delay_min kroky se posílají hned (zjednodušení v1). */
export async function runSlaEscalation(now = new Date()): Promise<void> {
  await forEachWorkspace("sla-escalation", async (ctx) => {
    const appUrl = loadConfig().APP_URL;
    for (const tr of await slaRepository.listRunning()) {
      if (tr.entityType !== "task") continue;
      const task = await taskRepository.getById(tr.entityId);
      if (!task) continue;
      const policy = await slaRepository.getPolicyById(tr.slaPolicyId);
      const steps = ((policy?.escalationRules ?? []) as EscalationStep[]);
      const fraction = elapsedFraction(tr.startedAt, tr.dueAt, now, Number(tr.pausedTotalMs));

      let level = tr.escalationLevel;
      let stepIdx = nextEscalationStep(fraction, steps, level);
      while (stepIdx != null) {
        const step = steps[stepIdx]!;
        const breach = fraction >= 1;
        await notifications.notify({
          category: breach ? "sla_breach" : "sla_warning",
          userIds: await resolveRecipients(step, task),
          title: breach
            ? `🚨 SLA breach: „${task.title}" (${tr.metric === "first_response" ? "první reakce" : "vyřešení"})`
            : `⏳ SLA na ${Math.round(fraction * 100)} %: „${task.title}"`,
          body: `Priorita ${task.priority.toUpperCase()} · termín ${tr.dueAt.toLocaleString("cs-CZ")}`,
          link: task.projectId ? `${appUrl}/projects/${task.projectId}` : `${appUrl}/tasks`,
          sourceId: `${tr.id}:${stepIdx}`,
        });
        level = stepIdx + 1;
        await slaRepository.setStatus(tr.id, { escalationLevel: level, lastEscalatedAt: now });
        stepIdx = nextEscalationStep(fraction, steps, level);
      }

      if (fraction >= 1 && !tr.breachedAt) {
        await slaRepository.setStatus(tr.id, { status: "breached", breachedAt: now });
        await activityService.writeTimeline(ctx, {
          entityType: "task", entityId: task.id, organizationId: task.organizationId ?? undefined,
          eventType: "sla_breached", title: `SLA breach: ${task.title} (${tr.metric})`,
          sourceType: "sla_tracker", sourceId: tr.id,
        });
      }
    }
  });
}

/** W4 — overdue tasky: reminder assigneemu + timeline (jednou, díky unique source). */
export async function runOverdueTasks(now = new Date()): Promise<void> {
  await forEachWorkspace("overdue-tasks", async (ctx) => {
    const appUrl = loadConfig().APP_URL;
    for (const task of await taskRepository.listOverdue(now)) {
      await notifications.notify({
        category: "task_overdue",
        userIds: [task.assigneeId],
        title: `⏰ Po termínu: „${task.title}"`,
        body: `Termín byl ${task.dueAt!.toLocaleString("cs-CZ")}`,
        link: task.projectId ? `${appUrl}/projects/${task.projectId}` : `${appUrl}/tasks`,
        sourceId: task.id,
      });
      await activityService.writeTimeline(ctx, {
        entityType: "task", entityId: task.id, organizationId: task.organizationId ?? undefined,
        eventType: "task_overdue", title: `Úkol po termínu: ${task.title}`,
        sourceType: "task", sourceId: task.id,
      });
    }
  });
}

/** W7 — recurring tasky: materializace instancí v klouzavém okně (idempotentní přes unique). */
export async function runRecurringTasks(now = new Date()): Promise<{ created: number }> {
  const windowDays = 60;
  let created = 0;
  await forEachWorkspace("recurring-tasks", async () => {
    for (const master of await taskRepository.listRecurrenceMasters()) {
      if (!master.recurrenceRule) continue;
      const anchor = (await taskRepository.latestInstanceDue(master.id)) ?? master.dueAt ?? now;
      const occurrences = nextOccurrences({
        rule: master.recurrenceRule,
        lastDueAt: anchor,
        until: master.recurrenceUntil ? new Date(master.recurrenceUntil) : null,
        windowEnd: new Date(now.getTime() + windowDays * 86_400_000),
      });
      for (const due of occurrences) {
        await taskRepository.insertRecurrenceInstance(master, due);
        created++;
      }
    }
  });
  return { created };
}

/** W8 — stale dealy: deal stojí ve fázi déle než stale_after_days → reminder ownerovi (digest). */
export async function runStaleDeals(now = new Date()): Promise<void> {
  await forEachWorkspace("stale-deals", async () => {
    const appUrl = loadConfig().APP_URL;
    for (const { deal, stageName, daysInStage } of await dealRepository.listStale(now)) {
      await notifications.notify({
        category: "deal_stale",
        userIds: [deal.ownerId ?? null, ...(deal.ownerId ? [] : await securityRepository.listAdminUserIds())],
        title: `💤 Deal „${deal.title}" stojí ve fázi ${stageName} už ${daysInStage} dní`,
        link: `${appUrl}/deals`,
        sourceId: deal.id,
      });
    }
  });
}

/** Denní digest: jeden email s nahromaděnými běžnými notifikacemi. */
export async function runDailyDigest(): Promise<void> {
  await forEachWorkspace("daily-digest", async () => {
    const res = await notifications.sendDigest();
    if (res.items) logger.info("digest odeslán", res);
  });
}

/** Doručení immediate notifikací, které selhaly / čekají (retry pás). */
export async function runDispatchPending(): Promise<void> {
  await forEachWorkspace("dispatch-pending", async () => {
    await notifications.dispatchImmediate();
  });
}

/** Všechny joby najednou (scripts/run-jobs.ts + testy). */
export async function runAllJobs(now = new Date()): Promise<void> {
  await runRecurringTasks(now);
  await runOverdueTasks(now);
  await runSlaEscalation(now);
  await runStaleDeals(now);
  await runDispatchPending();
}
