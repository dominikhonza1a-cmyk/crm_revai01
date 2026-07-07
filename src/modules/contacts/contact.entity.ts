import { pgTable, uuid, text, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { tenantColumns, auditColumns, softDelete } from "@/shared/db/columns";

/**
 * Contact (GDPR pivot) + ContactRole. Migrace 0002.
 * ContactRole: exclusive-arc project_id XOR deal_id (CHECK v SQL). PII pole maskovaná pro dev roli (service).
 */
export const contacts = pgTable("contact", {
  id: uuid("id").primaryKey(),
  ...tenantColumns,
  organizationId: uuid("organization_id"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  jobTitle: text("job_title"),
  linkedinUrl: text("linkedin_url"),
  preferredChannel: text("preferred_channel"),
  notes: text("notes"),
  consentMarketing: boolean("consent_marketing").notNull().default(false),
  consentUpdatedAt: timestamp("consent_updated_at", { withTimezone: true }),
  legalBasis: text("legal_basis").notNull().default("legitimate_interest"),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),
  customFields: jsonb("custom_fields").notNull().default({}),
  ...auditColumns,
  ...softDelete,
}, (t) => ({
  orgIdx: index("contact_org_idx").on(t.workspaceId, t.organizationId),
}));

export const contactRoles = pgTable("contact_role", {
  id: uuid("id").primaryKey(),
  ...tenantColumns,
  contactId: uuid("contact_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id"),
  dealId: uuid("deal_id"),
  role: text("role").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  ...auditColumns,
});

export type ContactRow = typeof contacts.$inferSelect;
export type ContactInsert = typeof contacts.$inferInsert;
