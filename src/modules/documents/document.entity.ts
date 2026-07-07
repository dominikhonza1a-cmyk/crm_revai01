/**
 * Drizzle table pro Document + DocumentVersion.
 * DB CHECK: kind=secret_ref ⇒ external_url IS NULL (viz docs/security/secrets.md).
 * Verzování: external_ref → jen metadata; native_file → CRM verze (storage_key, checksum).
 */
export const DOCUMENT_ENTITY_NOTE = "Document polymorfní host; CHECK secret_ref⇒external_url NULL; DocumentVersion.";
