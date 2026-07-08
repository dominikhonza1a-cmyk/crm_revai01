import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { router, protectedProcedure, requirePermission } from "@/api/trpc";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { contacts } from "@/modules/contacts/contact.entity";
import { erasure } from "./erasure.service";
import { dataExport } from "./export.service";
import { listRetentionCandidates } from "./retention.job";

const idInput = z.object({ contactId: z.string().uuid() });

/** GDPR nástroje — jen admin (settings:manage). Export i výmaz se auditují. */
export const gdprRouter = router({
  /** Kandidáti na anonymizaci (bez aktivity > 18 měsíců). */
  retentionCandidates: protectedProcedure.use(requirePermission("settings", "manage"))
    .query(() => listRetentionCandidates()),

  /** Dohledání kontaktu dle e-mailu (žádost subjektu). */
  findContact: protectedProcedure.use(requirePermission("settings", "manage"))
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const ws = currentWorkspaceId();
      const row = (await db().select({
        id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName,
        email: contacts.email, anonymizedAt: contacts.anonymizedAt,
      }).from(contacts).where(and(eq(contacts.workspaceId, ws), eq(contacts.email, input.email))).limit(1))[0];
      return row ?? null;
    }),

  /** Export dat subjektu (JSON bundle). Auditováno gdpr_export. */
  exportContact: protectedProcedure.use(requirePermission("settings", "manage"))
    .input(idInput).mutation(({ input }) => dataExport.exportContact(input.contactId)),

  /** Anonymizace + kaskáda (výmaz). Auditováno gdpr_erasure + tombstone. */
  eraseContact: protectedProcedure.use(requirePermission("settings", "manage"))
    .input(idInput).mutation(({ input }) => erasure.eraseContact(input.contactId)),
});
