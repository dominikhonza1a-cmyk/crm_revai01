import { z } from "zod";
import { urlish } from "@/shared/validation";

export const organizationCreateSchema = z.object({
  name: z.string().min(1).max(200),
  website: urlish.optional(),
  lifecycleStage: z.enum(["new_contact", "prospect", "meeting", "negotiating", "before_signature", "active_client", "on_hold", "past_client", "partner"]).default("prospect"),
  employeeBand: z.enum(["1_49", "50_199", "200_500", "500_plus"]).optional(),
  industry: z.string().max(100).optional(),
  source: z.string().max(200).nullable().optional(),
  ownerId: z.string().uuid().optional(),
  supportSlaPolicyId: z.string().uuid().optional(),
  customFields: z.record(z.unknown()).optional(),
});
export const organizationUpdateSchema = organizationCreateSchema.partial();
