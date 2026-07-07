import { z } from "zod";

export const organizationCreateSchema = z.object({
  name: z.string().min(1).max(200),
  website: z.string().url().optional(),
  lifecycleStage: z.enum(["prospect", "active_client", "past_client", "partner"]).default("prospect"),
  employeeBand: z.enum(["1_49", "50_199", "200_500", "500_plus"]).optional(),
  industry: z.string().max(100).optional(),
  ownerId: z.string().uuid().optional(),
  supportSlaPolicyId: z.string().uuid().optional(),
  customFields: z.record(z.unknown()).optional(),
});
export const organizationUpdateSchema = organizationCreateSchema.partial();
