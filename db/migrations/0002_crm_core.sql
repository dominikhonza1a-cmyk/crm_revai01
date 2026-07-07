-- 0002_crm_core — organizace (klienti), kontakty, role kontaktů, pipeline, dealy, tagy, custom fields
-- Konvence viz db/migrations/README.md a docs/data-model/conventions.md.

-- ── Organization (Klient) ───────────────────────────────────────────────
create table if not exists organization (
  id                    uuid primary key,
  workspace_id          uuid not null references workspace(id),
  name                  text not null,
  legal_name            text,
  lifecycle_stage       text not null default 'prospect',   -- prospect | active_client | past_client | partner
  website               text,
  country               char(2),
  city                  text,
  employee_band         text,                               -- 1_49 | 50_199 | 200_500 | 500_plus
  industry              text,
  owner_id              uuid references app_user(id),
  support_sla_policy_id uuid,                               -- FK doplní 0003 (sla_policy)
  health_status         text,                               -- healthy | at_risk | churn_risk
  billing_notes         text,
  source                text,                               -- referral | inbound | outbound | event | import
  custom_fields         jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by uuid, updated_by uuid,
  deleted_at            timestamptz
);
create index if not exists organization_ws_idx on organization (workspace_id) where deleted_at is null;
create index if not exists organization_cf_gin on organization using gin (custom_fields);

-- ── Contact (GDPR pivot) ────────────────────────────────────────────────
create table if not exists contact (
  id                 uuid primary key,
  workspace_id       uuid not null references workspace(id),
  organization_id    uuid references organization(id),
  first_name         text not null,
  last_name          text not null,
  email              text,
  phone              text,
  job_title          text,
  linkedin_url       text,
  preferred_channel  text,                                  -- email | phone | chat
  notes              text,
  consent_marketing  boolean not null default false,
  consent_updated_at timestamptz,
  legal_basis        text not null default 'legitimate_interest',
  last_activity_at   timestamptz,
  anonymized_at      timestamptz,
  custom_fields      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid, deleted_at timestamptz
);
create index if not exists contact_org_idx on contact (workspace_id, organization_id) where deleted_at is null;
create unique index if not exists contact_ws_email_uq on contact (workspace_id, email) where deleted_at is null and email is not null;
create index if not exists contact_cf_gin on contact using gin (custom_fields);

-- ── Pipeline stage (řádky, ne enum) ─────────────────────────────────────
create table if not exists pipeline_stage (
  id                   uuid primary key,
  workspace_id         uuid not null references workspace(id),
  name                 text not null,
  position             integer not null,
  kind                 text not null,                       -- open | won | lost
  probability_default  integer not null default 0,
  stale_after_days     integer,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid
);
create unique index if not exists pipeline_stage_ws_pos_uq on pipeline_stage (workspace_id, position);

-- ── Deal ────────────────────────────────────────────────────────────────
create table if not exists deal (
  id                   uuid primary key,
  workspace_id         uuid not null references workspace(id),
  organization_id      uuid not null references organization(id),
  primary_contact_id   uuid references contact(id),
  pipeline_stage_id    uuid not null references pipeline_stage(id),
  title                text not null,
  amount_minor         bigint,
  currency             char(3),
  expected_margin_pct  numeric,                             -- field-level restricted
  probability          integer not null default 0,
  expected_close_date  date,
  owner_id             uuid references app_user(id),
  source               text,
  project_type_hint    text,                                -- chatbot_voicebot | process_automation | custom_ai
  stage_entered_at     timestamptz not null default now(),  -- reset při změně stage → stale detekce
  last_activity_at     timestamptz,
  lost_reason          text,
  lost_note            text,
  won_at               timestamptz,
  lost_at              timestamptz,
  created_project_id   uuid,                                -- unique — idempotence Won→Project (FK doplní 0003)
  custom_fields        jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid, deleted_at timestamptz
);
create index if not exists deal_stage_idx on deal (workspace_id, pipeline_stage_id) where deleted_at is null;
create index if not exists deal_owner_idx on deal (workspace_id, owner_id) where deleted_at is null;
create unique index if not exists deal_created_project_uq on deal (created_project_id) where created_project_id is not null;
create index if not exists deal_cf_gin on deal using gin (custom_fields);

-- ── ContactRole (exclusive-arc project XOR deal) ────────────────────────
create table if not exists contact_role (
  id               uuid primary key,
  workspace_id     uuid not null references workspace(id),
  contact_id       uuid not null references contact(id),
  organization_id  uuid not null references organization(id),
  project_id       uuid,                                    -- FK doplní 0003 (project)
  deal_id          uuid references deal(id),
  role             text not null,                           -- sponsor | decision_maker | technical_contact | ...
  is_primary       boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid,
  constraint contact_role_arc check (num_nonnulls(project_id, deal_id) <= 1)
);
create unique index if not exists contact_role_uq
  on contact_role (contact_id, organization_id, coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
                   coalesce(deal_id, '00000000-0000-0000-0000-000000000000'::uuid), role);

-- ── Tag + Tagging (polymorfní) ──────────────────────────────────────────
create table if not exists tag (
  id            uuid primary key,
  workspace_id  uuid not null references workspace(id),
  name          text not null,
  color         text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid, deleted_at timestamptz
);
create unique index if not exists tag_ws_name_uq on tag (workspace_id, name) where deleted_at is null;

create table if not exists tagging (
  id            uuid primary key,
  workspace_id  uuid not null references workspace(id),
  tag_id        uuid not null references tag(id),
  entity_type   text not null,                              -- organization | contact | deal | project | task | document
  entity_id     uuid not null,
  created_at timestamptz not null default now(),
  constraint tagging_entity_chk check (entity_type in ('organization','contact','deal','project','task','document'))
);
create unique index if not exists tagging_uq on tagging (tag_id, entity_type, entity_id);
create index if not exists tagging_entity_idx on tagging (workspace_id, entity_type, entity_id);

-- ── CustomFieldDefinition ───────────────────────────────────────────────
create table if not exists custom_field_definition (
  id            uuid primary key,
  workspace_id  uuid not null references workspace(id),
  entity_type   text not null,                              -- organization | contact | deal | project | task
  key           text not null,                              -- immutable slug
  label         text not null,
  field_type    text not null,                              -- text|number|date|boolean|select|multiselect|url|currency
  options       jsonb,
  required      boolean not null default false,
  position      integer not null default 0,
  is_pii        boolean not null default false,
  archived_at   timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid,
  constraint cfd_entity_chk check (entity_type in ('organization','contact','deal','project','task'))
);
create unique index if not exists cfd_ws_entity_key_uq on custom_field_definition (workspace_id, entity_type, key);
