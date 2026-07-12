import type { DocumentKind, TimelineHostEntity } from "@/domain/enums";

export interface DocumentCreateInput {
  kind: DocumentKind;                 // external_ref | native_file | secret_ref
  title: string;
  entityType: TimelineHostEntity;
  entityId: string;
  docCategory: "contract" | "proposal" | "spec" | "credentials_ref" | "deliverable" | "questionnaire" | "other";
  categoryLabel?: string;             // volný popis při „Jiné"
  // external_ref
  storageProvider?: "gdrive" | "sharepoint" | "url" | "local" | "supabase";
  externalUrl?: string;
  // native_file
  storageKey?: string;
  mimeType?: string;
  // secret_ref (external_url MUSÍ být prázdné)
  secretLocation?: string;
  secretPolicyNote?: string;
  containsPii?: boolean;
}
export type DocumentUpdateInput = Partial<DocumentCreateInput>;
export interface DocumentListFilter { entityType: TimelineHostEntity; entityId: string; kind?: DocumentKind; }
