-- 0003_delivery_core — projekty, fáze, šablony, aktivity, timeline
-- Konvence viz db/migrations/README.md. Won deal → projekt draft ze šablony (W2); timeline agreguje události.

-- ── ProjectTemplate + TaskTemplate ──────────────────────────────────────
create table if not exists project_template (
  id               uuid primary key,
  workspace_id     uuid not null references workspace(id),
  key              text not null,
  name             text not null,
  project_type     text not null,                 -- chatbot_voicebot | process_automation | custom_ai
  engagement_type  text not null,                 -- one_off | retainer
  default_sla_tier text,
  phases           jsonb not null default '[]'::jsonb,
  is_default       boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid
);
create unique index if not exists project_template_ws_key_uq on project_template (workspace_id, key);

create table if not exists task_template (
  id                    uuid primary key,
  workspace_id          uuid not null references workspace(id),
  project_template_id   uuid not null references project_template(id),
  phase_key             text not null,
  title                 text not null,
  description           text,
  default_assignee_role text,                      -- sales | pm | dev | support
  offset_days           integer not null default 0,
  estimate_minutes      integer,
  recurrence_rule       text,
  position              integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid
);
create index if not exists task_template_tpl_idx on task_template (project_template_id);

-- ── Project (sub-karta klienta) ─────────────────────────────────────────
create table if not exists project (
  id                       uuid primary key,
  workspace_id             uuid not null references workspace(id),
  organization_id          uuid not null references organization(id),
  deal_id                  uuid references deal(id),        -- unique (idempotence Won→Project)
  template_id              uuid references project_template(id),
  name                     text not null,
  code                     text,
  project_type             text not null,
  engagement_type          text not null,                  -- one_off | retainer
  status                   text not null default 'draft',  -- draft | active | on_hold | closed
  current_phase_id         uuid,                            -- bez FK (cyklus s project_phase)
  owner_id                 uuid references app_user(id),
  start_date               date,
  end_date                 date,
  budget_minor             bigint,
  retainer_fee_minor       bigint,
  retainer_period          text,
  retainer_hours_included  numeric,
  delivery_sla_policy_id   uuid,
  custom_fields            jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid, deleted_at timestamptz
);
create unique index if not exists project_deal_uq on project (deal_id) where deal_id is not null;
create index if not exists project_org_idx on project (workspace_id, organization_id) where deleted_at is null;
create index if not exists project_cf_gin on project using gin (custom_fields);

-- ── ProjectPhase (snapshot ze šablony) ──────────────────────────────────
create table if not exists project_phase (
  id            uuid primary key,
  workspace_id  uuid not null references workspace(id),
  project_id    uuid not null references project(id),
  key           text not null,                     -- kickoff | discovery | build | test_uat | deploy | hypercare | ongoing | closed
  name          text not null,
  position      integer not null,
  status        text not null default 'pending',   -- pending | active | done | skipped
  due_date      date,
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid
);
create index if not exists project_phase_proj_idx on project_phase (project_id, position);

-- ── Activity (lidská akce, mutable) ─────────────────────────────────────
create table if not exists activity (
  id                uuid primary key,
  workspace_id      uuid not null references workspace(id),
  type              text not null,                 -- call | meeting | email | note | demo | task_note
  subject           text,
  body              text,
  direction         text,                          -- inbound | outbound
  status            text not null default 'done',  -- planned | done | canceled
  owner_id          uuid references app_user(id),
  scheduled_at      timestamptz,
  completed_at      timestamptz,
  duration_minutes  integer,
  entity_type       text not null,                 -- organization | contact | deal | project | task
  entity_id         uuid not null,
  organization_id   uuid,                          -- denorm (org timeline, GDPR)
  contact_id        uuid,
  email_message_id  text,
  email_thread_id   text,
  email_metadata    jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid, deleted_at timestamptz,
  constraint activity_entity_chk check (entity_type in ('organization','contact','deal','project','task'))
);
create index if not exists activity_entity_idx on activity (workspace_id, entity_type, entity_id) where deleted_at is null;
create index if not exists activity_upcoming_idx on activity (workspace_id, owner_id, scheduled_at) where status = 'planned';

-- ── TimelineEvent (append-only, agregovaná timeline) ────────────────────
create table if not exists timeline_event (
  id              uuid primary key,
  workspace_id    uuid not null references workspace(id),
  entity_type     text not null,                   -- organization | contact | deal | project | task
  entity_id       uuid not null,
  organization_id uuid,                             -- denorm — org timeline bez fan-outu
  event_type      text not null,
  occurred_at     timestamptz not null default now(),
  actor_type      text not null default 'system',  -- user | system | integration
  actor_id        uuid,
  source_type     text,                             -- activity | task | deal | project | document | sla_tracker | integration_event
  source_id       uuid,
  title           text not null,
  payload         jsonb,
  constraint timeline_entity_chk check (entity_type in ('organization','contact','deal','project','task'))
);
create unique index if not exists timeline_source_uq on timeline_event (source_type, source_id, event_type) where source_id is not null;
create index if not exists timeline_org_idx on timeline_event (workspace_id, organization_id, occurred_at desc);
create index if not exists timeline_entity_idx on timeline_event (workspace_id, entity_type, entity_id, occurred_at desc);
