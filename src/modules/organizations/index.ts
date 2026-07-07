/**
 * Modul ORGANIZATIONS — klienti (prospekt i klient v jedné entitě).
 * Soubory: organization.types.ts · organization.validation.ts · organization.entity.ts ·
 *          organization.repository.ts · organization.service.ts · organization.router.ts.
 */
export * from "./organization.types";
export { organizationService } from "./organization.service";
export { organizationRepository } from "./organization.repository";
export { organizationsRouter } from "./organization.router";
export function registerModule(): void {}
