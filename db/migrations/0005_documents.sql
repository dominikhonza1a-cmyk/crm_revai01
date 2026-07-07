-- 0005_documents — dokumenty (reference na externí úložiště + nativní + secret ref) a jejich verze
-- Secrets se NIKDY neukládají jako obsah: kind=secret_ref ⇒ external_url IS NULL (CHECK). Viz docs/security/secrets.md.

create table if not exists document (
  id                 uuid primary key,
  workspace_id       uuid not null references workspace(id),
  kind               text not null default 'external_ref',   -- external_ref | native_file | secret_ref
  storage_provider   text,                                    -- gdrive | sharepoint | url | local
  external_url       text,
  external_file_id   text,
  title              text not null,
  mime_type          text,
  doc_category       text not null default 'other',           -- contract | proposal | spec | credentials_ref | deliverable | other
  entity_type        text not null,                           -- organization | contact | deal | project | task
  entity_id          uuid not null,
  current_version_id uuid,
  contains_pii       boolean not null default false,
  secret_location    text,
  secret_policy_note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid, deleted_at timestamptz,
  constraint document_entity_chk check (entity_type in ('organization','contact','deal','project','task')),
  constraint document_secret_chk check (kind <> 'secret_ref' or external_url is null)
);
create index if not exists document_entity_idx on document (workspace_id, entity_type, entity_id) where deleted_at is null;

create table if not exists document_version (
  id                    uuid primary key,
  workspace_id          uuid not null references workspace(id),
  document_id           uuid not null references document(id),
  version_number        integer not null,
  storage_key           text,                                 -- jen native_file
  size_bytes            bigint,
  checksum              text,
  external_version_label text,                                -- metadata u external_ref (verzuje externí systém)
  external_modified_at  timestamptz,
  external_modified_by  text,
  uploaded_by           uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid
);
create unique index if not exists document_version_uq on document_version (document_id, version_number);
