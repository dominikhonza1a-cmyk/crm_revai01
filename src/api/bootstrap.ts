import { eventBus } from "@/shared/event-bus";
import { loadConfig } from "@/config/app.config";
import { registerProjectWorkflows } from "@/modules/projects/project.workflow";
import { securityRepository } from "@/modules/security/security.repository";
import { dealRepository } from "@/modules/deals/deal.repository";
import { notifications } from "@/shared/notifications/notification.service";

/**
 * Zaregistruje event subscribery (workflow) jednou při startu procesu (web i worker).
 * Volá se side-effectem z api/root.ts a z worker.ts.
 */
let done = false;
export function bootstrap(): void {
  if (done) return;
  done = true;
  registerProjectWorkflows();       // W2: deal.won → projekt draft

  // Won deal → okamžitá chat notifikace adminům (kategorie deal_won, viz config/notification-rules.ts)
  eventBus.subscribe("deal.won", async (e) => {
    const deal = await dealRepository.getById(e.dealId);
    await notifications.notify({
      category: "deal_won",
      userIds: await securityRepository.listAdminUserIds(),
      title: `🏆 Deal vyhrán: „${deal?.title ?? e.dealId}"`,
      body: "Projekt vznikl v draftu ze šablony — potvrď tým a termíny.",
      link: `${loadConfig().APP_URL}/projects`,
      sourceId: e.dealId,
    });
  });
}
