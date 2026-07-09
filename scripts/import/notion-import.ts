import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { bootstrap } from "@/api/bootstrap";
import { runWithTenant } from "@/shared";
import { db, closeDb } from "@/shared/db";
import { workspaces, appUsers } from "@/modules/security/security.entity";
import { organizationService } from "@/modules/organizations";
import { contactService } from "@/modules/contacts";
import { dealService } from "@/modules/deals";
import { dealRepository } from "@/modules/deals/deal.repository";
import { taskService } from "@/modules/tasks";
import { activityService } from "@/modules/activities/activity.service";
import { ideas } from "@/modules/ideas/idea.entity";
import { asId, type WorkspaceId, type UserId } from "@/domain/ids";

/**
 * IMPORT Z NOTIONU (jednorázový) — podle instrukcí: Lost přeskočit, estimated value a account
 * owner ignorovat, poznámky z podstránek klientů → timeline (jen souhrn + poslední info),
 * TASKS/cookbooky/podstránky → Nápady, „Malota poznámky" → AgeCentrum.
 * Vše značené batch tagem; ID zapsaná do rollback souboru (vratné jedním příkazem).
 * Secrety (API klíče, hesla) se do CRM NIKDY nepřenáší — filtr níže.
 */
const BATCH = "notion-2026-07-09";
const SCRATCH = "/private/tmp/claude-501/-Users-dominikvalter-Claude-Cursor-Claude-revai-CRM/f6f0a0b6-4b8e-4a9f-84f2-09b792427e6a/scratchpad/notion";
const ROLLBACK_FILE = `scripts/import/rollback-${BATCH}.json`;

type Node = { type: string; text: string; id: string; urls?: string[]; children?: Node[] };
const clientsDump = JSON.parse(readFileSync(`${SCRATCH}/clients.json`, "utf8")) as { clients: { id: string; url: string; props: Record<string, string | null> }[] };
const clientPages = JSON.parse(readFileSync(`${SCRATCH}/client-pages.json`, "utf8")) as Record<string, Node[]>;
const mainPage = JSON.parse(readFileSync(`${SCRATCH}/main-page.json`, "utf8")) as Node[];

// ── bezpečnostní filtr: řádky se secrety se NEimportují ──────────────────
const SECRET_RE = /(sk-ant-|sk-[a-z0-9]{20,}|api[_ -]?key|tr-[A-Za-z0-9]{25,}|password|heslo\s*[:=])/i;
const clean = (s: string) => SECRET_RE.test(s) ? "(řádek se secretem vynechán — patří do trezoru, ne do CRM)" : s;

/** Zploštění bloků na čitelné řádky; podstránky jen titulkem, kód zkráceně. */
function flatten(nodes: Node[] | undefined, depth = 0, maxDepth = 2): string[] {
  const out: string[] = [];
  for (const n of nodes ?? []) {
    if (depth > maxDepth) break;
    const t = n.text?.trim();
    if (n.type === "child_page") { if (t) out.push(`${"  ".repeat(depth)}📄 ${t}`); continue; }
    if (n.type === "child_database" || n.type === "image" || n.type === "file") continue;
    if (t) {
      const pfx = n.type === "bulleted_list_item" ? "• " : n.type === "numbered_list_item" ? "· " : n.type.startsWith("heading") ? "## " : n.type === "to_do" ? "" : "";
      const text = n.type === "code" ? t.slice(0, 200) + (t.length > 200 ? "…" : "") : t;
      out.push(`${"  ".repeat(depth)}${pfx}${clean(text)}`);
    }
    out.push(...flatten(n.children, depth + 1, maxDepth));
  }
  return out;
}
const summarize = (nodes: Node[] | undefined, maxLines = 20, maxChars = 1600) => {
  const lines = flatten(nodes);
  let text = lines.slice(0, maxLines).join("\n");
  if (text.length > maxChars) text = text.slice(0, maxChars) + "…";
  if (lines.length > maxLines) text += `\n… (zkráceno, celkem ${lines.length} řádků — plná historie v Notionu)`;
  return text;
};

