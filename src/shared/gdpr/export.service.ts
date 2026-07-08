import { and, eq, or, inArray } from "drizzle-orm";
import { db } from "@/shared/db";
import { currentWorkspaceId, currentTenant } from "@/shared/tenant-context";
import { audit } from "@/shared/audit/audit.service";
import { contacts, contactRoles } from "@/modules/contacts/contact.entity";
import { activities } from "@/modules/activities/activity.entity";
import { deals } from "@/modules/deals/deal.entity";
import { organizations } from "@/modules/organizations/organization.entity";
import { taggings, tags } from "@/shared/tags/tag.entity";

/**
 * Export dat subjektu (GDPR čl. 15/20) — JSON bundle všeho, co o kontaktu vedeme.
 * Auditováno jako gdpr_export. Viz docs/security/gdpr.md.
 */
export const dataExport = {
  async exportContact(contactId: string): Promise<{ bundle: Record<string, unknown> }> {
    const ws = currentWorkspaceId();
    const ctx = currentTenant();
    const conn = db();

    const contact = (await conn.select().from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.workspaceId, ws))).limit(1))[0];
    if (!contact) return { bundle: { error: "Kontakt nenalezen" } };

    const org = contact.organizationId
      ? (await conn.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, contact.organizationId)).limit(1))[0]
      : null;

    const roles = await conn.select().from(contactRoles)
      .where(and(eq(contactRoles.workspaceId, ws), eq(contactRoles.contactId, contactId)));

    const acts = await conn.select({
      type: activities.type, subject: activities.subject, body: activities.body,
      status: activities.status, createdAt: activities.createdAt,
    }).from(activities).where(and(eq(activities.workspaceId, ws),
      or(eq(activities.contactId, contactId), and(eq(activities.entityType, "contact"), eq(activities.entityId, contactId)))));

    const contactDeals = await conn.select({ title: deals.title, createdAt: deals.createdAt })
      .from(deals).where(and(eq(deals.workspaceId, ws), eq(deals.primaryContactId, contactId)));

    const tagRows = await conn.select({ tagId: taggings.tagId }).from(taggings)
      .where(and(eq(taggings.workspaceId, ws), eq(taggings.entityType, "contact"), eq(taggings.entityId, contactId)));
    const tagNames = tagRows.length
      ? (await conn.select({ name: tags.name }).from(tags).where(inArray(tags.id, tagRows.map((t) => t.tagId)))).map((t) => t.name)
      : [];

    await audit.audited(ctx, "gdpr_export", { type: "contact", id: contactId });

    return {
      bundle: {
        exportedAt: new Date().toISOString(),
        subject: {
          firstName: contact.firstName, lastName: contact.lastName, email: contact.email, phone: contact.phone,
          jobTitle: contact.jobTitle, linkedinUrl: contact.linkedinUrl, notes: contact.notes,
          preferredChannel: contact.preferredChannel, consentMarketing: contact.consentMarketing,
          legalBasis: contact.legalBasis, customFields: contact.customFields,
          createdAt: contact.createdAt, organization: org?.name ?? null,
        },
        roles: roles.map((r) => ({ role: r.role, isPrimary: r.isPrimary })),
        activities: acts,
        deals: contactDeals,
        tags: tagNames,
      },
    };
  },
};
