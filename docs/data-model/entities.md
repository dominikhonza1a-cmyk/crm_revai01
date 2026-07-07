# 2. Datový model

PostgreSQL 15+, UUIDv7 primární klíče, časy `timestamptz` v UTC. Konvence a rozhodnutí o polymorfii
viz [conventions.md](conventions.md); custom fields viz [custom-fields.md](custom-fields.md).

## Společné konvence (neopakuje se u entit)

Každá tabulka (kromě `workspace`) má: `id uuid PK`, `workspace_id uuid NOT NULL`, `created_at`,
`updated_at`, `created_by`, `updated_by`. Provozní entity mají `deleted_at timestamptz NULL` (soft delete;
unique indexy partial `WHERE deleted_at IS NULL`). `AuditLog` a `TimelineEvent` jsou append-only. Peníze
vždy `amount_minor bigint` + `currency char(3)`.

---

## Tenancy a identity

### Workspace
**Účel:** tenant. V self-hosted instanci právě jeden, schéma je SaaS-ready.
**Klíčová pole:** `name`, `slug (unique)`, `default_timezone`, `default_currency`, `settings jsonb`, `data_region (later)`.
**Vazby:** 1:N na vše. **MVP.**

### User
**Účel:** člen týmu s přihlášením.
**Klíčová pole:** `email citext`, `full_name`, `status enum(invited, active, deactivated)`, `timezone`, `locale`, `avatar_url`, `last_login_at`, `anonymized_at` (GDPR — user se nikdy hard-deletuje kvůli FK v auditu).
**Vazby:** N:M `Role` přes `user_role`. **MVP.**

### Role (PermissionSet)
**Účel:** pojmenovaná sada oprávnění; 5 systémových rolí je seed.
**Klíčová pole:** `key (admin|sales|pm|dev|support)`, `name`, `is_system bool`, `permissions jsonb` (`{module: level}`), `field_policies jsonb` (`{"deal.financials":"hidden"}`), `export_permissions jsonb`.
**Vazby:** `user_role(user_id, role_id)`. Efektivní právo = max přes role. Seed: oba spolumajitelé `admin`. **MVP** (custom role later).

---

## CRM jádro

### Organization (Client)
**Účel:** firma — prospekt i klient v jedné entitě, rozlišené lifecycle stavem.
**Klíčová pole:** `name`, `legal_name`, `lifecycle_stage enum(prospect, active_client, past_client, partner)`, `website`, `country char(2)`, `city`, `employee_count_band enum(1_49, 50_199, 200_500, 500_plus)`, `industry`, `owner_id FK user`, `support_sla_policy_id FK sla_policy NULL`, `health_status enum(healthy, at_risk, churn_risk) NULL`, `billing_notes`, `source enum(referral, inbound, outbound, event, import)`, `custom_fields jsonb`.
**Vazby:** 1:N Contact, Deal, Project; N:1 SLAPolicy. **MVP.**

### Contact
**Účel:** fyzická osoba u klienta/prospekta; nositel osobních údajů (GDPR pivot).
**Klíčová pole:** `organization_id FK NULL`, `first_name`, `last_name`, `email citext`, `phone`, `job_title`, `linkedin_url`, `preferred_channel enum(email, phone, chat)`, `notes`, `consent_marketing bool`, `consent_updated_at`, `legal_basis enum(legitimate_interest, consent, contract)`, `last_activity_at` (denorm. pro retenční job), `anonymized_at`, `custom_fields jsonb`.
**Vazby:** N:1 Organization; 1:N ContactRole, Activity. **MVP.**

### ContactRole
**Účel:** role kontaktu vůči firmě a volitelně vůči projektu/dealu (u mid-market klíčové).
**Klíčová pole:** `contact_id`, `organization_id`, `project_id FK NULL`, `deal_id FK NULL` (exclusive-arc: max jedno z project/deal, CHECK), `role enum(sponsor, decision_maker, technical_contact, end_user, billing_contact, champion)`, `is_primary bool`.
**Vazby:** N:1 Contact/Organization/Project/Deal. Unique `(contact_id, organization_id, project_id, deal_id, role)`. **MVP.**

