# Migrace — strategie importu

**Rozsah MVP:** obecný **CSV import framework** (klienti, kontakty, dealy) s mapováním sloupců a **dry-run**.
Konkrétní zdrojový systém nebyl upřesněn → framework je zdrojově neutrální; mapping se doplní podle exportu.

## Pořadí importu (kvůli vazbám)
1. **Organizations** (dedupe: `name` + doména z `website`).
2. **Contacts** (dedupe: `email`; napojení na Organization přes doménu / název).
3. **Deals** (napojení na Organization; volitelně `primary_contact`).
4. (Projekty typicky nemigrují — zakládají se čerstvě, případně ručně.)

## Proces (`ImportJob`)
```
uploaded → mapping → dry_run_done → running → completed | failed
```
1. **Upload** CSV (`file_storage_key`).
2. **Mapping** (`mapping jsonb`: `{ "Company":"organizations.name", "Web":"organizations.website" }` + transformace).
3. **Dry-run** — zvaliduje všechny řádky proti zod schématům + custom field definicím, spočítá
   `stats {rows_total, created, updated, skipped, errors}`, chybné řádky do `error_report_key` (NDJSON).
   **Nic nezapíše.**
4. **Commit** — po schválení; `duplicate_strategy`: `skip | update | create`.

## Bezpečnostní pravidla
- Mapping **odmítne** namapovat sloupec na secret pole (viz [../security/secrets.md](../security/secrets.md)).
- Import se auditovaně loguje (`audit_log(import_executed)`) — jen commit, ne dry-run.
- PII sloupce vyžadují `legal_basis` (default `legitimate_interest`).

Detail mapování viz [csv-mapping.md](csv-mapping.md); ukázková data v [../../examples/csv](../../examples/csv).
