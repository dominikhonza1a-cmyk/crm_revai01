/**
 * Centrální re-export všech Drizzle table definic (schéma). Drizzle klient i drizzle-kit z něj čtou.
 * Každý modul definuje své tabulky v <modul>/*.entity.ts; sem se přidávají, jak vznikají.
 */
// 0001 — identita + audit
export * from "@/modules/security/security.entity";
export * from "@/shared/audit/audit-log.entity";
// 0002 — CRM core
export * from "@/modules/organizations/organization.entity";
export * from "@/modules/contacts/contact.entity";
export * from "@/modules/deals/deal.entity";
export * from "@/shared/tags/tag.entity";
export * from "@/shared/custom-fields/custom-field.entity";
// 0003+ (fáze 1 pokr.): project, task, activity, timeline, sla, document
