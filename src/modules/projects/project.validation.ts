import { z } from "zod";

export const projectCreateSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(200),
  projectType: z.enum(["chatbot_voicebot", "process_automation", "custom_ai"]),
  engagementType: z.enum(["one_off", "retainer"]),
  ownerId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  startDate: z.string().date().optional(),
  budgetMinor: z.bigint().nonnegative().optional(),
  retainerFeeMinor: z.bigint().nonnegative().optional(),
  retainerPeriod: z.enum(["monthly", "quarterly"]).optional(),
  customFields: z.record(z.unknown()).optional(),
});

export const projectUpdateSchema = projectCreateSchema.partial().omit({ organizationId: true });

export const advancePhaseSchema = z.object({
  projectId: z.string().uuid(),
  toPhase: z.enum(["kickoff", "discovery", "build", "test_uat", "deploy", "hypercare", "ongoing", "closed"]),
  allowBackwards: z.boolean().optional(),
});

export const changeStatusSchema = z.object({
  projectId: z.string().uuid(),
  toStatus: z.enum(["draft", "active", "on_hold", "closed"]),
});
