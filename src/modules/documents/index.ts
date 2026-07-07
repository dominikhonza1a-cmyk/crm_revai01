/**
 * Modul DOCUMENTS — reference na externí úložiště (Drive/SharePoint) + metadata; nativní upload opt-in (fáze 2).
 * Soubory: document.types · document.validation (CHECK secret_ref) · document.entity (+ DocumentVersion) ·
 *          document.repository · document.service (link, verze) · document.router.
 * Secrets se NIKDY neukládají jako obsah — jen secret_ref (viz docs/security/secrets.md).
 */
export * from "./document.types";
export { documentService } from "./document.service";
export { documentRepository } from "./document.repository";
export { documentsRouter } from "./document.router";
