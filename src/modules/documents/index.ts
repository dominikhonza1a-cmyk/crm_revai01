/**
 * Modul DOCUMENTS — reference na externí úložiště (Drive/SharePoint) + metadata; nativní upload opt-in.
 * Soubory: document.types.ts · document.validation.ts (CHECK secret_ref) · document.entity.ts (+ DocumentVersion) ·
 *          document.repository.ts · document.service.ts (link, verze) · document.router.ts.
 * Secrets se NIKDY neukládají jako obsah — jen secret_ref (viz docs/security/secrets.md).
 */
export * from "./document.types";
export { documentService } from "./document.service";
export { documentRepository } from "./document.repository";
export function registerModule(): void {}

export const DOCUMENTS_ROUTER_NOTE = "documents.{list,link,addVersion,archive}; kind=external_ref|native_file|secret_ref.";
