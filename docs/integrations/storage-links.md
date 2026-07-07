# Integrace — Document storage (reference vs. nativní)

**Rozhodnutí:** dokumenty jsou primárně **reference** na externí úložiště (Google Drive / SharePoint).
CRM drží odkaz + metadata; nativní upload je opt-in (`features.nativeFileUpload`).

## Adaptery
- `StoragePort` (`src/adapters/storage/storage.port.ts`): `put`, `getSignedUrl`, `delete` — pro **nativní** soubory.
- `LinkResolverPort` (`link-resolver.port.ts`): načte metadata externího odkazu (název, mime, verze, kdo/kdy měnil).

`STORAGE_PROVIDER`: `link` (default — jen reference) | `local` | `s3`.

## Verzování (dle typu uložení)
- **`kind=external_ref`**: verzuje **externí systém**; CRM v `DocumentVersion` drží jen metadata
  (`external_version_label`, `external_modified_at/by`).
- **`kind=native_file`**: verzuje **CRM** (`DocumentVersion` se `storage_key`, `checksum`, `size_bytes`).

## Secret ref
`kind=secret_ref` — viz [../security/secrets.md](../security/secrets.md). DB CHECK zakazuje `external_url` u secretů.

## Předpoklad
Výchozí externí úložiště = Google Drive (konzistentní s Gmail předpokladem); SharePoint adapter je placeholder.
Volba Drive vs. SharePoint zatím nebyla potvrzena.
