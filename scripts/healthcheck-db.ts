import { eq, and, isNull, sql } from "drizzle-orm";
import { db, closeDb } from "@/shared/db";
import { workspaces, appUsers, roles, userRoles } from "@/modules/security/security.entity";
import { integrationConnections } from "@/modules/integrations/google/google.entity";

/**
 * HEALTH CHECK — DB (read-only). Výstup: řádky "PASS|WARN|FAIL | název | detail".
 * Spuštění: npx tsx --env-file=.env scripts/healthcheck-db.ts
 */
const out = (s: "PASS" | "WARN" | "FAIL", name: string, detail = "") => console.log(`${s} | ${name} | ${detail}`);

(async () => {
  const conn = db();
  const q = async (t: string) => Number(((await conn.execute(sql.raw(`SELECT count(*)::int AS c FROM ${t}`))) as unknown as { c: number }[])[0]?.c ?? -1);

  const ws = await conn.select().from(workspaces);
  out(ws.length === 1 ? "PASS" : "FAIL", "workspace", `${ws.length}× (očekáván 1: ${ws[0]?.name})`);

  const users = await conn.select({ email: appUsers.email, status: appUsers.status }).from(appUsers).where(isNull(appUsers.anonymizedAt));
  const expected = ["info@automatizace-ai.cz", "dominikhonza1a@gmail.com", "d.valter@automatizace-ai.cz", "j.rehberger@automatizace-ai.cz"];
  const missing = expected.filter((e) => !users.some((u) => u.email === e));
  out(missing.length === 0 ? "PASS" : "WARN", "uživatelé", `${users.length} účtů: ${users.map((u) => `${u.email}(${u.status})`).join(", ")}${missing.length ? ` | CHYBÍ: ${missing}` : ""}`);

  const roleRows = await conn.select({ key: roles.key }).from(roles);
  out(roleRows.length === 5 ? "PASS" : "FAIL", "role", roleRows.map((r) => r.key).join(","));

  const adminCount = (await conn.select().from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(eq(roles.key, "admin"))).length;
  out(adminCount >= 2 ? "PASS" : "WARN", "admini", `${adminCount}× admin role`);

  const stages = await q("pipeline_stage");
  out(stages >= 6 ? "PASS" : "FAIL", "pipeline stages", `${stages}`);
  const tiers = await q("sla_policy");
  out(tiers >= 1 ? "PASS" : "WARN", "SLA policy", `${tiers}`);
  const templates = await q("project_template");
  out(templates >= 3 ? "PASS" : "WARN", "šablony projektů", `${templates}`);
  const tags = await q("tag");
  out(tags > 0 ? "PASS" : "WARN", "seed štítky", `${tags}`);

  // od importu 2026-07-09 DB drží ostrá data — jen informativní počty
  for (const t of ["organization", "contact", "deal", "project", "task", "timeline_event", "idea"]) {
    out("PASS", `data ${t}`, `${await q(t)} řádků`);
  }
  for (const t of ["sla_tracker", "notification_outbox"]) {
    const c = await q(t);
    out(c < 100 ? "PASS" : "WARN", `fronta ${t}`, `${c} řádků`);
  }

  const google = await conn.select({ email: integrationConnections.externalEmail, status: integrationConnections.status, lastSyncedAt: integrationConnections.lastSyncedAt })
    .from(integrationConnections).where(and(eq(integrationConnections.provider, "google"), eq(integrationConnections.status, "active")));
  out(google.length >= 1 ? "PASS" : "WARN", "Google připojení", google.map((g) => `${g.email} (sync: ${g.lastSyncedAt ?? "zatím ne"})`).join("; ") || "žádné");

  const mig = Number(((await conn.execute(sql.raw(`SELECT count(*)::int AS c FROM _migrations`))) as unknown as { c: number }[])[0]?.c ?? -1).valueOf();
  out(mig >= 10 ? "PASS" : "WARN", "migrace", `${mig} aplikováno`);

  await closeDb();
})().catch(async (e) => { out("FAIL", "db-health", String((e as Error)?.message ?? e)); await closeDb(); process.exit(1); });
