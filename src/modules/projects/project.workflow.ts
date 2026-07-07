import { eventBus } from "@/shared/event-bus";
import { logger } from "@/shared/logger";
import type { TenantContext } from "@/shared";
import { projectService } from "./project.service";
import { dealRepository } from "@/modules/deals/deal.repository";

/**
 * W2: Won deal → projekt v draftu ze šablony. Subscriber na event deal.won.
 * Ve fázi 1 běží in-process (synchronně v rámci requestu); fáze 2 → durable outbox + worker.
 */
export function registerProjectWorkflows(): void {
  eventBus.subscribe("deal.won", async (e) => {
    const ctx: TenantContext = { workspaceId: e.workspaceId, userId: e.actorId, requestId: "event:deal.won" };
    const deal = await dealRepository.getById(e.dealId);
    const projectType = deal?.projectTypeHint ?? "process_automation";
    const res = await projectService.createFromTemplate(ctx, {
      dealId: e.dealId, organizationId: e.organizationId, projectType,
    });
    logger.info("W2: Won deal → projekt", { dealId: e.dealId, projectId: res.projectId, created: res.created });
  });
}
