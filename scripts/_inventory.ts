import { ilike, or, inArray, sql } from "drizzle-orm";
import { db, closeDb } from "@/shared/db";
import { organizations } from "@/modules/organizations/organization.entity";
import { contacts } from "@/modules/contacts/contact.entity";
import { deals } from "@/modules/deals/deal.entity";
import { projects } from "@/modules/projects/project.entity";
import { tasks } from "@/modules/tasks/task.entity";

(async () => {
  const conn = db();
  const orgs = await conn.select({ id: organizations.id, name: organizations.name }).from(organizations).where(ilike(organizations.name, "e2e%"));
  const orgIds = orgs.map((o) => o.id);
  console.log("KLIENTI E2E:", orgs.map((o) => o.name).join(" | ") || "(žádní)");

  const allOrgs = await conn.select({ name: organizations.name }).from(organizations);
  console.log("VŠICHNI klienti v DB:", allOrgs.map((o) => o.name).join(" | "));

  const dls = await conn.select({ id: deals.id, title: deals.title }).from(deals)
    .where(orgIds.length ? or(ilike(deals.title, "e2e%"), inArray(deals.organizationId, orgIds)) : ilike(deals.title, "e2e%"));
  console.log("DEALY:", dls.map((d) => d.title).join(" | ") || "(žádné)");

  const prjs = await conn.select({ id: projects.id, name: projects.name, cf: projects.customFields }).from(projects)
    .where(orgIds.length ? or(ilike(projects.name, "e2e%"), inArray(projects.organizationId, orgIds)) : ilike(projects.name, "e2e%"));
  console.log("PROJEKTY:", prjs.map((p) => `${p.name}${(p.cf as Record<string,unknown>)?.git_repo ? " [git:" + (p.cf as Record<string,string>).git_repo + "]" : ""}`).join(" | ") || "(žádné)");

  const allPrj = await conn.select({ name: projects.name, cf: projects.customFields }).from(projects);
  console.log("VŠECHNY projekty:", allPrj.map((p) => `${p.name}${(p.cf as Record<string,unknown>)?.git_repo ? " [git]" : ""}`).join(" | "));

  const tsk = await conn.select({ id: tasks.id, title: tasks.title }).from(tasks)
    .where(orgIds.length ? or(ilike(tasks.title, "e2e%"), inArray(tasks.organizationId, orgIds)) : ilike(tasks.title, "e2e%"));
  console.log("ÚKOLY/TICKETY:", tsk.map((t) => t.title).join(" | ") || "(žádné)");

  const cts = orgIds.length ? await conn.select({ first: contacts.firstName, last: contacts.lastName }).from(contacts).where(inArray(contacts.organizationId, orgIds)) : [];
  console.log("KONTAKTY pod E2E klienty:", cts.map((c) => `${c.first} ${c.last}`).join(" | ") || "(žádné)");

  const tomb = await conn.execute(sql`select count(*)::int as c from erasure_tombstone`);
  console.log("GDPR tombstones (testovací):", (tomb as unknown as { c: number }[])[0]?.c ?? 0);
  await closeDb();
})().catch(async (e) => { console.error(e); await closeDb(); process.exit(1); });
