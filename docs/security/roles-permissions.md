# 6. Permission model

Zdroj pravdy pro seed: [../../config/permissions.json](../../config/permissions.json). Vyhodnocení běží v jedné
policy vrstvě (`src/api/middleware/permission.middleware.ts` + `domain/policies/permission.policy.ts`).

## Úrovně
`none < read < write < manage`
- **read** — vidět a filtrovat.
- **write** — create + edit (vlastních i týmových záznamů).
- **manage** — write + delete/restore, reassign, konfigurace modulu.

Efektivní právo = **maximum přes všechny role** uživatele (uživatel může mít víc rolí).

## Object-level matice (5 systémových rolí × moduly)

| Modul | admin | sales | pm | dev | support |
|---|---|---|---|---|---|
| Organizations | manage | write | write | read | read |
| Contacts | manage | write | write | read (masked) | write |
| Deals | manage | write | read | none | none |
| Projects | manage | read | manage | write | read |
| Tasks | manage | write | manage | write | write |
| Documents | manage | write | manage | write | read |
| Reporting | manage | read | read | none | read |
| Settings | manage | none | none | none | none |
| Audit log | read\* | none | none | none | none |

\* Audit log není „manage" ani pro admina — je append-only. Admin ho čte a konfiguruje retenci v Settings.

> **Poznámka k dnešnímu stavu:** oba spolumajitelé mají roli `admin`. Zbylé 4 role jsou připravené v seedu
> pro budoucí nábor — vidíte je hned, ale nikoho zatím neomezují.

## Field-level restrikce (`role.field_policies`)
`hidden` = pole se vůbec nevrátí; `masked` = vrátí se zamaskované; jinak dle běžné úrovně.

| Skupina polí | admin | sales | pm | dev | support |
|---|---|---|---|---|---|
| `deal.financials` (amount, expected_margin_pct, discount) | write | write | read | hidden | hidden |
| `project.budget` / `retainer_fee` | write | read | read | hidden | hidden |
| `contact.pii` (phone, notes, consent_*, custom `is_pii`) | write | write | read | **masked** | write |
| `document.secret_ref` (secret_location, policy) | write | none | write | read | none |

Dev vidí u kontaktu jen jméno, firemní email, job_title a roli — telefon/soukromé poznámky jsou maskované.

## Export práva
Samostatná permission per modul (`export.contacts`, `export.deals`, `export.projects`, `export.audit`).
Default: **jen admin**; sales lze explicitně zapnout `export.deals` + `export.contacts`. Každý export
(CSV i GDPR bundle) povinně zapíše `audit_log(action=export_executed, changes={module, row_count, filter})`.

## Auditované akce (minimum dle zadání + doplnění)
permission/role změny · přiřazení role · deaktivace uživatele · **všechny exporty** · soft i hard delete ·
GDPR erasure a export · **deal stage change** · **project phase/status change** · **SLA policy změna** a
manuální SLA override · změna secret reference · connect/revoke integrace · spuštění importu (ne dry-run) ·
změna settings. Detail formátu viz [audit-log.md](audit-log.md).
