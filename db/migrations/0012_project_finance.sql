-- 0012: Finance projektu — jednorázová cena, evidence plateb (zálohy/doplatky) a stav retaineru.
-- Dashboard „Historicky vyděláno" = součet skutečně přijatých plateb; „Měsíční retainery"
-- počítá jen projekty s retainer_active = true (např. záloha zaplacená, ale retainer ještě neběží).

ALTER TABLE project ADD COLUMN IF NOT EXISTS price_minor bigint;                       -- sjednaná jednorázová cena (CZK haléře)
ALTER TABLE project ADD COLUMN IF NOT EXISTS payments jsonb NOT NULL DEFAULT '[]';     -- [{amountMinor, date, note}]
ALTER TABLE project ADD COLUMN IF NOT EXISTS retainer_active boolean NOT NULL DEFAULT false;
