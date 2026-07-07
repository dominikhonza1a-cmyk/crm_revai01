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
// 0003 — delivery core
export * from "@/modules/projects/project.entity";
export * from "@/modules/projects/project-template.entity";
export * from "@/modules/activities/activity.entity";
// 0004 — tasks + SLA
export * from "@/modules/tasks/task.entity";
// 0005 — dokumenty
export * from "@/modules/documents/document.entity";
