import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "@/api/trpc";
import { contactCreateSchema, contactUpdateSchema } from "./contact.validation";
import { contactService } from "./contact.service";

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
    .input(idInput.merge(contactUpdateSchema))
    .mutation(({ ctx, input }) => { const { id, ...rest } = input; return contactService.update(ctx, id, rest); }),

  archive: protectedProcedure.use(requirePermission("contacts", "manage"))
    .input(idInput).mutation(({ ctx, input }) => contactService.archive(ctx, input.id)),
});
