-- 0007_gdpr — erasure tombstony (po restore ze zálohy se výmaz re-aplikuje; bez toho je backup GDPR díra)
-- Viz docs/security/gdpr.md.

create table if not exists erasure_tombstone (
  id                 uuid primary key,
  workspace_id       uuid not null references workspace(id),
  contact_id         uuid not null,
  subject_email_hash text,                          -- sha256 e-mailu subjektu (pro dohledání bez PII)
  executed_by        uuid,
  executed_at        timestamptz not null default now()
);
create index if not exists erasure_ws_idx on erasure_tombstone (workspace_id, executed_at);
