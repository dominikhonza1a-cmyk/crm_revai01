/**
 * Modul CONTACTS — osoby u klientů + role (ContactRole). GDPR pivot; PII masking pro dev roli.
 * Soubory: contact.types.ts · contact.validation.ts · contact.entity.ts (+ ContactRole) ·
 *          contact.repository.ts · contact.service.ts (serialize s field-level maskingem) · contact.router.ts.
 */
export * from "./contact.types";
export { contactService } from "./contact.service";
export { contactRepository } from "./contact.repository";
export { contactsRouter } from "./contact.router";
export function registerModule(): void {}
