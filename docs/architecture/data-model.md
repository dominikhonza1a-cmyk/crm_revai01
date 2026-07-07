# ADR — Datový model (živý dokument)

Tento soubor je „single source of truth" pro datová rozhodnutí. Detailní popis entit je v
[../data-model/entities.md](../data-model/entities.md), diagram v [../data-model/erd.md](../data-model/erd.md).

## Přijatá rozhodnutí (ADR log)

1. **UUIDv7 PK, timestamptz v UTC, peníze jako `amount_minor bigint`.** — viz [conventions](../data-model/conventions.md).
2. **Polymorfie přes `entity_type + entity_id`** (ne join-tabulky) s CHECK + `EntityDeletionService` + orphan sweep.
3. **Custom fields: definice v tabulce, hodnoty v JSONB** (ne EAV). — viz [custom-fields](../data-model/custom-fields.md).
4. **Support ticket = `Task type=support`** (ne samostatná entita). — viz [sla](../workflows/sla.md).
5. **Prospekt i klient = jedna `Organization`** rozlišená `lifecycle_stage`.
6. **`workspace_id` všude od migrace 0001**; RLS připravené, v self-hosted vypnuté.
7. **Activity (mutable, lidská akce) vs. TimelineEvent (append-only, systémový)** — ostře oddělené.
8. **Šablony se kopírují (snapshot)**, projekt nedrží živou referenci na `ProjectTemplate`.
9. **Soft delete** u provozních entit + partial unique indexy; audit/timeline append-only.
10. **Idempotence** přes unique klíče (Won→Project `deal_id UNIQUE`, timeline `source`, recurrence, notifikace).

## Pořadí migrací
- `0001_tenancy_users_roles` — Workspace, User, Role, user_role, AuditLog.
- `0002_crm_core` — Organization, Contact, ContactRole, PipelineStage, Deal, Tag/Tagging, CustomFieldDefinition.
- `0003_delivery_sla_timeline` — Project, ProjectPhase, Task, Activity, TimelineEvent, SLAPolicy, SLATracker, Document, DocumentVersion, Reminder, NotificationPreference.
- `0004_integrations_import` — Integration, IntegrationConnection, ImportJob, ProjectTemplate, TaskTemplate, outbox, workflow_runs, erasure_tombstone.

## Rizika a pasti (a jak jim scaffold předchází)
Kompletní seznam 14 rizik (EAV výkon, polymorfie, recurrence expanze, SLA timezone, soft-delete leakage,
Won→Project idempotence, timeline objem, multi-tenant kázeň, GDPR vs. zálohy, drift šablon, enumy vs. číselníky,
audit růst, notifikační spam, zatékání secretů) je udržován v [conventions.md](../data-model/conventions.md) a
u příslušných modulů. Každé riziko má konkrétní mechanismus v kódu (CHECK, unique index, centrální služba, test).
