# Multi-tenancy (self-hosted → SaaS)

## Princip
`workspace_id` je ve **všech** tabulkách od migrace 0001. V self-hosted režimu existuje právě jeden
workspace, ale schéma i kód se chovají, jako by jich mohlo být mnoho. Přechod na SaaS pak není přepis jádra.

## Vrstvy izolace

1. **Aplikační (MVP, `TENANCY_MODE=single`).** `TenantScopedRepository` čte `workspace_id` z
   `tenant-context` (AsyncLocalStorage) a přidává ho do každého dotazu automaticky. Žádný repository
   nesmí obejít tuto vrstvu.
2. **Postgres RLS (SaaS, `TENANCY_MODE=multi`).** Připravené policy šablony (`USING (workspace_id = current_setting('app.workspace_id')::uuid)`)
   se zapnou feature flagem `postgresRls`. Session proměnná se nastavuje na začátku každé transakce.
   RLS je „defense in depth" — chytí i chybu v aplikaci.

## Co se změní při přechodu na SaaS
- Zapnout **signup** a `scripts/create-tenant.ts` (založení workspace + prvního admina).
- Zapnout RLS feature flag.
- **Izolace souborů**: nativní storage prefixovat `workspace_id/…`; secret store per-workspace namespace.
- **Billing** (mimo jádro — samostatný modul).
- Podrobně viz [../migration/saas-migration.md](../migration/saas-migration.md).

## Na co si dát pozor
- Cross-workspace join je vždy chyba → composite FK a indexy vždy zahrnují `workspace_id`.
- Globální číselníky (svátkové kalendáře) jsou buď per-workspace, nebo výslovně sdílené read-only.
