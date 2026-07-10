-- 0013: Podstránky nápadů (hierarchie jako v Notionu — /page uvnitř nápadu).
ALTER TABLE idea ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES idea(id);
CREATE INDEX IF NOT EXISTS idea_parent_idx ON idea (parent_id) WHERE deleted_at IS NULL;
