-- 0008: Integrace (fáze 3) — per-user OAuth připojení externích účtů (Google: Gmail + Calendar).
-- Refresh token se ukládá VÝHRADNĚ šifrovaný (AES-256-GCM, klíč TOKEN_ENCRYPTION_KEY v env).

CREATE TABLE IF NOT EXISTS integration_connection (
  id                 uuid PRIMARY KEY,
  workspace_id       uuid NOT NULL REFERENCES workspace(id),
  user_id            uuid NOT NULL REFERENCES app_user(id),
  provider           text NOT NULL,                    -- 'google'
  external_email     text,                             -- připojený účet (např. d.valter@…)
  refresh_token_enc  text NOT NULL,                    -- AES-GCM (iv|tag|ciphertext, base64)
  scopes             jsonb NOT NULL DEFAULT '[]',
  status             text NOT NULL DEFAULT 'active',   -- active | error | revoked
  last_synced_at     timestamptz,
  last_error         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id, provider)
);

CREATE INDEX IF NOT EXISTS integration_connection_sync_idx
  ON integration_connection (provider, status);
