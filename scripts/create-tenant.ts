/**
 * SaaS: založí nový workspace + prvního admina + naseeduje role/stages/šablony/SLA.
 * V self-hosted režimu se použije jednou (výchozí workspace). Viz docs/migration/saas-migration.md.
 */
export {}; // označí soubor jako modul (vlastní scope)

async function main(): Promise<void> {
  const [name, adminEmail] = process.argv.slice(2);
  if (!name || !adminEmail) throw new Error("Použití: create-tenant <name> <adminEmail>");
  // 1) insert workspace; 2) seed rolí; 3) vytvoř admina + user_role(admin); 4) seed stages/sla/tags/šablon
  throw new Error("create-tenant: implementace fáze 3.");
}
main().catch((e) => { console.error(e); process.exit(1); });