// ── mapování klientů (Lost už je odfiltrovaný) ────────────────────────────
const STAGE_MAP: Record<string, string> = { "Nový kontakt": "Lead", "Před schůzkou": "Qualified", "Rozpracované": "Discovery" };
/** Ručně ověřené kontakty (jméno z poznámek má přednost před heuristikou). */
const CONTACT_OVERRIDE: Record<string, { first: string; last: string; email?: string }> = {
  "Autokomplex Menšík": { first: "Alexandr", last: "Beneš" },
  "GolferIS": { first: "Tomáš", last: "Vrbický" },
  "CS Apparel": { first: "David", last: "Šandera" },
  "Hotel Botanique": { first: "Tereza", last: "Šůra" },
  "Nemocnice TGM Hodonín": { first: "Zlatuše", last: "Krůgová" },
  "Hilton Praha": { first: "Markéta", last: "Strnadová", email: "Marketa.Strnadova@hilton.com" },
  "Škofin": { first: "Petra", last: "Helešová" },
  "Royal Golf Beroun": { first: "", last: "Matějček" },
  "AgeCentrum": { first: "", last: "Malota" },
  "1chirurgie": { first: "", last: "Kraus" },
  "Lukáš Kutý": { first: "Lukáš", last: "Kutý" },
};
const WEB_OVERRIDE: Record<string, string> = {
  "Lukáš Kutý": "www.graficky-webpark.cz",
  "GolferIS": "www.golferis.cz",
  "Nemocnice TGM Hodonín": "www.nemho.cz",
  "Hilton Praha": "www.hilton.com/cs/hotels/prghitw-hilton-prague/",
};
const DEAL_TITLE: Record<string, string> = {
  "Autokomplex Menšík": "Hlasový asistent — demo posláno",
  "GolferIS": "Hlasový asistent pro golfové rezorty (API TeeTime)",
  "CS Apparel": "Hlasový asistent + integrace",
  "Hotel Botanique": "Hlasový asistent + interní agent",
  "Nemocnice TGM Hodonín": "Hlasový asistent (odloženo na H2 2026)",
  "Partizan Hotel": "Hlasový asistent — demo posláno",
  "Hilton Praha": "Hlasový asistent (Synergy MMS)",
};

const extractWeb = (name: string, company: string | null, email: string | null): string | undefined => {
  if (WEB_OVERRIDE[name]) return WEB_OVERRIDE[name];
  const m = company?.match(/(https?:\/\/\S+|www\.\S+|\b[\w-]+\.(cz|sk|com|eu|ai)\b\S*)/i);
  if (m) return m[0].replace(/[),]$/, "");
  const dom = email?.split("@")[1];
  const generic = ["gmail.com", "post.cz", "seznam.cz", "email.cz", "ctcenter.cz", "hilton.com"];
  return dom && !generic.includes(dom.toLowerCase()) ? `www.${dom}` : undefined;
};

