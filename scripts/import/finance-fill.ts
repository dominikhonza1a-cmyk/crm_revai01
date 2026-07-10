import { randomUUID } from "node:crypto";
import { eq, and, ilike } from "drizzle-orm";
import { db, closeDb } from "@/shared/db";
import { workspaces } from "@/modules/security/security.entity";
import { organizations } from "@/modules/organizations/organization.entity";
import { projects } from "@/modules/projects/project.entity";
import { ideas } from "@/modules/ideas/idea.entity";

/**
 * Založení projektů uzavřených klientů s financemi dle zadání uživatele (2026-07-09).
 * Platby mají orientační datum importu (přesná data lze upravit v UI).
 */
const TODAY = "2026-07-09";
const P = (name: string, org: string, type: string, engagement: "retainer" | "one_off",
  priceKc: number, paidKc: number, payNote: string, monthlyKc: number | null, retainerActive: boolean) =>
  ({ name, org, type, engagement, priceKc, paidKc, payNote, monthlyKc, retainerActive });

const PROJECTS = [
  P("AI chatbot", "Náskok", "chatbot_voicebot", "retainer", 9900, 9900, "zaplaceno", 1490, true),
  P("AI chatbot", "1chirurgie", "chatbot_voicebot", "retainer", 9900, 9900, "zaplaceno", 1490, true),
  P("Hlasový asistent", "AgeCentrum", "chatbot_voicebot", "retainer", 29900, 29900, "zaplaceno", 7490, true),
  P("Custom AI agent", "AgeCentrum", "custom_ai", "retainer", 48900, 14670, "záloha (doplatek po dodání)", 4090, false),
  P("Voice AI asistent", "Royal Golf Beroun", "chatbot_voicebot", "retainer", 39670, 39670, "zaplaceno", 8900, true),
  P("Web + měsíční správa", "Lukáš Kutý", "custom_ai", "retainer", 18900, 6000, "částečná platba — dluh 12 900 Kč", 1490, true),
  P("Interní chatbot pro úpravu dokumentů", "Škofin", "chatbot_voicebot", "one_off", 180000, 180000, "zaplaceno", null, false),
];

(async () => {
  const conn = db();
  const ws = (await conn.select().from(workspaces).limit(1))[0]!;
  const created: string[] = [];

  for (const pr of PROJECTS) {
    const org = (await conn.select({ id: organizations.id }).from(organizations)
      .where(and(eq(organizations.workspaceId, ws.id), ilike(organizations.name, pr.org))).limit(1))[0];
    if (!org) { console.log(`⚠️ klient nenalezen: ${pr.org}`); continue; }
    const id = randomUUID();
    await conn.insert(projects).values({
      id, workspaceId: ws.id, organizationId: org.id,
      name: pr.name, projectType: pr.type, engagementType: pr.engagement, status: "active",
      priceMinor: BigInt(pr.priceKc * 100),
      monthlyAmountMinor: pr.monthlyKc != null ? BigInt(pr.monthlyKc * 100) : null,
      retainerActive: pr.retainerActive,
      payments: [{ amountMinor: pr.paidKc * 100, date: TODAY, note: pr.payNote }],
      customFields: { import_batch: "finance-2026-07-09" },
    });
    created.push(id);
    console.log(`✓ ${pr.org}: ${pr.name} — cena ${pr.priceKc}, zaplaceno ${pr.paidKc}${pr.monthlyKc ? `, retainer ${pr.monthlyKc}/měs (${pr.retainerActive ? "BĚŽÍ" : "zatím neběží"})` : ""}`);
  }

  // NOVÉ LEADY vyřešeno (lost/nic) → nápad smazat
  const del = await conn.delete(ideas).where(ilike(ideas.title, "NOVÉ LEADY%"));
  console.log(`NOVÉ LEADY nápad smazán (${(del as unknown as { count?: number }).count ?? "?"})`);
  console.log(`\nProjektů založeno: ${created.length}`);
  await closeDb();
})().catch(async (e) => { console.error("CHYBA:", e?.message ?? e); await closeDb(); process.exit(1); });
