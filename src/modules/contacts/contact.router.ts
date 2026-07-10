import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "@/api/trpc";
import { contactCreateSchema, contactUpdateSchema } from "./contact.validation";
import { contactService } from "./contact.service";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { and, eq } from "drizzle-orm";
import { contacts } from "./contact.entity";
import { audit } from "@/shared/audit/audit.service";

const idInput = z.object({ id: z.string().uuid() });
const listInput = z.object({ organizationId: z.string().uuid().optional(), q: z.string().optional() }).optional();

/** tRPC router kontaktů. PII se maskuje dle role (contact.service.serialize) při čtení. */
export const contactsRouter = router({
  list: protectedProcedure.use(requirePermission("contacts", "read"))
    .input(listInput).query(async ({ ctx, input }) => {
      const page = await contactService.list(ctx, input ?? {});
      return { ...page, items: page.items.map((c) => contactService.serialize(ctx.permissions, c)) };
    }),

  get: protectedProcedure.use(requirePermission("contacts", "read"))
    .input(idInput).query(async ({ ctx, input }) => {
      const c = await contactService.get(ctx, input.id);
      return c ? contactService.serialize(ctx.permissions, c) : null;
    }),

  create: protectedProcedure.use(requirePermission("contacts", "write"))
    .input(contactCreateSchema).mutation(({ ctx, input }) => contactService.create(ctx, input)),

  update: protectedProcedure.use(requirePermission("contacts", "write"))
    .input(idInput.merge(contactUpdateSchema).merge(z.object({ firstName: z.string().trim().max(100).optional() })))
    .mutation(({ ctx, input }) => { const { id, ...rest } = input; return contactService.update(ctx, id, rest); }),

  remove: protectedProcedure.use(requirePermission("contacts", "write"))
    .input(idInput)
    .mutation(async ({ ctx, input }) => {
      const ws = currentWorkspaceId();
      await db().update(contacts).set({ deletedAt: new Date() }).where(and(eq(contacts.id, input.id), eq(contacts.workspaceId, ws)));
      await audit.audited(ctx, "record_deleted", { type: "contact", id: input.id });
    }),

  archive: protectedProcedure.use(requirePermission("contacts", "manage"))
    .input(idInput).mutation(({ ctx, input }) => contactService.archive(ctx, input.id)),
});
