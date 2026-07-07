import { describe, it, expect } from "vitest";
import { elapsedFraction, nextEscalationStep } from "@/domain/policies/sla.policy";

/**
 * Doménové policies jsou čisté funkce → testovatelné bez DB. SLA business-hours + DST testy se doplní
 * s implementací addBusinessMinutes (fáze 2).
 */
describe("sla.policy", () => {
  it("elapsedFraction odečítá pauzy (waiting_on_client)", () => {
    const start = new Date("2026-01-01T09:00:00Z");
    const due = new Date("2026-01-01T13:00:00Z");   // 4h okno
    const now = new Date("2026-01-01T12:00:00Z");   // 3h uplynulo
    const pausedMs = 60 * 60 * 1000;                // 1h pauza
    expect(elapsedFraction(start, due, now, pausedMs)).toBeCloseTo(0.5, 5); // (3h-1h)/4h
  });

  it("nextEscalationStep respektuje již provedený escalation_level", () => {
    const steps = [{ at_pct: 75 }, { at_pct: 100 }, { at_pct: 100 }];
    expect(nextEscalationStep(0.8, steps, 0)).toBe(0); // 80% ≥ 75
    expect(nextEscalationStep(0.8, steps, 1)).toBe(null); // krok 1 (100%) ještě nedosažen
    expect(nextEscalationStep(1.1, steps, 1)).toBe(1);
  });
});
