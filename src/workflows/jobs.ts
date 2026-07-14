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
import { projects } from "@/modules/projects/project.entity";
import { and, eq, isNull } from "drizzle-orm";
import { activityService } from "@/modules/activities/activity.service";
import { notifications } from "@/shared/notifications/notification.service";
import { reportingService } from "@/modules/reporting/reporting.service";
import { resolveEmailProvider } from "@/adapters/email";
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
/**
 * Automatické účtování retainerů: 1. den měsíce (nebo kdykoli poté) přidá běžícím
 * retainerům platbu "retainer MM/RRRR" za aktuální měsíc. Idempotentní dle poznámky —
 * vypnutí přepínače „Retainer běží" účtování zastaví.
 */
export async function runRetainerBilling(now = new Date()): Promise<{ billed: number }> {
  let billed = 0;
  await forEachWorkspace("retainer-billing", async () => {
    const rows = await db().select().from(projects)
      .where(and(isNull(projects.deletedAt), eq(projects.engagementType, "retainer"), eq(projects.retainerActive, true)));
    const label = `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
    const monthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    for (const p of rows) {
      if (p.monthlyAmountMinor == null || p.monthlyAmountMinor <= 0n) continue;
      const payments = (p.payments as { amountMinor: number; date: string; note?: string }[]) ?? [];
      if (payments.some((x) => x.note === `retainer ${label}`)) continue;
      await db().update(projects).set({
        payments: [...payments, { amountMinor: Number(p.monthlyAmountMinor), date: monthDate, note: `retainer ${label}` }],
        updatedAt: now,
      }).where(eq(projects.id, p.id));
      billed++;
    }
  });
  if (billed) logger.info("retainer billing", { billed });
  return { billed };
}

export async function runDailyDigest(): Promise<void> {
  await forEachWorkspace("daily-digest", async () => {
    const res = await notifications.sendDigest();
    if (res.items) logger.info("digest odeslán", res);
  });
  await runMorningSummary();
}

type SummaryTask = { title: string; dueAt: Date | null; priority: string; type: string; description: string | null; clientName: string | null; projectName: string | null };
const PRIORITY_LABEL: Record<string, string> = { p1: "Kritická", p2: "Vysoká", p3: "Střední", p4: "Nízká" };

/** Sestaví jeden e-mail ranního souhrnu (značkový vizuál, u každého úkolu klient + stručný detail). */
export function renderMorningSummary(fullName: string, tasks: SummaryTask[], now: Date): { subject: string; html: string } {
  const day = now.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" });
  const overdue = tasks.filter((t) => t.dueAt && new Date(t.dueAt) < now).length;
  const firstName = escapeHtml((fullName || "").split(" ")[0] || "");

  const rows = tasks.map((t) => {
    const over = !!(t.dueAt && new Date(t.dueAt) < now);
    const due = t.dueAt
      ? `<span style="display:inline-block;font-size:12px;font-weight:600;color:${over ? "#dc2626" : "#0f9d6b"}">${over ? "⚠ po termínu · " : ""}do ${new Date(t.dueAt).toLocaleDateString("cs-CZ")}</span>`
      : `<span style="font-size:12px;color:#9aa4b2">bez termínu</span>`;
    const client = t.clientName
      ? `<span style="display:inline-block;padding:1px 8px;border-radius:999px;background:#0f9d6b1a;color:#0f9d6b;font-size:12px;font-weight:600">${escapeHtml(t.clientName)}</span>`
      : `<span style="display:inline-block;padding:1px 8px;border-radius:999px;background:#6b72801a;color:#98a2b3;font-size:12px">bez klienta</span>`;
    const project = t.projectName ? `<span style="font-size:12px;color:#98a2b3">${escapeHtml(t.projectName)}</span>` : "";
    const detail = t.description ? `<div style="margin-top:4px;font-size:13px;color:#667085;line-height:1.4">${escapeHtml(t.description.replace(/\s+/g, " ").trim()).slice(0, 140)}</div>` : "";
    const meta = [client, project, `<span style="font-size:12px;color:#98a2b3">${PRIORITY_LABEL[t.priority] ?? t.priority.toUpperCase()}</span>`, due].filter(Boolean).join('<span style="color:#d0d5dd"> · </span>');
    return `<tr><td style="padding:14px 18px;border-top:1px solid #eaecf0">
      <div style="font-size:15px;font-weight:600;color:#101828">${escapeHtml(t.title)}</div>
      <div style="margin-top:6px">${meta}</div>${detail}
    </td></tr>`;
  }).join("");

  const html = `<div style="margin:0;padding:24px 12px;background:#f2f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eaecf0">
      <tr><td style="background:#0b1220;padding:20px 22px">
        <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#34d399;font-weight:700">revai CRM</div>
        <div style="margin-top:6px;font-size:22px;font-weight:700;color:#ffffff">Dobré ráno${firstName ? `, ${firstName}` : ""} 👋</div>
        <div style="margin-top:2px;font-size:13px;color:#94a3b8;text-transform:capitalize">${day}</div>
      </td></tr>
      <tr><td style="padding:18px 22px 6px">
        <div style="font-size:14px;color:#475467">Tvoje otevřené úkoly: <b style="color:#101828">${tasks.length}</b>${overdue ? ` · <span style="color:#dc2626;font-weight:600">${overdue} po termínu</span>` : ""}</div>
      </td></tr>
      <tr><td style="padding:6px 4px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
      <tr><td style="padding:16px 22px 22px">
        <a href="${loadConfig().APP_URL}/tasks" style="display:inline-block;background:#34d399;color:#08110c;font-weight:700;font-size:14px;text-decoration:none;padding:10px 18px;border-radius:10px">Otevřít úkoly →</a>
        <div style="margin-top:14px;font-size:11px;color:#98a2b3">Posíláš si sám sobě z revai CRM · jen tvé přiřazené úkoly.</div>
      </td></tr>
    </table></div>`;

  return { subject: `revai CRM — ranní souhrn (${tasks.length} úkolů${overdue ? `, ${overdue} po termínu` : ""})`, html };
}

