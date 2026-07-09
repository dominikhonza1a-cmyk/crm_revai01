-- 0011: Předplatná (fixní náklady) + měsíční částka retaineru na projektu.
-- Heslo předplatného se ukládá VÝHRADNĚ šifrované (AES-GCM, TOKEN_ENCRYPTION_KEY).

CREATE TABLE IF NOT EXISTS subscription (
  id            uuid PRIMARY KEY,
  workspace_id  uuid NOT NULL REFERENCES workspace(id),
  name          text NOT NULL,                       -- co (Claude, GPT, Netlify…)
  purpose       text,                                -- k čemu / proč
  email         text,                                -- účet, pod kterým je vedené
  password_enc  text,                                -- šifrované heslo (nikdy plaintext)
  url           text,
  amount_minor  bigint NOT NULL DEFAULT 0,           -- částka v minor units (centy)
  currency      char(3) NOT NULL DEFAULT 'USD',      -- USD | EUR | CZK
  period        text NOT NULL DEFAULT 'monthly',     -- monthly | yearly
  notes         text,
  status        text NOT NULL DEFAULT 'active',      -- active | canceled
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid,
  deleted_at    timestamptz,
  CONSTRAINT subscription_period_chk CHECK (period IN ('monthly','yearly'))
);
CREATE INDEX IF NOT EXISTS subscription_ws_idx ON subscription (workspace_id) WHERE deleted_at IS NULL;

-- měsíční fakturace retaineru (CZK minor units) — pro dashboard „Měsíční retainer"
ALTER TABLE project ADD COLUMN IF NOT EXISTS monthly_amount_minor bigint;
