import { pgTable, uuid, text, boolean, bigint, integer, timestamp, index } from "drizzle-orm/pg-core";
import { tenantColumns, auditColumns, softDelete } from "@/shared/db/columns";

/**
 * Document + DocumentVersion. Migrace 0005.
 * Primárně reference na externí úložiště; nativní soubor i secret ref jsou varianty téže entity.
 * DB CHECK: kind=secret_ref ⇒ external_url IS NULL. Verzování dle kind (native = CRM, external = metadata).
 */
export const documents = pgTable("document", {
  id: uuid("id").primaryKey(),
  ...tenantColumns,
  kind: text("kind").notNull().default("external_ref"),   // external_ref | native_file | secret_ref
  storageProvider: text("storage_provider"),
  externalUrl: text("external_url"),
  externalFileId: text("external_file_id"),
  title: text("title").notNull(),
  mimeType: text("mime_type"),
  docCategory: text("doc_category").notNull().default("other"),
  categoryLabel: text("category_label"),                  // volný popis při „Jiné"
  storageKey: text("storage_key"),                        // native_file → cesta v Supabase Storage
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  currentVersionId: uuid("current_version_id"),
  containsPii: boolean("contains_pii").notNull().default(false),
  secretLocation: text("secret_location"),
  secretPolicyNote: text("secret_policy_note"),
  ...auditColumns,
  ...softDelete,
}, (t) => ({
  entityIdx: index("document_entity_idx").on(t.workspaceId, t.entityType, t.entityId),
}));

export const documentVersions = pgTable("document_version", {
  id: uuid("id").primaryKey(),
  ...tenantColumns,
  documentId: uuid("document_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  storageKey: text("storage_key"),
  sizeBytes: bigint("size_bytes", { mode: "bigint" }),
  checksum: text("checksum"),
  externalVersionLabel: text("external_version_label"),
  externalModifiedAt: timestamp("external_modified_at", { withTimezone: true }),
  externalModifiedBy: text("external_modified_by"),
  uploadedBy: uuid("uploaded_by"),
  ...auditColumns,
});

export type DocumentRow = typeof documents.$inferSelect;
export type DocumentVersionRow = typeof documentVersions.$inferSelect;
