-- 0009: Per-user notifikační preference — přepis config defaultů (config/notification-rules.ts).
-- mode: immediate | daily_digest | off. Chybějící řádek = platí default z configu.

CREATE TABLE IF NOT EXISTS notification_preference (
  id              uuid PRIMARY KEY,
  workspace_id    uuid NOT NULL REFERENCES workspace(id),
  user_id         uuid NOT NULL REFERENCES app_user(id),
  event_category  text NOT NULL,
  channel         text NOT NULL,                 -- email | chat
  mode            text NOT NULL,                 -- immediate | daily_digest | off
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_preference_mode_chk CHECK (mode IN ('immediate','daily_digest','off')),
  UNIQUE (workspace_id, user_id, event_category, channel)
);
