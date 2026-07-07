/**
 * Modul DEALS — obchodní pipeline.
 * Soubory: deal.types.ts (DTO) · deal.validation.ts (zod) · deal.entity.ts (Drizzle + PipelineStage) ·
 *          deal.repository.ts (SQL) · deal.service.ts (moveStage, emit deal.won) · deal.router.ts (tRPC).
 * registerModule() zapojí router do api/root a workflow subscriby (deal.won → W2) do event busu.
 */
export * from "./deal.types";
export { dealService } from "./deal.service";
export { dealRepository } from "./deal.repository";
export { dealsRouter } from "./deal.router";

export function registerModule(): void {
  // eventBus.subscribe("deal.won", ...) — deleguje na workflow engine (W2, fáze 2)
}
