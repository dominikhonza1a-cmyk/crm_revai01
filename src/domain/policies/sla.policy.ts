import type { Priority, SlaMetric } from "../enums";

/**
 * Výpočet SLA deadlinů a breach-risku. Čisté funkce nad business hours policy.
 * Časy v UTC; business hours nesou vlastní timezone (policy, ne server).
 */
export interface BusinessHours {
  timezone: string;                        // např. Europe/Prague
  days: Partial<Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", [string, string]>>;
  holidayCalendar?: string;                // klíč do svátkového číselníku (data, ne kód)
  use247?: boolean;                        // některé P1 běží 24/7
}

export interface SlaTargets {
  [priority: string]: { first_response_min: number; resolution_min: number };
}

/**
 * Přičte `minutes` pracovních minut k `start` (UTC) v rámci business hours policy.
 * Implementace ve fázi 2 (knihovna + svátky). Testy na DST přechody jsou v tests/unit.
 */
export function addBusinessMinutes(_start: Date, _minutes: number, _bh: BusinessHours): Date {
  throw new Error("addBusinessMinutes: implementace ve fázi 2 (business-hours + holiday calendar).");
}

export function slaDueAt(start: Date, priority: Priority, metric: SlaMetric, targets: SlaTargets, bh: BusinessHours): Date {
  const t = targets[priority];
  if (!t) throw new Error(`Chybí SLA target pro prioritu ${priority}`);
  const minutes = metric === "first_response" ? t.first_response_min : t.resolution_min;
  if (bh.use247) return new Date(start.getTime() + minutes * 60_000);
  return addBusinessMinutes(start, minutes, bh);
}

/** Podíl uplynulého času (0..1+) s odečtením pauz (waiting_on_client). */
export function elapsedFraction(startedAt: Date, dueAt: Date, now: Date, pausedTotalMs: number): number {
  const total = dueAt.getTime() - startedAt.getTime();
  if (total <= 0) return 1;
  const elapsed = now.getTime() - startedAt.getTime() - pausedTotalMs;
  return elapsed / total;
}

/** Který eskalační krok se má spustit (podle at_pct a už provedeného escalation_level). */
export function nextEscalationStep(
  fraction: number,
  steps: { at_pct: number }[],
  currentLevel: number,
): number | null {
  for (let i = currentLevel; i < steps.length; i++) {
    if (fraction * 100 >= steps[i]!.at_pct) return i;
  }
  return null;
}