### PipelineStage
**Účel:** definice fáze sales pipeline — **řádky, ne enum** (přejmenování/přidání bez migrace).
**Klíčová pole:** `name`, `position`, `kind enum(open, won, lost)`, `probability_default`, `stale_after_days NULL` (vstup pro stale-deal reminder).
**Vazby:** 1:N Deal. Seed viz [seeds](../../db/seeds). **MVP.**

### Deal
**Účel:** obchodní příležitost.
**Klíčová pole:** `organization_id`, `primary_contact_id FK NULL`, `pipeline_stage_id`, `title`, `amount_minor NULL`, `currency`, `expected_margin_pct NULL` (field-level restricted), `probability`, `expected_close_date`, `owner_id`, `source`, `project_type_hint enum(chatbot_voicebot, process_automation, custom_ai)`, `stage_entered_at` (reset při změně stage), `last_activity_at`, `lost_reason enum(price, timing, competitor, no_response, other) NULL`, `lost_note`, `won_at/lost_at`, `created_project_id FK NULL`, `custom_fields jsonb`.
**Vazby:** N:1 Organization/PipelineStage/User; 0..1:0..1 Project. **MVP.**

---

## Delivery

### Project
**Účel:** dodávka pod klientem; víc paralelních projektů (sub-karet) na klienta.
**Klíčová pole:** `organization_id`, `deal_id FK NULL unique` (idempotence Won→Project), `template_id FK NULL`, `name`, `code` (např. ACME-CHB-01), `project_type enum(chatbot_voicebot, process_automation, custom_ai)`, `engagement_type enum(one_off, retainer)`, `status enum(draft, active, on_hold, closed)`, `current_phase_id FK NULL`, `owner_id FK user` (PM), `start_date`, `end_date NULL` (retainer: NULL), `budget_minor NULL`, `retainer_fee_minor NULL`, `retainer_period enum(monthly, quarterly) NULL`, `retainer_hours_included NULL`, `delivery_sla_policy_id FK NULL`, `custom_fields jsonb`.
**Vazby:** N:1 Organization; 0..1 Deal; 1:N ProjectPhase, Task, Document, ContactRole. **MVP.**

### ProjectPhase
**Účel:** instance fáze konkrétního projektu (**snapshot** ze šablony, ne živá reference).
**Klíčová pole:** `project_id`, `key enum(kickoff, discovery, build, test_uat, deploy, hypercare, ongoing, closed)`, `name`, `position`, `status enum(pending, active, done, skipped)`, `due_date NULL`, `started_at/completed_at`.
**Vazby:** N:1 Project. One-off: Kickoff→…→Closed; retainer: Kickoff→Ongoing. On-hold je stav Projectu. **MVP.**

### Task
**Účel:** univerzální pracovní jednotka — delivery task, **support ticket**, sales follow-up, interní úkol (záměrně jedna entita, viz [sla.md](../workflows/sla.md)).
**Klíčová pole:** `project_id FK NULL`, `organization_id FK NULL` (CHECK: aspoň jedno u type≠internal), `phase_id FK NULL`, `type enum(delivery, support, sales_followup, internal)`, `title`, `description`, `status enum(todo, in_progress, waiting_on_client, blocked, done, canceled)`, `priority enum(p1, p2, p3, p4)`, `assignee_id FK NULL`, `due_at NULL`, `estimate_minutes NULL`, `spent_minutes NULL (later)`.
Support-specifická (NULL jinde): `reporter_contact_id FK`, `channel enum(email, chat, phone, portal)`, `first_responded_at`, `resolved_at`.
Recurrence: `recurrence_rule text` (RRULE, jen master), `recurrence_parent_id FK NULL`, `recurrence_until NULL`.
**Vazby:** N:1 Project/Organization/ProjectPhase/User; self-ref recurrence; 1:N SLATracker. **MVP.**

---

## Aktivity a timeline
Rozlišení Activity vs. TimelineEvent viz [activity-vs-timeline.md](activity-vs-timeline.md).

