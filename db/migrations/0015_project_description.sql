-- 0015: Volný popis projektu (autosave poznámky pod projektem).
ALTER TABLE project ADD COLUMN IF NOT EXISTS description text;
