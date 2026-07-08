-- 0006_notifications — durable fronta notifikací (immediate i digest) s dedup klíčem
-- Viz docs/workflows/notifications.md. Kritické jdou hned (chat+email), běžné se agregují do denního digestu.

create table if not exists notification_outbox (
  id            uuid primary key,
  workspace_id  uuid not null references workspace(id),
  user_id       uuid references app_user(id),
  category      text not null,                    -- sla_breach | sla_warning | deal_won | task_overdue | deal_stale | ...
  channel       text not null,                    -- chat | email
  mode          text not null,                    -- immediate | daily_digest
  title         text not null,
  body          text,
  link          text,
  source_id     text,
  dedup_key     text not null,                    -- (ws:user:kategorie:kanál:zdroj:den) — brání spamu
  status        text not null default 'pending',  -- pending | sent | failed | digested
  error         text,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);
create unique index if not exists notification_dedup_uq on notification_outbox (dedup_key);
create index if not exists notification_pending_idx on notification_outbox (workspace_id, status, mode);
