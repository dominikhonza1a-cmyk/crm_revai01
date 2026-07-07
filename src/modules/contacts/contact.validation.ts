import { z } from "zod";

export const contactCreateSchema = z.object({
  organizationId: z.string().uuid().optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  jobTitle: z.string().max(150).optional(),
  legalBasis: z.enum(["legitimate_interest", "consent", "contract"]).default("legitimate_interest"),
  roles: z.array(z.object({
    organizationId: z.string().uuid(),
    projectId: z.string().uuid().optional(),
    role: z.enum(["sponsor", "decision_maker", "technical_contact", "end_user", "billing_contact", "champion"]),
    isPrimary: z.boolean().optional(),
  })).optional(),
  customFields: z.record(z.unknown()).optional(),
});
export const contactUpdateSchema = contactCreateSchema.partial();
