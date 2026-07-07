import { z } from "zod";

export const taskCreateSchema = z.object({
  type: z.enum(["delivery", "support", "sales_followup", "internal"]),
  title: z.string().min(1).max(200),
  projectId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  phaseId: z.string().uuid().optional(),
  description: z.string().max(5000).optional(),
  priority: z.enum(["p1", "p2", "p3", "p4"]).default("p3"),
  assigneeId: z.string().uuid().optional(),
  dueAt: z.string().datetime({ offset: true }).optional(),
  reporterContactId: z.string().uuid().optional(),
  channel: z.enum(["email", "chat", "phone", "portal"]).optional(),
  recurrenceRule: z.string().max(300).optional(),
  recurrenceUntil: z.string().date().optional(),
  customFields: z.record(z.unknown()).optional(),
}).refine(
  (v) => v.type === "internal" || v.projectId || v.organizationId,
  { message: "Task typu delivery/support/sales_followup musí mít projectId nebo organizationId." },
);

export const taskStatusChangeSchema = z.object({
  taskId: z.string().uuid(),
  toStatus: z.enum(["todo", "in_progress", "waiting_on_client", "blocked", "done", "canceled"]),
});
