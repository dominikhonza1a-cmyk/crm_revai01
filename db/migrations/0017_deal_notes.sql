-- 0017: Volné poznámky k dealu (kontext, dohody) — editovatelné v okně dealu.
ALTER TABLE deal ADD COLUMN IF NOT EXISTS notes text;
