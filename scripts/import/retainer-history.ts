import { eq, and, ilike } from "drizzle-orm";
import { db, closeDb } from "@/shared/db";
import { workspaces } from "@/modules/security/security.entity";
import { organizations } from "@/modules/organizations/organization.entity";
import { projects } from "@/modules/projects/project.entity";

/**
 * Zpětné doplnění měsíčních retainer plateb dle zadání uživatele (2026-07-10):
 * Náskok 11 měs., 1chirurgie 11 měs., Royal Golf Beroun 7 měs., AgeCentrum 9 měs.
 * Platby se datují k 1. dni měsíce, poslední = červenec 2026.
 */
const FILL = [
  { org: "Náskok", project: "AI chatbot", months: 11, monthlyKc: 1490 },
  { org: "1chirurgie", project: "AI chatbot", months: 11, monthlyKc: 1490 },
  { org: "Royal Golf Beroun", project: "Voice AI asistent", months: 7, monthlyKc: 8900 },
  { org: "AgeCentrum", project: "Hlasový asistent", months: 9, monthlyKc: 7490 },
];

(async () => {
  const conn = db();
  const ws = (await conn.select().from(workspaces).limit(1))[0]!;
  let added = 0, addedKc = 0;

  for (const f of FILL) {
    const org = (await conn.select({ id: organizations.id }).from(organizations)
      .where(and(eq(organizations.workspaceId, ws.id), ilike(organizations.name, f.org))).limit(1))[0];
    if (!org) { console.log(`⚠️ klient nenalezen: ${f.org}`); continue; }
    const prj = (await conn.select().from(projects)
      .where(and(eq(projects.workspaceId, ws.id), eq(projects.organizationId, org.id), eq(projects.name, f.project))).limit(1))[0];
    if (!prj) { console.log(`⚠️ projekt nenalezen: ${f.org} / ${f.project}`); continue; }

    const existing = (prj.payments as { amountMinor: number; date: string; note?: string }[]) ?? [];
    // ochrana proti dvojímu spuštění
    if (existing.some((p) => p.note?.startsWith("retainer "))) { console.log(`↷ ${f.org}: retainer platby už doplněné`); continue; }

    const newPayments = [];
    for (let i = f.months - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(2026, 6 - i, 1));   // poslední = 2026-07-01, zpětně
      const label = `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
      newPayments.push({ amountMinor: f.monthlyKc * 100, date: d.toISOString().slice(0, 10), note: `retainer ${label}` });
    }
    await conn.update(projects).set({ payments: [...existing, ...newPayments], updatedAt: new Date() })
      .where(eq(projects.id, prj.id));
    added += f.months; addedKc += f.months * f.monthlyKc;
    console.log(`✓ ${f.org}: +${f.months} plateb à ${f.monthlyKc} Kč (${(f.months * f.monthlyKc).toLocaleString("cs-CZ")} Kč)`);
  }
  console.log(`\nCelkem doplněno ${added} plateb = ${addedKc.toLocaleString("cs-CZ")} Kč`);
  await closeDb();
})().catch(async (e) => { console.error("CHYBA:", e?.message ?? e); await closeDb(); process.exit(1); });