/**
 * Ranní souhrn „co je potřeba udělat" — PERSONALIZOVANÝ e-mail: každý člen týmu dostane
 * jen SVÉ otevřené úkoly (přiřazené jemu). Uživatelé bez otevřených úkolů e-mail nedostávají
 * (tím pádem ani seed/servisní účty typu info@ nebo nepoužívané účty se 0 úkoly nespamujeme).
 * onlyEmail: když je zadán, pošle jen tomuto příjemci (pro ruční přeposlání).
 */
export async function runMorningSummary(now = new Date(), onlyEmail?: string): Promise<{ sent: number }> {
  let sent = 0;
  await forEachWorkspace("morning-summary", async () => {
    const users = await securityRepository.listUsersWithRoles();
    let recipients = users.filter((u) => u.status === "active" && u.email);
    if (onlyEmail) recipients = recipients.filter((u) => u.email.toLowerCase() === onlyEmail.toLowerCase());
    if (!recipients.length) return;

    const email = resolveEmailProvider();
    for (const u of recipients) {
      const myTasks = await reportingService.myOpenTasks(u.id, now);
      if (!myTasks.length) continue; // žádné úkoly → žádný e-mail (nespamovat prázdné/servisní účty)
      const { subject, html } = renderMorningSummary(u.fullName, myTasks, now);
      try { await email.send({ to: [u.email], subject, html }); sent++; }
      catch (err) { logger.warn("ranní souhrn selhal", { user: u.email, err: String(err) }); }
    }
  });
  if (sent) logger.info("ranní souhrn odeslán", { sent });
  return { sent };
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/** Doručení immediate notifikací, které selhaly / čekají (retry pás). */
export async function runDispatchPending(): Promise<void> {
  await forEachWorkspace("dispatch-pending", async () => {
    await notifications.dispatchImmediate();
  });
}

/** Všechny joby najednou (scripts/run-jobs.ts + testy). */
export async function runAllJobs(now = new Date()): Promise<void> {
  await runRetainerBilling(now);
  await runRecurringTasks(now);
  await runOverdueTasks(now);
  await runSlaEscalation(now);
  await runStaleDeals(now);
  await runDispatchPending();
}
