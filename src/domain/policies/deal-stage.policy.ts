import type { StageKind } from "../enums";
import { InvalidTransition, ValidationFailed } from "../errors";

/**
 * Pravidla přechodu deal stage. Čistá funkce — žádná DB.
 * Pořadí stagí je dané `position` v PipelineStage; sem chodí už zjištěné metainfo.
 */
export interface StageInfo {
  id: string;
  position: number;
  kind: StageKind; // open | won | lost
}

export interface DealStageChange {
  from: StageInfo | null;
  to: StageInfo;
  lostReason: string | null;
  actorIsAdminOrOwner: boolean;
}

/**
 * Vrátí true, nebo hodí DomainError. Pravidla:
 * - do `lost` je povinný lostReason,
 * - zpětný přechod (na nižší position, nebo z terminálního won/lost) smí jen admin/owner,
 * - přechod z terminálního stavu obecně jen admin/owner (re-open).
 */
export function assertDealStageChange(c: DealStageChange): void {
  if (c.to.kind === "lost" && !c.lostReason) {
    throw new ValidationFailed("Při přechodu do 'Lost' je povinný důvod (lost_reason).");
  }
  const goingBackwards = c.from && c.to.position < c.from.position;
  const fromTerminal = c.from && c.from.kind !== "open";
  if ((goingBackwards || fromTerminal) && !c.actorIsAdminOrOwner) {
    throw new InvalidTransition(c.from?.id ?? "—", c.to.id, "deal stage (jen admin/owner)");
  }
}

/** Emise eventu deal.won při vstupu do stage kind=won. */
export const isWinTransition = (c: DealStageChange): boolean =>
  c.to.kind === "won" && c.from?.kind !== "won";