### Activity
**Účel:** plánovatelná/vykonaná **lidská interakce** s vlastníkem.
**Klíčová pole:** `type enum(call, meeting, email, note, demo, task_note)`, `subject`, `body`, `direction enum(inbound, outbound) NULL`, `status enum(planned, done, canceled)`, `owner_id`, `scheduled_at NULL`, `completed_at NULL`, `duration_minutes NULL`, host: `entity_type enum(organization, contact, deal, project, task)` + `entity_id` + denorm `organization_id/contact_id`. Email log: `email_message_id`, `email_thread_id`, `email_metadata jsonb` (snippet, ne celé tělo).
**Vazby:** N:1 User; polymorfní host. **MVP.**

### TimelineEvent
**Účel:** imutabilní append-only záznam pro agregovanou timeline.
**Klíčová pole:** `entity_type + entity_id`, `organization_id FK NULL` (denorm — org timeline bez fan-outu), `event_type enum(activity_logged, email_received, email_sent, meeting_held, deal_stage_changed, deal_won, deal_lost, project_created, phase_changed, task_created, task_completed, task_overdue, ticket_opened, ticket_resolved, sla_breached, document_linked, git_push, webhook_received, import_completed, note_added)`, `occurred_at`, `actor_type enum(user, system, integration)`, `actor_id NULL`, `source_type/source_id NULL`, `title`, `payload jsonb`.
**Vazby:** polymorfní host. Bez updated_at/soft delete. Index `(workspace_id, organization_id, occurred_at DESC)`. **MVP.**

---

## Dokumenty

### Document
**Účel:** primárně **reference** na externí úložiště; nativní soubor i „secret reference" jsou varianty téže entity.
**Klíčová pole:** `kind enum(external_ref, native_file, secret_ref)`, `storage_provider enum(gdrive, sharepoint, url, local) NULL`, `external_url NULL`, `external_file_id NULL`, `title`, `mime_type NULL`, `doc_category enum(contract, proposal, spec, credentials_ref, deliverable, other)`, `entity_type + entity_id` (organization/deal/project/task), `current_version_id FK NULL`, `contains_pii bool`. Secret ref: `secret_location`, `secret_policy_note` + **CHECK: kind=secret_ref ⇒ external_url IS NULL**.
**Vazby:** 1:N DocumentVersion; polymorfní host. **MVP** (native upload later, tabulka od začátku).

### DocumentVersion
**Účel:** verze dokumentu.
**Klíčová pole:** `document_id`, `version_number`, `storage_key NULL` (native), `size_bytes NULL`, `checksum NULL`, `external_version_label/external_modified_at/external_modified_by NULL` (metadata u reference — verzuje externí systém), `uploaded_by`.
**Vazby:** N:1 Document. Unique `(document_id, version_number)`. **Tabulka MVP, nativní verzování later.**

---

## Integrace

### Integration
**Účel:** zapnutý typ integrace ve workspace (katalogový záznam).
**Klíčová pole:** `provider enum(gmail, outlook, slack_webhook, google_calendar, slack_app, teams, github, gitlab, zapier, make)`, `status enum(enabled, disabled, error)`, `config jsonb` (jen ne-tajná konfigurace).
**MVP:** gmail, outlook, slack_webhook. Ostatní later.

### IntegrationConnection
**Účel:** konkrétní připojený účet.
**Klíčová pole:** `integration_id`, `user_id FK NULL`, `external_account`, `credential_ref` (**odkaz do secret store — token nikdy plaintext**), `status enum(active, expired, revoked, error)`, `last_synced_at`, `last_error`, `scopes text[]`. **MVP.**

---

## Tagy a custom fields

### Tag
`name citext`, `color`; unique `(workspace_id, name) WHERE deleted_at IS NULL`. **MVP.**

### Tagging
`tag_id`, `entity_type enum(organization, contact, deal, project, task, document)`, `entity_id`; unique přes vše. **MVP.**

### CustomFieldDefinition
`entity_type`, `key` (slug, **immutable**), `label`, `field_type enum(text, number, date, boolean, select, multiselect, url, currency)`, `options jsonb NULL`, `required bool`, `position`, `archived_at`, `is_pii bool` (řídí GDPR scrub a masking). Unique `(workspace_id, entity_type, key)`. **MVP.**

