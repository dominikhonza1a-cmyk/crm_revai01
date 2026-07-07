import { z } from "zod";
import { router, protectedProcedure } from "@/api/trpc";
import { activityService } from "./activity.service";

const entityEnum = z.enum(["organization", "contact", "deal", "project", "task"]);

const timelineInput = z.object({
  entityType: entityEnum,
  entityId: z.string().uuid(),
  eventTypes: z.array(z.string()).optional(),
});

const logInput = z.object({
  type: z.enum(["call", "meeting", "email", "note", "demo", "task_note"]),
  subject: z.string().min(1),
  body: z.string().optional(),
  entityType: entityEnum,
  entityId: z.string().uuid(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  completedAt: z.string().datetime({ offset: true }).optional(),
});

/** tRPC router aktivit + timeline. Timeline = read-only agregovaný feed (jeden dotaz). */
export const activitiesRouter = router({
  timeline: protectedProcedure.input(timelineInput).query(({ ctx, input }) => activityService.listTimeline(ctx, input)),
  log: protectedProcedure.input(logInput).mutation(({ ctx, input }) => activityService.logActivity(ctx, input)),
});
