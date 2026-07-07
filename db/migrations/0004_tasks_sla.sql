-- 0004_tasks_sla — tasky (delivery + support tickety), SLA politiky a trackery
-- Support ticket = task type=support. Recurrence master přes recurrence_rule; unique (recurrence_parent_id, due_at).

-- ── SLAPolicy ───────────────────────────────────────────────────────────
create table if not exists sla_policy (
  id                 uuid primary key,
  workspace_id       uuid not null references workspace(id),
  name               text not null,
  applies_to         text not null,                 -- support | delivery | sales_followup
  tier               text,                          -- basic | standard | premium (jen support)
  targets            jsonb not null default '{}'::jsonb,
  business_hours     jsonb,
  use_business_hours boolean not null default true,
  escalation_rules   jsonb not null default '[]'::jsonb,
  is_default         boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid
);
create index if not exists sla_policy_applies_idx on sla_policy (workspace_id, applies_to);

-- ── Task (delivery task / support ticket / sales follow-up / interní) ────
create table if not exists task (
  id                    uuid primary key,
  workspace_id          uuid not null references workspace(id),
  project_id            uuid references project(id),
  organization_id       uuid references organization(id),
  phase_id              uuid references project_phase(id),
  type                  text not null default 'delivery',   -- delivery | support | sales_followup | internal
  title                 text not null,
  description           text,
  status                text not null default 'todo',       -- todo | in_progress | waiting_on_client | blocked | done | canceled
  priority              text not null default 'p3',         -- p1..p4
  assignee_id           uuid references app_user(id),
  due_at                timestamptz,
  estimate_minutes      integer,
  spent_minutes         integer,
  -- support ticket (NULL u jiných typů)
  reporter_contact_id   uuid references contact(id),
  channel               text,                                -- email | chat | phone | portal
  first_responded_at    timestamptz,
  resolved_at           timestamptz,
  -- recurrence (jen master)
  recurrence_rule       text,
  recurrence_parent_id  uuid,
  recurrence_until      date,
  custom_fields         jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid, deleted_at timestamptz,
  constraint task_host_chk check (type = 'internal' or project_id is not null or organization_id is not null)
);
create index if not exists task_assignee_idx on task (workspace_id, assignee_id, status) where deleted_at is null;
create index if not exists task_project_idx on task (workspace_id, project_id) where deleted_at is null;
create index if not exists task_support_idx on task (workspace_id, type, status) where deleted_at is null;
create unique index if not exists task_recurrence_uq on task (recurrence_parent_id, due_at) where recurrence_parent_id is not null;
create index if not exists task_cf_gin on task using gin (custom_fields);

-- ── SLATracker (běžící instance jedné SLA metriky nad jedním záznamem) ───
create table if not exists sla_tracker (
  id                uuid primary key,
  workspace_id      uuid not null references workspace(id),
  sla_policy_id     uuid not null references sla_policy(id),
  entity_type       text not null,                 -- task | deal
  entity_id         uuid not null,
  metric            text not null,                 -- first_response | resolution | due_date | followup
  started_at        timestamptz not null default now(),
  due_at            timestamptz not null,
  paused_at         timestamptz,
  paused_total_ms   bigint not null default 0,
  satisfied_at      timestamptz,
  breached_at       timestamptz,
  status            text not null default 'running',  -- running | paused | met | breached | canceled
  escalation_level  integer not null default 0,
  last_escalated_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid
);
create index if not exists sla_tracker_entity_idx on sla_tracker (workspace_id, entity_type, entity_id);
create index if not exists sla_tracker_running_idx on sla_tracker (workspace_id, status) where status in ('running','paused');
