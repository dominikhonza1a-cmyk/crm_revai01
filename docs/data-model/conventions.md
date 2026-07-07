# Datové konvence a klíčová rozhodnutí

## Primární klíče a časy
- `id uuid` = **UUIDv7** (časově řaditelné → vhodné do indexů, žádné hot-page při insertech).
- Všechny časy `timestamptz` ukládané v **UTC**. Timezone se aplikuje až při zobrazení/výpočtu (SLA).
- Peníze: `amount_minor bigint` + `currency char(3)`. **Nikdy float.**

## Soft delete
Provozní entity (Organization, Contact, Deal, Project, Task, Activity, Document, Tag) mají
`deleted_at timestamptz NULL`. ORM aplikuje default scope `deleted_at IS NULL`; **všechny unique indexy jsou
partial** (`… WHERE deleted_at IS NULL`) — jinak by smazaný záznam blokoval znovuzaložení. Reporting a GDPR
joby jsou jediné, které explicitně čtou i smazané. `AuditLog` a `TimelineEvent` soft delete **nemají** (append-only).

## Polymorfní vazby — rozhodnutí: `entity_type` + `entity_id`
Pro TimelineEvent, Tagging, Document, Reminder a AuditLog používáme `entity_type` (text s CHECK constraintem
na povolené hodnoty) + `entity_id uuid`. Alternativu join-tabulek zamítáme: 4 polymorfní subsystémy × ~6
hostitelů = ~24 tabulek by rozbilo princip „nezahltit".

Ztrátu DB referenční integrity kompenzují **tři mechanismy, které scaffold má od začátku**:
1. **CHECK constraint** na množinu povolených `entity_type`.
2. **Centrální `EntityDeletionService`** — jediné místo, které maže/anonymizuje závislé polymorfní řádky.
   Nikdy nemazat entitu přímým `DELETE` mimo tuto službu.
3. **Noční orphan sweep** job s alertem (najde sirotky, kdyby某 cesta obešla službu).

Výjimka — **exclusive-arc** (více nullable FK + CHECK) použijeme jen tam, kde je množina cílů malá a fixní:
to je jedině `ContactRole` (`project_id` XOR `deal_id`).

## Kde JSONB stačí / nestačí
**Stačí:** custom field values, SLA `targets`/`escalation_rules`/`business_hours`, TimelineEvent `payload`,
ImportJob `mapping`, ProjectTemplate `phases`, Role `permissions`. Tato data se nefiltrují v seznamech denně.
**Nestačí (musí být sloupec):** cokoli, podle čeho se filtruje/řadí v denních pohledech — `stage`, `status`,
`due_at`, `assignee_id`, `priority`, `occurred_at`.

## Enumy vs. číselníky
- **Řádky (mění se za provozu, bez migrace):** `PipelineStage`, `ProjectTemplate`, `SLAPolicy`, `Tag`.
- **Enumy (pevná doménová logika, změna = migrace záměrně):** `status`, `type`, `priority`, `kind`, `event_type`.

## Multi-tenant kázeň
`workspace_id NOT NULL` všude od migrace 0001; **složené indexy začínají `workspace_id`**; RLS policy šablony
připravené, v self-hosted vypnuté (viz [multi-tenancy.md](multi-tenancy.md)). Code-review pravidlo: každý dotaz
filtruje `workspace_id` (v praxi zajišťuje `TenantScopedRepository`, ne ruční WHERE).

## Idempotence (proti duplikátům)
- `project.deal_id UNIQUE` + transakce se `SELECT … FOR UPDATE` → Won→Project nikdy nevytvoří dva projekty.
- TimelineEvent unique `(source_type, source_id, event_type)` → žádný dvojitý zápis.
- Recurrence generator unique `(recurrence_parent_id, due_at)`.
- Notifikace dedup klíč `(user, event_category, source_id, den)`.
- SLA eskalace: `escalation_level` inkrement → krok se nespustí dvakrát.
