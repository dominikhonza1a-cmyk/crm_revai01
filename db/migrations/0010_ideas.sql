-- 0010: Nápady (ideas) — volné poznámky/nápady mimo klienty: nekonečné psaní s autosave,
-- přílohy přes document (entity_type 'idea'), štítky přes tagging.

CREATE TABLE IF NOT EXISTS idea (
  id            uuid PRIMARY KEY,
  workspace_id  uuid NOT NULL REFERENCES workspace(id),
  title         text NOT NULL DEFAULT 'Nový nápad',
  content       text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid,
  updated_by    uuid,
  deleted_at    timestamptz
);
CREATE INDEX IF NOT EXISTS idea_ws_idx ON idea (workspace_id, updated_at DESC) WHERE deleted_at IS NULL;

-- dokumenty i štítky nově můžou viset na nápadu
ALTER TABLE document DROP CONSTRAINT IF EXISTS document_entity_chk;
ALTER TABLE document ADD CONSTRAINT document_entity_chk
  CHECK (entity_type IN ('organization','contact','deal','project','task','idea'));

ALTER TABLE tagging DROP CONSTRAINT IF EXISTS tagging_entity_chk;
ALTER TABLE tagging ADD CONSTRAINT tagging_entity_chk
  CHECK (entity_type IN ('organization','contact','deal','project','task','document','idea'));
