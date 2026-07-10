import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "@/api/trpc";
import { advancePhaseSchema, changeStatusSchema } from "./project.validation";
import { projectService } from "./project.service";
import { projectRepository } from "./project.repository";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { and, eq, sql } from "drizzle-orm";
import { projects } from "./project.entity";
import { audit } from "@/shared/audit/audit.service";

const idInput = z.object({ id: z.string().uuid() });
const listInput = z.object({
  organizationId: z.string().uuid().optional(),
  status: z.enum(["draft", "active", "on_hold", "closed"]).optional(),
  engagementType: z.enum(["one_off", "retainer"]).optional(),
  ownerId: z.string().uuid().optional(),
}).optional();

/** tRPC router projektů (sub-karty klienta). Vznikají přes Won→projekt (W2); zde jejich čtení a lifecycle. */
export const projectsRouter = router({
  list: protectedProcedure.use(requirePermission("projects", "read"))
    .input(listInput).query(({ ctx, input }) => projectService.list(ctx, input ?? {})),

  get: protectedProcedure.use(requirePermission("projects", "read"))
    .input(idInput).query(({ ctx, input }) => projectService.get(ctx, input.id)),

  phases: protectedProcedure.use(requirePermission("projects", "read"))
    .input(idInput).query(({ ctx, input }) => projectService.phases(ctx, input.id)),

  advancePhase: protectedProcedure.use(requirePermission("projects", "write"))
    .input(advancePhaseSchema).mutation(({ ctx, input }) => projectService.advancePhase(ctx, input)),

  // draft → active potvrzuje PM ("Confirm draft"), i on_hold/closed
  changeStatus: protectedProcedure.use(requirePermission("projects", "manage"))
    .input(changeStatusSchema).mutation(({ ctx, input }) => projectService.changeStatus(ctx, input)),

  // Git integrace: mapování GitHub repa (owner/repo) na projekt — webhooky pak píšou do timeline
  setGitRepo: protectedProcedure.use(requirePermission("projects", "write"))
    .input(z.object({
      projectId: z.string().uuid(),
      repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/, "Formát: owner/repo").nullable(),
    }))
    .mutation(({ input }) => projectRepository.setCustomField(input.projectId, "git_repo", input.repo)),

  // měsíční fakturace retaineru (CZK) — sčítá se na dashboardu Finance
  setMonthlyAmount: protectedProcedure.use(requirePermission("projects", "write"))
    .input(z.object({ projectId: z.string().uuid(), amountMinor: z.bigint().nonnegative().nullable() }))
    .mutation(({ input }) => projectRepository.setMonthlyAmount(input.projectId, input.amountMinor)),

  // ruční založení projektu (Won → projekt zůstává automatika; tohle je pro retainery/ad-hoc)
  create: protectedProcedure.use(requirePermission("projects", "write"))
    .input(z.object({
      organizationId: z.string().uuid(),
      name: z.string().trim().min(1).max(200),
      projectType: z.enum(["chatbot_voicebot", "process_automation", "custom_ai"]),
      engagementType: z.enum(["one_off", "retainer"]),
    }))
    .mutation(({ input }) => projectRepository.createDirect(input)),

  // přejmenování / změna typu projektu
  update: protectedProcedure.use(requirePermission("projects", "write"))
    .input(z.object({
      projectId: z.string().uuid(),
      name: z.string().trim().min(1).max(200).optional(),
      description: z.string().max(20000).nullable().optional(),
      projectType: z.enum(["chatbot_voicebot", "process_automation", "custom_ai"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const ws = currentWorkspaceId();
      const { projectId, ...rest } = input;
      await db().update(projects).set({ ...rest, updatedAt: new Date() })
        .where(and(eq(projects.id, projectId), eq(projects.workspaceId, ws)));
    }),

  remove: protectedProcedure.use(requirePermission("projects", "manage"))
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const ws = currentWorkspaceId();
      const now = new Date().toISOString();
      await db().execute(sql`UPDATE task SET deleted_at = ${now} WHERE workspace_id = ${ws} AND project_id = ${input.projectId} AND deleted_at IS NULL`);
      await db().update(projects).set({ deletedAt: new Date(now) }).where(and(eq(projects.id, input.projectId), eq(projects.workspaceId, ws)));
      await audit.audited(ctx, "record_deleted", { type: "project", id: input.projectId });
    }),

  // finance projektu: cena, „retainer běží", evidence plateb (zálohy/doplatky)
  setFinance: protectedProcedure.use(requirePermission("projects", "write"))
    .input(z.object({ projectId: z.string().uuid(), priceMinor: z.bigint().nonnegative().nullable().optional(), retainerActive: z.boolean().optional() }))
    .mutation(({ input }) => projectRepository.setFinance(input.projectId, { priceMinor: input.priceMinor, retainerActive: input.retainerActive })),

  addPayment: protectedProcedure.use(requirePermission("projects", "write"))
    .input(z.object({ projectId: z.string().uuid(), amountMinor: z.number().int().positive(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), note: z.string().max(200).optional() }))
    .mutation(({ input }) => projectRepository.addPayment(input.projectId, { amountMinor: input.amountMinor, date: input.date, note: input.note })),

  removePayment: protectedProcedure.use(requirePermission("projects", "write"))
    .input(z.object({ projectId: z.string().uuid(), index: z.number().int().nonnegative() }))
    .mutation(({ input }) => projectRepository.removePayment(input.projectId, input.index)),
});