(async () => {
  bootstrap();
  const conn = db();
  const ws = (await conn.select().from(workspaces).limit(1))[0]!;
  const owner = (await conn.select().from(appUsers).where(eq(appUsers.email, "d.valter@automatizace-ai.cz")).limit(1))[0]
    ?? (await conn.select().from(appUsers).limit(1))[0]!;
  const ctx = { workspaceId: asId<WorkspaceId>(ws.id), userId: asId<UserId>(owner.id), requestId: "notion-import" };

  const rollback = { batch: BATCH, orgs: [] as string[], contacts: [] as string[], deals: [] as string[], activities: [] as string[], tasks: [] as string[], ideas: [] as string[] };

  await runWithTenant(ctx, async () => {
    const stages = await dealRepository.listStages();
    const stageByName = new Map(stages.map((s) => [s.name, s.id]));

    const keep = clientsDump.clients.filter((c) => c.props.Status !== "Lost");
    console.log(`\n═══ KLIENTI (${keep.length}) ═══`);

    for (const c of keep) {
      const p = c.props;
      const name = (p.Name ?? "?").trim();
      const status = p.Status ?? "";
      const web = extractWeb(name, p.Company ?? null, p.Email ?? null);

      const org = await organizationService.create(ctx, {
        name, website: web,
        lifecycleStage: status === "Uzavřený" ? "active_client" : "prospect",
        customFields: { import_batch: BATCH, notion_url: c.url },
      });
      rollback.orgs.push(org.id);

      // kontakt (override → jinak z e-mailu)
      const ov = CONTACT_OVERRIDE[name];
      const email = ov?.email ?? p.Email ?? undefined;
      if (ov || email) {
        const local = (email ?? "").split("@")[0] ?? "";
        const first = ov?.first || (local.includes(".") ? capitalize(local.split(".")[0]!) : capitalize(local) || "Kontakt");
        const last = ov?.last || (local.includes(".") ? capitalize(local.split(".")[1] ?? "") : `(${name})`);
        const contact = await contactService.create(ctx, {
          organizationId: org.id, firstName: first || "—", lastName: last || "—",
          email: email || undefined, phone: p.Phone ?? undefined,
        });
        rollback.contacts.push(contact.id);
      }

      // deal pro rozpracované stavy (Uzavřený = klient bez otevřeného dealu)
      const stageName = STAGE_MAP[status];
      if (stageName && stageByName.has(stageName)) {
        const deal = await dealService.create(ctx, {
          organizationId: org.id,
          title: DEAL_TITLE[name] ?? `${name} — poptávka AI řešení`,
          pipelineStageId: stageByName.get(stageName)!,
          projectTypeHint: "chatbot_voicebot",
        });
        rollback.deals.push(deal.id);
      }

      // poznámky z Notion podstránky → timeline note (souhrn + odkaz)
      const blocks = clientPages[c.id];
      const summary = summarize(blocks);
      if (summary.trim()) {
        const a = await activityService.logActivity(ctx, {
          type: "note", entityType: "organization", entityId: org.id,
          subject: "Poznámky z Notionu (import)",
          body: `${summary}\n\n🔗 Plné poznámky: ${c.url}`,
          completedAt: new Date().toISOString(),
        });
        rollback.activities.push(a.activityId);
      }
      console.log(`✓ ${name} [${status}] web=${web ?? "—"} deal=${stageName ?? "—"}`);
    }

    // ── úkoly „ty poslední" z klientských poznámek ─────────────────────────
    console.log(`\n═══ ÚKOLY ═══`);
    const orgIdByName = new Map<string, string>();
    for (let i = 0; i < keep.length; i++) orgIdByName.set((keep[i]!.props.Name ?? "").trim(), rollback.orgs[i]!);
    const TASKS: { org: string; title: string; desc?: string }[] = [
      { org: "Royal Golf Beroun", title: "Dodělat asistenta dle info z recepce (14.10.) a předat", desc: "Poslat souhrn a doladit body; reference přislíbena 25.9." },
      { org: "Náskok", title: "Pohlídat fakturaci — základní balíček zaplacen do 1.1., domluvit pokračování" },
      { org: "AgeCentrum", title: "Podepsat servisní smlouvu + nastavit pravidelné faktury", desc: "Zároveň plán snižování provozních nákladů (T-mobile/ústředna)." },
      { org: "Lukáš Kutý", title: "Vymáhat doplatek za web — zaplaceno 6 000 z 18 900 Kč" },
    ];
    for (const t of TASKS) {
      const orgId = orgIdByName.get(t.org);
      if (!orgId) continue;
      const created = await taskService.create(ctx, { type: "internal", title: t.title, organizationId: orgId, description: t.desc, priority: "p2" });
      rollback.tasks.push(created.taskId);
      console.log(`✓ úkol: ${t.title.slice(0, 60)}…`);
    }

    // ── Nápady z hlavní stránky ────────────────────────────────────────────
    console.log(`\n═══ NÁPADY ═══`);
    const byTitle = (title: string) => mainPage.find((n) => n.type === "child_page" && n.text === title);
    const NOTION_BASE = "https://www.notion.so/";
    const link = (n?: Node) => n ? `\n\n🔗 V Notionu: ${NOTION_BASE}${n.id.replace(/-/g, "")}` : "";

    const looseBullets = mainPage.filter((n) => ["bulleted_list_item", "numbered_list_item"].includes(n.type) && n.text.trim());
    const ideaDefs: { title: string; content: string }[] = [];

    const tasksPage = byTitle("TASKS");
    ideaDefs.push({ title: "Náměty a odkazy (TASKS z Notionu)", content: [summarize(tasksPage?.children, 40, 3000), "\n— Volné odrážky z hlavní stránky —", ...looseBullets.map((b) => `• ${clean(b.text)}`)].join("\n") + link(tasksPage) });

    for (const t of ["Jarvis", "Realtime prompting guide", "Postup INSTANTLY", "Dejv discord", "Cursor", "WEB 3D", "NOVÉ LEADY"]) {
      const node = byTitle(t);
      if (node) ideaDefs.push({ title: t === "NOVÉ LEADY" ? "NOVÉ LEADY (z Notionu — probrat)" : t, content: summarize(node.children, 35, 3000) + link(node) });
    }
    const cookbook = byTitle("CLAUDE CODE COOKBOOK");
    if (cookbook) {
      const chapters = (cookbook.children ?? []).filter((n) => n.type === "child_page").map((n) => `• ${n.text}`).join("\n");
      ideaDefs.push({ title: "CLAUDE CODE COOKBOOK", content: `Kapitoly:\n${chapters}\n\n(Obsah zůstává v Notionu — odkaz níže.)${link(cookbook)}` });
    }
    for (const d of ideaDefs) {
      const id = randomUUID();
      await conn.insert(ideas).values({ id, workspaceId: ws.id, title: d.title, content: d.content, createdBy: owner.id });
      rollback.ideas.push(id);
      console.log(`✓ nápad: ${d.title}`);
    }

    // ── Malota poznámky → AgeCentrum timeline ─────────────────────────────
    const malota = byTitle("Malota poznámky");
    const ageId = orgIdByName.get("AgeCentrum");
    if (malota && ageId) {
      const a = await activityService.logActivity(ctx, {
        type: "note", entityType: "organization", entityId: ageId,
        subject: "Malota — byznysový souhrn modelu a předání (z Notionu)",
        body: summarize(malota.children, 45, 3500) + link(malota),
        completedAt: new Date().toISOString(),
      });
      rollback.activities.push(a.activityId);
      console.log("✓ Malota poznámky → AgeCentrum");
    }
  });

  writeFileSync(ROLLBACK_FILE, JSON.stringify(rollback, null, 2));
  console.log(`\n═══ HOTOVO ═══\nklientů: ${rollback.orgs.length}, kontaktů: ${rollback.contacts.length}, dealů: ${rollback.deals.length}, poznámek: ${rollback.activities.length}, úkolů: ${rollback.tasks.length}, nápadů: ${rollback.ideas.length}`);
  console.log(`Rollback: ${ROLLBACK_FILE}`);
  await closeDb();
})().catch(async (e) => { console.error("CHYBA:", e); await closeDb(); process.exit(1); });

function capitalize(s: string) { return s ? s[0]!.toUpperCase() + s.slice(1) : s; }