### CustomFieldValue — **rozhodnutí: NE fyzická EAV tabulka**
Hodnoty žijí v `custom_fields jsonb` na hostiteli, validované proti definicím; GIN index pokryje filtr.
Detaily a zdůvodnění viz [custom-fields.md](custom-fields.md).

---

## Audit, SLA, notifikace

### AuditLog
**Účel:** append-only stopa citlivých akcí. Detail viz [audit-log.md](../security/audit-log.md).
**Klíčová pole:** `actor_id FK NULL`, `actor_type enum(user, system)`, `action enum(...)` (permission/role změny, exporty, delete, gdpr_*, deal_stage_changed, project_phase/status_changed, sla_policy_changed, sla_overridden, document_secret_ref_changed, integration_connected/revoked, import_executed, settings_changed), `entity_type NULL`, `entity_id NULL`, `changes jsonb` (diff citlivých polí), `context jsonb` (ip, ua, request_id), `created_at`. Žádný UPDATE/DELETE grant pro app roli. **MVP.**

### SLAPolicy
**Účel:** definice SLA. Sémantika viz [sla.md](../workflows/sla.md).
**Klíčová pole:** `name`, `applies_to enum(support, delivery, sales_followup)`, `tier enum(basic, standard, premium) NULL`, `targets jsonb` (`{"p1":{"first_response_min":60,"resolution_min":480},…}`), `business_hours jsonb` (timezone, days, holiday_calendar), `use_business_hours bool`, `escalation_rules jsonb`, `is_default bool`. **MVP.**

### SLATracker
**Účel:** běžící instance jedné SLA metriky nad jedním záznamem.
**Klíčová pole:** `sla_policy_id`, `entity_type enum(task, deal) + entity_id`, `metric enum(first_response, resolution, due_date, followup)`, `started_at`, `due_at` (business hours, uloženo UTC), `paused_at NULL`, `paused_total_ms bigint` (waiting_on_client staví hodiny), `satisfied_at/breached_at`, `status enum(running, paused, met, breached, canceled)`, `escalation_level int`, `last_escalated_at`. **MVP.**

### NotificationPreference
`user_id`, `event_category enum(sla_breach, sla_warning, task_assigned, task_overdue, deal_stage, deal_stale, mention, digest, import_finished)`, `channel enum(email, chat, in_app)`, `mode enum(immediate, daily_digest, off)`, `digest_hour smallint`. Unique `(user_id, event_category, channel)`. **MVP.**

### Reminder
`user_id`, `entity_type + entity_id`, `remind_at`, `message`, `source enum(manual, stale_deal_rule, followup_rule, sla_rule)`, `status enum(pending, sent, dismissed, snoozed)`, `snoozed_until`. **MVP.**

---

## Šablony a import

### ProjectTemplate
`name`, `project_type`, `engagement_type`, `phases jsonb` (`[{key,name,position,duration_days}]`), `is_default bool`. **MVP** (seed viz [templates](../../db/seeds/templates)).

### TaskTemplate
`project_template_id`, `phase_key`, `title`, `description`, `default_assignee_role enum(sales, pm, dev, support) NULL`, `offset_days int`, `estimate_minutes`, `recurrence_rule NULL`, `position`. **MVP.**

### ImportJob
`type enum(organizations, contacts, deals)`, `status enum(uploaded, mapping, dry_run_done, running, completed, failed, canceled)`, `file_storage_key`, `original_filename`, `mapping jsonb`, `options jsonb` (`{dry_run, duplicate_strategy}`), `stats jsonb`, `error_report_key`, `started_at/finished_at`. Dedupe: email (contacts), name+domain (organizations). **MVP.**

---

## Přehled MVP vs. later

| MVP | Later |
|---|---|
| Všechny entity výše jako **tabulky** | Nativní upload + nativní verzování dokumentů |
| Reference dokumenty | Plný timesheet (`spent_minutes`, time entries) |
| Email + chat webhook | Kalendář, Git, Zapier/Make integrace |
| JSONB custom fields | Samostatná `custom_field_value` (jen při cross-entity reportingu) |
| Aplikační tenant filtr | Postgres RLS |
| 5 systémových rolí | Custom role, per-projekt členství |
| Měsíční indexy timeline/audit | Partitioning by month (od ~1M řádků) |
