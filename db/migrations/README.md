# Migrace

Generované Drizzle Kit (`npm run db:generate`) ze schémat v `src/modules/**/*.entity.ts`, spouští `scripts/migrate.ts`.

## Pořadí (dle ADR [../../docs/architecture/data-model.md](../../docs/architecture/data-model.md))

| # | Soubor | Obsah |
|---|---|---|
| 0001 | `tenancy_users_roles` | Workspace, User, Role, user_role, AuditLog |
| 0002 | `crm_core` | Organization, Contact, ContactRole, PipelineStage, Deal, Tag/Tagging, CustomFieldDefinition |
| 0003 | `delivery_sla_timeline` | Project, ProjectPhase, Task, Activity, TimelineEvent, SLAPolicy, SLATracker, Document, DocumentVersion, Reminder, NotificationPreference |
| 0004 | `integrations_import` | Integration, IntegrationConnection, ImportJob, ProjectTemplate, TaskTemplate, outbox, workflow_runs, erasure_tombstone |

## Konvence (vynucené v každé migraci)
- `workspace_id NOT NULL` ve všech tabulkách; složené indexy začínají `workspace_id`.
- Unikátní indexy partial: `… WHERE deleted_at IS NULL`.
- CHECK constrainty: polymorfní `entity_type`, `document.kind=secret_ref ⇒ external_url IS NULL`,
  `task type≠internal ⇒ project_id OR organization_id`, `contact_role project_id XOR deal_id`.
- Unique: `project.deal_id`, `(recurrence_parent_id, due_at)`, `timeline (source_type, source_id, event_type)`.
- GIN indexy na `custom_fields` u Organization/Contact/Deal/Project/Task.
- RLS policy šablony (zakomentované; zapnou se v SaaS přes feature flag).
