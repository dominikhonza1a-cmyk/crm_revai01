import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { db, closeDb } from "@/shared/db";

/**
 * ROLLBACK importu z Notionu — smaže PŘESNĚ to, co import vytvořil (ID z rollback souboru).
 * Ručně přidané záznamy zůstávají. Spuštění:
 *   npx tsx --env-file=.env scripts/import/notion-rollback.ts scripts/import/rollback-notion-2026-07-09.json
 */
(async () => {
  const file = process.argv[2];
  if (!file) { console.error("Použití: … notion-rollback.ts <rollback.json>"); process.exit(1); }
  const rb = JSON.parse(readFileSync(file, "utf8")) as Record<string, string[]> & { batch: string };
  const conn = db();
  const list = (ids: string[]) => ids.length ? ids.map((i) => `'${i}'`).join(",") : "'00000000-0000-0000-0000-000000000000'";
  const del = async (label: string, q: string) => {
    const res = await conn.execute(sql.raw(q));
    console.log(`${label}: ${(res as unknown as { count?: number }).count ?? 0}`);
  };

  await del("notifikace", `DELETE FROM notification_outbox WHERE source_id IN (${list([...rb.tasks ?? [], ...rb.deals ?? []])})`);
  await del("sla_trackery", `DELETE FROM sla_tracker WHERE entity_id IN (${list([...rb.tasks ?? [], ...rb.deals ?? []])})`);
  await del("timeline (z aktivit importu)", `DELETE FROM timeline_event WHERE source_id IN (${list([...rb.activities ?? [], ...rb.deals ?? [], ...rb.tasks ?? []])}) OR entity_id IN (${list([...rb.orgs ?? [], ...rb.deals ?? []])})`);
  await del("aktivity", `DELETE FROM activity WHERE id IN (${list(rb.activities ?? [])})`);
  await del("úkoly", `DELETE FROM task WHERE id IN (${list(rb.tasks ?? [])})`);
  await del("tagging", `DELETE FROM tagging WHERE entity_id IN (${list([...rb.orgs ?? [], ...rb.deals ?? [], ...rb.ideas ?? []])})`);
  await del("contact_role", `DELETE FROM contact_role WHERE contact_id IN (${list(rb.contacts ?? [])}) OR organization_id IN (${list(rb.orgs ?? [])}) OR deal_id IN (${list(rb.deals ?? [])})`);
  await del("kontakty", `DELETE FROM contact WHERE id IN (${list(rb.contacts ?? [])})`);
  await del("dealy", `DELETE FROM deal WHERE id IN (${list(rb.deals ?? [])})`);
  await del("dokumenty", `DELETE FROM document WHERE entity_id IN (${list([...rb.orgs ?? [], ...rb.ideas ?? []])})`);
  await del("klienti", `DELETE FROM organization WHERE id IN (${list(rb.orgs ?? [])})`);
  await del("nápady", `DELETE FROM idea WHERE id IN (${list(rb.ideas ?? [])})`);
  console.log(`Rollback dávky ${rb.batch} hotov.`);
  await closeDb();
})().catch(async (e) => { console.error("CHYBA:", e?.message ?? e); await closeDb(); process.exit(1); });
