import { eventBus } from "@/shared/event-bus";

/**
 * W9 (částečně): projekce doménových eventů do timeline. Activities modul naslouchá KLÍČOVÝM eventům
 * a zapisuje TimelineEvent (jediný zapisovač). Email/Git/webhook zdroje řeší integrations modul.
 */
export function registerActivityWorkflows(): void {
  const projected = [
    "deal.stage_changed", "deal.won", "deal.lost",
    "project.created", "project.phase_changed",
    "task.completed", "task.overdue", "ticket.opened", "sla.breached", "document.linked",
  ] as const;
  for (const type of projected) {
    eventBus.subscribe(type, async (_e) => {
      // activityService.writeTimeline(mapEventToTimeline(e))
      throw new Error(`activities.workflow: projekce ${type} → timeline (fáze 1).`);
    });
  }
}
