import { randomUUID } from "node:crypto";
import { z } from "zod";
import { and, eq, isNull, asc } from "drizzle-orm";
import { router, protectedProcedure } from "@/api/trpc";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { encryptSecret, decryptSecret } from "@/shared/crypto";
import { czkRates, toCzkMinor } from "@/shared/fx";
import { audit } from "@/shared/audit/audit.service";
import { NotFound } from "@/domain/errors";
import { subscriptions } from "./subscription.entity";

const upsertInput = z.object({
  name: z.string().trim().min(1).max(120),
  purpose: z.string().trim().max(300).optional(),
  email: z.string().trim().max(200).optional(),
  password: z.string().max(200).optional(),          // plaintext jen v transportu; ukládá se šifrovaně
  url: z.string().trim().max(300).optional(),
  amountMinor: z.bigint().nonnegative(),
  currency: z.enum(["USD", "EUR", "CZK", "GBP"]),
  period: z.enum(["monthly", "yearly"]),
  notes: z.string().trim().max(1000).optional(),
});

/**
 * Předplatná: sdílená tabulka fixních nákladů (co, k čemu, účet, kolik). Částky se pro
 * dashboard přepočítávají na CZK dle denního kurzu ČNB; roční platby se dělí 12.
 * Heslo se ukládá AES-GCM šifrované a vrací jen na vyžádání (reveal) — s auditem.
 */
export const subscriptionsRouter = router({
  list: protectedProcedure.query(async () => {
    const ws = currentWorkspaceId();
    const rows = await db().select().from(subscriptions)
      .where(and(eq(subscriptions.workspaceId, ws), isNull(subscriptions.deletedAt)))
      .orderBy(asc(subscriptions.name));
    const rates = await czkRates();
    let totalMonthlyCzkMinor = 0n;
    const items = rows.map((r) => {
      const czk = toCzkMinor(r.amountMinor, r.currency, rates);
      const monthlyCzkMinor = r.period === "yearly" ? czk / 12n : czk;
      if (r.status === "active") totalMonthlyCzkMinor += monthlyCzkMinor;
      const { passwordEnc, ...rest } = r;
      return { ...rest, hasPassword: !!passwordEnc, monthlyCzkMinor };
    });
    return { items, totalMonthlyCzkMinor, rates: { USD: rates.USD, EUR: rates.EUR } };
  }),

  create: protectedProcedure.input(upsertInput).mutation(async ({ ctx, input }) => {
    const ws = currentWorkspaceId();
    const id = randomUUID();
    const { password, ...rest } = input;
    await db().insert(subscriptions).values({
      id, workspaceId: ws, ...rest,
      passwordEnc: password ? encryptSecret(password) : null,
      createdBy: ctx.userId,
    });
    return { id };
  }),

  update: protectedProcedure
    .input(upsertInput.partial().extend({ id: z.string().uuid(), status: z.enum(["active", "canceled"]).optional() }))
    .mutation(async ({ input }) => {
      const ws = currentWorkspaceId();
      const { id, password, ...rest } = input;
      await db().update(subscriptions).set({
        ...rest,
        ...(password !== undefined ? { passwordEnc: password ? encryptSecret(password) : null } : {}),
        updatedAt: new Date(),
      }).where(and(eq(subscriptions.id, id), eq(subscriptions.workspaceId, ws)));
    }),

  remove: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ input }) => {
    const ws = currentWorkspaceId();
    await db().update(subscriptions).set({ deletedAt: new Date() })
      .where(and(eq(subscriptions.id, input.id), eq(subscriptions.workspaceId, ws)));
  }),

  /** Odhalení hesla na kliknutí — auditované (kdo, kdy, které předplatné). */
  revealPassword: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const ws = currentWorkspaceId();
    const row = (await db().select().from(subscriptions)
      .where(and(eq(subscriptions.id, input.id), eq(subscriptions.workspaceId, ws), isNull(subscriptions.deletedAt))).limit(1))[0];
    if (!row) throw new NotFound("Předplatné nenalezeno");
    await audit.audited(ctx, "secret_revealed", { type: "subscription", id: row.id }, { name: { from: null, to: row.name } });
    return { password: row.passwordEnc ? decryptSecret(row.passwordEnc) : null };
  }),
});
