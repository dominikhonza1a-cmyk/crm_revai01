import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { eq, and, isNull } from "drizzle-orm";
import { db, closeDb } from "@/shared/db";
import { workspaces } from "@/modules/security/security.entity";
import { ideas } from "@/modules/ideas/idea.entity";

/** Doimport podstránek nápadů z Notionu (obsah, ne jen názvy). Idempotentní dle (rodič, titulek). */
const SCRATCH = "/private/tmp/claude-501/-Users-dominikvalter-Claude-Cursor-Claude-revai-CRM/f6f0a0b6-4b8e-4a9f-84f2-09b792427e6a/scratchpad/notion";
const SECRET_RE = /(sk-ant-|sk-[a-z0-9]{20,}|api[_ -]?key|tr-[A-Za-z0-9]{25,}|password|heslo\s*[:=])/i;

(async () => {
  const subs = JSON.parse(readFileSync(`${SCRATCH}/subpages.json`, "utf8")) as { parent: string; title: string; content: string }[];
  const conn = db();
  const ws = (await conn.select().from(workspaces).limit(1))[0]!;

  // dedup dle (parent, title) — cookbook je v Notionu dvakrát
  const seen = new Set<string>();
  const uniq = subs.filter((s) => { const k = `${s.parent}|${s.title}`; if (seen.has(k)) return false; seen.add(k); return true; });

  let created = 0, skipped = 0;
  for (const s of uniq) {
    const parent = (await conn.select({ id: ideas.id }).from(ideas)
      .where(and(eq(ideas.workspaceId, ws.id), eq(ideas.title, s.parent), isNull(ideas.deletedAt), isNull(ideas.parentId))).limit(1))[0];
    if (!parent) { console.log(`⚠️ rodič nenalezen: ${s.parent}`); continue; }
    const dup = (await conn.select({ id: ideas.id }).from(ideas)
      .where(and(eq(ideas.workspaceId, ws.id), eq(ideas.parentId, parent.id), eq(ideas.title, s.title), isNull(ideas.deletedAt))).limit(1))[0];
    if (dup) { skipped++; continue; }
    const content = s.content.split("\n").map((l) => SECRET_RE.test(l) ? "(řádek se secretem vynechán)" : l).join("\n");
    await conn.insert(ideas).values({ id: randomUUID(), workspaceId: ws.id, title: s.title.trim() || "Podstránka", content, parentId: parent.id });
    created++;
  }
  console.log(`Podstránek: ${created} vytvořeno, ${skipped} přeskočeno (duplicitní)`);
  // přehled per rodič
  const roots = await conn.select({ id: ideas.id, title: ideas.title }).from(ideas)
    .where(and(eq(ideas.workspaceId, ws.id), isNull(ideas.parentId), isNull(ideas.deletedAt)));
  for (const r of roots) {
    const kids = await conn.select({ id: ideas.id }).from(ideas).where(and(eq(ideas.parentId, r.id), isNull(ideas.deletedAt)));
    if (kids.length) console.log(`  ${r.title}: ${kids.length} podstránek`);
  }
  await closeDb();
})().catch(async (e) => { console.error("CHYBA:", e?.message ?? e); await closeDb(); process.exit(1); });
