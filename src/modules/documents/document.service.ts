import type { TenantContext } from "@/shared";
import type { DocumentCreateInput } from "./document.types";

/**
 * Use-casy modulu documents. Primárně reference (external_ref); nativní upload opt-in (feature flag).
 * secret_ref: audit document_secret_ref_changed. Verzování dle kind (viz docs/integrations/storage-links.md).
 */
export interface DocumentService {
  link(ctx: TenantContext, input: DocumentCreateInput): Promise<{ documentId: string }>;
  addNativeVersion(ctx: TenantContext, documentId: string, file: Uint8Array, mime: string): Promise<void>;
}

export const documentService: DocumentService = {
  async link(_ctx, input) {
    // validace (secret_ref ⇒ bez externalUrl); pro external_ref volitelně LinkResolver → metadata verze;
    // eventBus.publish(document.linked); timeline(document_linked); u secret_ref audit(document_secret_ref_changed).
    void input; throw new Error("documentService.link: fáze 2.");
  },
  async addNativeVersion(_ctx, _id, _file, _mime) {
    // jen když features.nativeFileUpload; StoragePort.put → DocumentVersion.
    throw new Error("documentService.addNativeVersion: fáze 2 (nativní upload).");
  },
};
