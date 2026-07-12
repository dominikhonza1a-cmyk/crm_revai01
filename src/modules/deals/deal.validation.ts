import { z } from "zod";

/** Zod schémata — jediný zdroj pravdy pro tRPC i REST i CSV import. */
export const dealCreateSchema = z.object({
  organizationId: z.string().uuid(),
  title: z.string().min(1).max(200),
  pipelineStageId: z.string().uuid().optional(),
  primaryContactId: z.string().uuid().optional(),
  amountMinor: z.bigint().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  expectedMarginPct: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().date().optional(),
  ownerId: z.string().uuid().optional(),
  projectTypeHint: z.enum(["chatbot_voicebot", "process_automation", "custom_ai"]).optional(),
  notes: z.string().max(5000).nullable().optional(),
  customFields: z.record(z.unknown()).optional(),
});

export const dealUpdateSchema = dealCreateSchema.partial().omit({ organizationId: true }).extend({
  // v editaci lze pole i VYMAZAT (null → NULL v DB)
  amountMinor: z.bigint().nonnegative().nullable().optional(),
  expectedCloseDate: z.string().date().nullable().optional(),
});

export const dealMoveStageSchema = z.object({
  dealId: z.string().uuid(),
  toStageId: z.string().uuid(),
  lostReason: z.enum(["price", "timing", "competitor", "no_response", "other"]).optional(),
  lostNote: z.string().max(1000).optional(),
});
