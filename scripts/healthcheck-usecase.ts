import { randomUUID } from "node:crypto";
import { eq, and, ilike, inArray, sql } from "drizzle-orm";
import { bootstrap } from "@/api/bootstrap";
import { runWithTenant } from "@/shared";
import { db, closeDb } from "@/shared/db";
import { workspaces, appUsers } from "@/modules/security/security.entity";
import { organizationService } from "@/modules/organizations";
import { contactService } from "@/modules/contacts";
import { dealService } from "@/modules/deals";
import { dealRepository } from "@/modules/deals/deal.repository";
import { projects } from "@/modules/projects/project.entity";
import { projectService } from "@/modules/projects";
import { tasks, slaTrackers } from "@/modules/tasks/task.entity";
import { taskService } from "@/modules/tasks";
import { timelineEvents } from "@/modules/activities/activity.entity";
import { notificationOutbox } from "@/shared/notifications/notification.entity";
import { runSlaEscalation, runOverdueTasks } from "@/workflows/jobs";
import { dataExport } from "@/shared/gdpr/export.service";
import { ideas } from "@/modules/ideas/idea.entity";
import { tags, taggings } from "@/shared/tags/tag.entity";
import { asId, type WorkspaceId, type UserId } from "@/domain/ids";

/**
 * USE-CASE CHECK — celý byznys cyklus naostro proti živé DB. Záznamy s prefixem "HC-",
 * na konci kompletní úklid. Spouštět s EMAIL_PROVIDER=console (ať nechodí testovací e-maily):
 *   EMAIL_PROVIDER=console CHAT_PROVIDER=console npx tsx --env-file=.env scripts/healthcheck-usecase.ts
 */
const out = (s: "PASS" | "FAIL", name: string, detail = "") => console.log(`${s} | ${name} | ${detail}`);

