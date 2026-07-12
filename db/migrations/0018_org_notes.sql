-- 0018: Volné poznámky / info u klienta (autosave, markdown).
ALTER TABLE organization ADD COLUMN IF NOT EXISTS notes text;
