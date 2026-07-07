# 11. Scaffold — soubory, účel a rozhraní

## Konvence modulu (`src/modules/<name>/`)
Každý modul má stejnou sadu souborů. Referenční plná implementace: `deals` a `projects`.

| Soubor | Účel / odpovědnost |
|---|---|
| `*.types.ts` | DTO typy modulu (`CreateInput`, `UpdateInput`, `ListFilter`, view-modely). Odvozeno ze zod (`z.infer`), žádná logika. |
| `*.entity.ts` | Drizzle table (vždy `workspace_id`, `created_at`, `updated_at`, `deleted_at`) + mapper DB↔doména. |
| `*.validation.ts` | Zod schémata create/update/query + validace custom fields. Jediný zdroj pravdy pro API i CSV import. |
| `*.repository.ts` | **Interface** `XxxRepository` + Drizzle impl. Dědí `TenantScopedRepository` (auto `workspace_id`). Jediné místo se SQL. |
| `*.service.ts` | Use-casy (`winDeal`, `advancePhase`, `resolveTicket`). Volá policies, repository, publikuje eventy, zapisuje audit. Žádný HTTP/UI. |
| `*.workflow.ts` | Subscriby na eventy jiných modulů + scheduled hooks. Deklaruje, akce deleguje na service. |
| `*.router.ts` | tRPC router: validace → service. Procedury `<module>.<action>`. |
| `index.ts` | Barrel + `registerModule()` (zapojí router a workflow subscriby). |

### Modulově specifická rozšíření
- **organizations**: `organization.entity.ts` (+ `health_status`, `owner_id`); sub-karty projektů přes projects modul.
- **contacts**: `contact-role.entity.ts`, masking PII v service dle role.
- **deals**: `pipeline-stage.entity.ts`; `deal.service.moveStage()` hlídané `deal-stage.policy`; emit `deal.won`.
- **projects**: `project-template.service.ts` (instanciace: fáze + tasky), `project-phase.entity.ts`.
- **tasks**: `recurrence.ts` (RRULE-lite), pole pro ticket (`channel`, `first_responded_at`, `resolved_at`), SLATracker hooky.
- **activities**: `activity.service.ts` = jediný zapisovač timeline (volaný ze services i workflow engine).
- **documents**: `document.entity.ts` (`kind`), `document-version.entity.ts`; storage přes `StoragePort`.
- **integrations**: `integration-connection.entity.ts`, `provider.registry.ts`, `webhook-handler.ts`, `email-sync.service.ts`.
- **reporting**: `widget-definition.ts` (query + drill-down), `dashboard-layout.entity.ts`, `reporting.service.ts` (read-only agregace).
- **security**: `user.entity.ts`, `role.entity.ts`, `api-key.entity.ts`; permission policy v `api/middleware`.

## `src/domain` — čisté jádro (zero deps)
- `ids.ts` — branded typy (`TenantId`, `OrganizationId`…) proti záměně ID.
- `enums.ts` — `ProjectType`, `EngagementType`, `TaskStatus`, `Priority`, `DealOutcome`, `NotificationSeverity`…
- `money.ts` — `Money { amountMinor, currency }` a operace (žádný float).
- `entities/*` — čisté TS typy entit (bez Drizzle/zod) — kontrakt mezi vrstvami.
- `events.ts` — diskriminovaná unie `DomainEvent` (`deal.won`, `task.overdue`, `ticket.sla_at_risk`, `project.phase_changed`…).
- `policies/*` — čisté funkce: povolené přechody stage/phase, výpočet SLA deadline & breach-risk, další výskyt recurrence, `can(role, action, resource)`.
- `errors.ts` — `DomainError` hierarchie (`InvalidTransition`, `PermissionDenied`, `NotFound`).

## `src/adapters` — port (interface) + adaptéry
| Port | Interface | Adaptéry |
|---|---|---|
| Email | `email/email.port.ts` (`send`, `fetchInbox`, `watchMailbox`) | `console`, `smtp`, `gmail`, `outlook`*(placeholder)* |
| Chat | `chat/chat.port.ts` (`postMessage`) | `console`, `webhook` (Slack/Teams/Discord incoming) |
| Storage | `storage/storage.port.ts` (`put`, `getSignedUrl`, `delete`) + `link-resolver` | `local`, `s3`*, `gdrive-link`, `sharepoint-link`* |
| Git | `git/git.port.ts` | `github`*(placeholder)* |
| Calendar | `calendar/calendar.port.ts` | `google-calendar`*(placeholder)* |

`*` = placeholder (interface od začátku, implementace ve fázi 3). Services závisí **jen na portech**.

## `src/api`
- `trpc.ts` (init, Context: `workspaceId`, `user`), `root.ts` (appRouter skládá module routery).
- `middleware/`: `auth → tenant-context → permission → audit` (mutace se auto-auditují).
- `rest/`: `openapi.ts` (generovaná spec ze zod), `api-keys.ts`. REST fasáda `/api/v1/*` pro n8n/Make/Zapier.

## `src/ui`
- `layout/` — AppShell, Sidebar (6 položek), Topbar, CommandPalette.
- `components/` — DataTable, KanbanBoard (deals i tasks), TimelineFeed, WidgetGrid (dnd-kit), CustomFieldsForm, TagPicker, CsvImportWizard, SlaBadge, EntityTabs.
- `pages/` — dashboard, clients (list + detail s taby), deals (pipeline kanban), projects (detail s taby), tasks (My Work / board / ticket queue), settings (10 sekcí).
- `hooks/` — `useTenant`, `usePermission`, `useWidgetLayout`.

## `src/workflows`
`dsl.ts` (`defineWorkflow` typy), `engine.ts` (vyhodnocení + idempotence + `workflow_runs`), `registry.ts`
(per-tenant enable/disable), `actions/` (katalog akcí), `definitions/` (6 vestavěných workflowů — viz [../workflows/catalog.md](../workflows/catalog.md)).

## `src/shared`
`db.ts` (Drizzle client + tx helper), `tenant-context.ts` (AsyncLocalStorage), `event-bus.ts` (publish→outbox),
`scheduler.ts` (pg-boss wrapper), `notifications/` (service + digest job + React Email šablony),
`audit/` (`audited()` helper), `custom-fields/`, `tags/`, `csv-import/` (`ImportDefinition<T>` + mappery), `gdpr/`
(retention job, export, erasure), `logger.ts` (s redakcí secretů), `result.ts`, `pagination.ts`, `dates.ts`.