(async () => {
  bootstrap();   // event subscribery (deal.won → projekt)
  const conn = db();
  const ws = (await conn.select().from(workspaces).limit(1))[0]!;
  const admin = (await conn.select().from(appUsers).where(eq(appUsers.workspaceId, ws.id)).limit(1))[0]!;
  const ctx = { workspaceId: asId<WorkspaceId>(ws.id), userId: asId<UserId>(admin.id), requestId: "healthcheck" };

  await runWithTenant(ctx, async () => {
    // 1) klient + kontakt
    const org = await organizationService.create(ctx, { name: "HC-Klient s.r.o.", website: "www.hc-klient-test.cz" });
    out(org.id ? "PASS" : "FAIL", "klient založen", org.id);
    const contact = await contactService.create(ctx, { organizationId: org.id, firstName: "Hana", lastName: "HC-Checková", email: "hana@hc-klient-test.cz" });
    out(contact.id ? "PASS" : "FAIL", "kontakt založen", contact.id);

    // 2) deal → celou pipeline → Won
    const deal = await dealService.create(ctx, { organizationId: org.id, title: "HC-Deal chatbot", amountMinor: 25000000n, currency: "CZK", projectTypeHint: "chatbot_voicebot" });
    out(deal.id ? "PASS" : "FAIL", "deal založen", "250 000 Kč");
    const stages = await dealRepository.listStages();
    let moved = 0;
    for (const st of stages.filter((s) => s.kind !== "lost")) {
      if (st.id === deal.pipelineStageId) continue;
      await dealService.moveStage(ctx, { dealId: deal.id, toStageId: st.id }, true);
      moved++;
    }
    out(moved >= 5 ? "PASS" : "FAIL", "pipeline průchod", `${moved} posunů až do Won`);

    // 3) Won → automaticky projekt + úkoly (W2+W3)
    const prj = (await conn.select().from(projects).where(and(eq(projects.workspaceId, ws.id), eq(projects.dealId, deal.id))))[0];
    out(prj ? "PASS" : "FAIL", "Won → projekt (automatika)", prj ? `${prj.name} (${prj.status})` : "projekt nevznikl!");
    if (prj) {
      const phases = Number(((await conn.execute(sql.raw(`SELECT count(*)::int AS c FROM project_phase WHERE project_id='${prj.id}'`))) as unknown as { c: number }[])[0]?.c);
      const provisioned = await conn.select().from(tasks).where(eq(tasks.projectId, prj.id));
      out(phases >= 6 ? "PASS" : "FAIL", "fáze projektu", `${phases}`);
      out(provisioned.length > 0 ? "PASS" : "FAIL", "úkoly ze šablony", `${provisioned.length}`);
      await projectService.changeStatus(ctx, { projectId: prj.id, toStatus: "active" });
      out("PASS", "projekt aktivován", "draft → active");
    }

    // 4) support ticket → SLA trackery
    const ticket = await taskService.create(ctx, { type: "support", title: "HC-Ticket: bot neodpovídá", organizationId: org.id, priority: "p1", channel: "portal" });
    const trackers = await conn.select().from(slaTrackers).where(and(eq(slaTrackers.entityId, ticket.taskId), eq(slaTrackers.workspaceId, ws.id)));
    out(trackers.length === 2 ? "PASS" : "FAIL", "ticket → 2 SLA trackery", trackers.map((t) => `${t.metric}:${t.status}`).join(", "));

    // 5) SLA eskalace + overdue joby (simulovaný čas +30 dní; EMAIL_PROVIDER=console → nic se neodešle ven)
    const future = new Date(Date.now() + 30 * 24 * 3600_000);
    await runSlaEscalation(future);
    await runOverdueTasks(future);
    const notif = await conn.select().from(notificationOutbox).where(and(eq(notificationOutbox.workspaceId, ws.id), ilike(notificationOutbox.title, "%hc-%")));
    out(notif.length > 0 ? "PASS" : "FAIL", "SLA/overdue → notifikace", `${notif.length} řádek v outboxu`);
    const breached = await conn.select().from(slaTrackers).where(eq(slaTrackers.entityId, ticket.taskId));
    out(breached.some((t) => t.status === "breached") ? "PASS" : "FAIL", "SLA breach detekce", breached.map((t) => t.status).join(","));

    // 6) timeline klienta se plní
    const tl = await conn.select().from(timelineEvents).where(and(eq(timelineEvents.workspaceId, ws.id), eq(timelineEvents.organizationId, org.id)));
    out(tl.length >= 5 ? "PASS" : "FAIL", "timeline klienta", `${tl.length} událostí (deal posuny, projekt, ticket…)`);

    // 7) štítek + vlastní pole (JSONB)
    const tagId = randomUUID();
    await conn.insert(tags).values({ id: tagId, workspaceId: ws.id, name: "HC-tag", color: "#34d399" });
    await conn.insert(taggings).values({ id: randomUUID(), workspaceId: ws.id, tagId, entityType: "organization", entityId: org.id }).onConflictDoNothing();
    await conn.execute(sql`UPDATE organization SET custom_fields = custom_fields || '{"hc_check":"ano"}'::jsonb WHERE id = ${org.id}`);
    const orgRow = (await conn.execute(sql`SELECT custom_fields FROM organization WHERE id = ${org.id}`) as unknown as { custom_fields: Record<string, string> }[])[0];
    out(orgRow?.custom_fields?.hc_check === "ano" ? "PASS" : "FAIL", "štítky + vlastní pole", "tag přiřazen, JSONB zapsán");

    // 8) nápad s autosave update
    const ideaId = randomUUID();
    await conn.insert(ideas).values({ id: ideaId, workspaceId: ws.id, title: "HC-Nápad", content: "v1" });
    await conn.update(ideas).set({ content: "v2 autosave" }).where(eq(ideas.id, ideaId));
    out("PASS", "nápad create+update", "autosave path");

    // 9) GDPR export kontaktu
    const bundle = await dataExport.exportContact(contact.id);
    out(bundle.bundle && Object.keys(bundle.bundle).length >= 2 ? "PASS" : "FAIL", "GDPR export", `${Object.keys(bundle.bundle).length} sekcí`);

    // ── ÚKLID (vše HC-) ──────────────────────────────────────────────
    const prjIds = prj ? [prj.id] : [];
    const taskIds = (await conn.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.workspaceId, ws.id), sql`(organization_id = ${org.id} OR ${prjIds.length ? sql`project_id = ${prjIds[0]}` : sql`false`} OR title ILIKE 'hc-%')`))).map((r) => r.id);
    const idList = (ids: string[]) => ids.length ? ids.map((i) => `'${i}'`).join(",") : "'00000000-0000-0000-0000-000000000000'";
    const all = [org.id, contact.id, deal.id, ...prjIds, ...taskIds, ideaId];
    await conn.execute(sql.raw(`DELETE FROM notification_outbox WHERE source_id IN (${idList(all)}) OR title ILIKE '%hc-%'`));
    await conn.execute(sql.raw(`DELETE FROM sla_tracker WHERE entity_id IN (${idList([...taskIds, deal.id])})`));
    await conn.execute(sql.raw(`DELETE FROM task WHERE id IN (${idList(taskIds)})`));
    await conn.execute(sql.raw(`DELETE FROM timeline_event WHERE organization_id = '${org.id}' OR entity_id IN (${idList(all)})`));
    await conn.execute(sql.raw(`DELETE FROM activity WHERE entity_id IN (${idList(all)})`));
    await conn.execute(sql.raw(`DELETE FROM tagging WHERE tag_id = '${tagId}'`));
    await conn.execute(sql.raw(`DELETE FROM tag WHERE id = '${tagId}'`));
    await conn.execute(sql.raw(`DELETE FROM contact_role WHERE contact_id = '${contact.id}' OR organization_id = '${org.id}' OR deal_id = '${deal.id}'`));
    await conn.execute(sql.raw(`DELETE FROM contact WHERE id = '${contact.id}'`));
    await conn.execute(sql.raw(`DELETE FROM project_phase WHERE project_id IN (${idList(prjIds)})`));
    await conn.execute(sql.raw(`DELETE FROM project WHERE id IN (${idList(prjIds)})`));
    await conn.execute(sql.raw(`DELETE FROM deal WHERE id = '${deal.id}'`));
    await conn.execute(sql.raw(`DELETE FROM organization WHERE id = '${org.id}'`));
    await conn.execute(sql.raw(`DELETE FROM idea WHERE id = '${ideaId}'`));

    let leftover = 0;
    for (const t of ["organization", "contact", "deal", "project", "task", "timeline_event", "sla_tracker", "notification_outbox", "idea"]) {
      leftover += Number(((await conn.execute(sql.raw(`SELECT count(*)::int AS c FROM ${t}`))) as unknown as { c: number }[])[0]?.c ?? 0);
    }
    out(leftover === 0 ? "PASS" : "FAIL", "úklid po checku", `zbývá ${leftover} řádků (očekáváno 0)`);
  });
  await closeDb();
})().catch(async (e) => { out("FAIL", "usecase", String((e as Error)?.message ?? e)); await closeDb(); process.exit(1); });
