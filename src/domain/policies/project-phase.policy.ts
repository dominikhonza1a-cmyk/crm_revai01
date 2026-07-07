import type { ProjectPhaseKey, EngagementType, ProjectStatus } from "../enums";
import { InvalidTransition } from "../errors";

/**
 * Povolené sekvence fází podle typu projektu (snapshot ze šablony může fáze vynechat → skipped).
 * On-hold NENÍ fáze — je to status projektu (řeší se zvlášť).
 */
const ONE_OFF_ORDER: ProjectPhaseKey[] = ["kickoff", "discovery", "build", "test_uat", "deploy", "hypercare", "closed"];
const RETAINER_ORDER: ProjectPhaseKey[] = ["kickoff", "ongoing", "closed"];

export function phaseOrder(engagement: EngagementType): ProjectPhaseKey[] {
  return engagement === "retainer" ? RETAINER_ORDER : ONE_OFF_ORDER;
}

/** Dovolí posun na kteroukoli pozdější fázi v pořadí, nebo zpět (jen s allowBackwards). */
export function assertPhaseChange(
  engagement: EngagementType,
  from: ProjectPhaseKey | null,
  to: ProjectPhaseKey,
  allowBackwards = false,
): void {
  const order = phaseOrder(engagement);
  if (!order.includes(to)) throw new InvalidTransition(from ?? "—", to, "project phase");
  if (!from) return;
  const goingBack = order.indexOf(to) < order.indexOf(from);
  if (goingBack && !allowBackwards) throw new InvalidTransition(from, to, "project phase (zpět jen se souhlasem)");
}

/** Status draft→active potvrzuje PM (Won→projekt vznikne jako draft). */
export function assertStatusChange(from: ProjectStatus, to: ProjectStatus): void {
  const allowed: Record<ProjectStatus, ProjectStatus[]> = {
    draft: ["active", "closed"],
    active: ["on_hold", "closed"],
    on_hold: ["active", "closed"],
    closed: ["active"], // re-open
  };
  if (!allowed[from].includes(to)) throw new InvalidTransition(from, to, "project status");
}
