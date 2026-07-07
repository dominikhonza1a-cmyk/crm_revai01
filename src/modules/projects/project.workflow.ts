import { eventBus } from "@/shared/event-bus";
import { projectService } from "./project.service";

/**
 * Subscriby modulu projects na eventy jiných modulů + scheduled hooky.
 * Deklaruje reakce; skutečnou práci deleguje na service.
 */
export function registerProjectWorkflows(): void {
  // W2: Won deal → projekt v draftu
  eventBus.subscribe("deal.won", async (e) => {
    void projectService; void e;
    // odvodí ctx (systémový actor) + zavolá projectService.createFromTemplate
    throw new Error("projects.workflow deal.won → createFromTemplate: fáze 2.");
  });

  // W6 (account review) a phase due kontroly běží přes scheduler (registrováno ve worker.ts).
}
