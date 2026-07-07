-- 0001_init — tenancy, identita, RBAC, audit
-- Spustitelné přímo v Supabase SQL editoru, nebo přes `npm run db:migrate`.
-- Autentizaci (heslo, TOTP MFA, OAuth) drží Supabase (auth.users); tyto tabulky drží profil + RBAC + audit.
-- Pozn.: app_user.auth_user_id odkazuje na auth.users.id (bez cross-schema FK — Supabase to nedoporučuje).

create extension if not exists "pgcrypto";   -- gen_random_uuid (fallback; PK jinak generuje app jako UUIDv7)

-- ── Workspace (tenant) ──────────────────────────────────────────────────
create table if not exists workspace (
  id                uuid primary key,
  name              text not null,
  slug              text not null,
  default_timezone  text not null default 'Europe/Prague',
  default_currency  text not null default 'CZK',
  settings          jsonb not null default '{}'::jsonb,
  data_region       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid,
  updated_by        uuid
);
create unique index if not exists workspace_slug_uq on workspace (slug);

-- ── App user (profil; identita v auth.users) ────────────────────────────
create table if not exists app_user (
  id             uuid primary key,
  workspace_id   uuid not null references workspace(id),
  auth_user_id   uuid,
  email          text not null,
  full_name      text not null,
  status         text not null default 'invited',   -- invited | active | deactivated
  timezone       text not null default 'Europe/Prague',
  locale         text not null default 'cs',
  avatar_url     text,
  last_login_at  timestamptz,
  anonymized_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid,
  updated_by     uuid
);
create unique index if not exists app_user_ws_email_uq on app_user (workspace_id, email);
create index if not exists app_user_auth_idx on app_user (auth_user_id);

-- ── Role (RBAC; seed z config/permissions.json) ─────────────────────────
create table if not exists role (
  id                  uuid primary key,
  workspace_id        uuid not null references workspace(id),
  key                 text not null,                 -- admin | sales | pm | dev | support
  name                text not null,
  is_system           boolean not null default false,
  permissions         jsonb not null default '{}'::jsonb,
  field_policies      jsonb not null default '{}'::jsonb,
  export_permissions  jsonb not null default '[]'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid,
  updated_by          uuid
);
create unique index if not exists role_ws_key_uq on role (workspace_id, key);

create table if not exists user_role (
  id            uuid primary key,
  workspace_id  uuid not null references workspace(id),
  user_id       uuid not null references app_user(id),
  role_id       uuid not null references role(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid,
  updated_by    uuid
);
create unique index if not exists user_role_uq on user_role (user_id, role_id);

-- ── API klíče (REST fasáda pro n8n/Make) ────────────────────────────────
create table if not exists api_key (
  id            uuid primary key,
  workspace_id  uuid not null references workspace(id),
  name          text not null,
  prefix        text not null,
  hashed_key    text not null,                        -- hash, nikdy plaintext
  scopes        jsonb not null default '[]'::jsonb,
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid,
  updated_by    uuid
);
create index if not exists api_key_prefix_idx on api_key (prefix);

-- ── Audit log (append-only) ─────────────────────────────────────────────
create table if not exists audit_log (
  id            uuid primary key,
  workspace_id  uuid not null,
  actor_id      uuid,
  actor_type    text not null default 'user',         -- user | system
  action        text not null,
  entity_type   text,
  entity_id     uuid,
  changes       jsonb,
  context       jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists audit_ws_created_idx on audit_log (workspace_id, created_at);
create index if not exists audit_entity_idx on audit_log (workspace_id, entity_type, entity_id);
create index if not exists audit_action_idx on audit_log (workspace_id, action);
-- append-only: v produkci odebrat UPDATE/DELETE grant aplikační roli:
--   revoke update, delete on audit_log from authenticated;
