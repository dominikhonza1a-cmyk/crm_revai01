-- 0014: Cashflow — jednorázové výdaje (period 'one_off' s datem zaplacení).
-- Běžící retainery se účtují automaticky (daily job přidá platbu 1. den měsíce).
ALTER TABLE subscription DROP CONSTRAINT IF EXISTS subscription_period_chk;
ALTER TABLE subscription ADD CONSTRAINT subscription_period_chk CHECK (period IN ('monthly','yearly','one_off'));
ALTER TABLE subscription ADD COLUMN IF NOT EXISTS paid_on date;   -- u one_off: kdy zaplaceno
