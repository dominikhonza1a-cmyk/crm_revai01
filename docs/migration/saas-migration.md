# Migrace — self-hosted → SaaS

Datový model je SaaS-ready od začátku (`workspace_id` všude). Přechod je konfigurace + několik nových flow,
ne přepis jádra.

## Co se zapne / přidá
1. **`TENANCY_MODE=multi`** + `features.postgresRls=true` → RLS policy (viz [../data-model/multi-tenancy.md](../data-model/multi-tenancy.md)).
2. **Signup + create-tenant flow** (`scripts/create-tenant.ts` → UI): založí workspace + prvního admina, naseeduje role/stages/šablony.
3. **Izolace souborů**: nativní storage prefix `workspace_id/`; secret store per-workspace namespace.
4. **Billing modul** (mimo jádro): plán, limity, fakturace.
5. **Per-tenant limity** (`config` → DB): import rows, počet uživatelů, storage.
6. **Onboarding** nového tenantu: průvodce (pipeline, tým, integrace).

## Co zůstává beze změny
Doménové jádro, moduly, workflow engine, permission model, audit, GDPR — vše už počítá s `workspace_id`.

## Rizika přechodu
- **Cross-tenant leak** → RLS jako pojistka nad aplikačním filtrem; test na izolaci v `tests/integration`.
- **Sdílené číselníky** (svátkové kalendáře) → rozhodnout per-workspace vs. sdílené read-only.
- **Migrace stávajícího single-tenant** → jeden existující workspace se stane prvním tenantem (žádná data-migrace).
