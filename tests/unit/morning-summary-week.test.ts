import { describe, it, expect } from "vitest";
import { weekBuckets } from "@/workflows/jobs";

type T = { title: string; dueAt: Date | null; priority: string; type: string; description: string | null; clientName: string | null; projectName: string | null };
const task = (title: string, dueAt: Date | null): T => ({ title, dueAt, priority: "p3", type: "delivery", description: null, clientName: null, projectName: null });

/**
 * Ranní souhrn tahá jen aktuální týden (po–ne). Ověřujeme rozdělení:
 * - úkoly po termínu (dueAt < dnešní půlnoc) → overdue (nesplněné)
 * - úkoly dnes → neděle → thisWeek
 * - úkoly příští týden a dál → mimo (nechodí)
 * - bez termínu → noDue
 */
describe("weekBuckets — jen aktuální týden", () => {
  // referenční „teď" = středa 2026-07-15 10:00 (týden po 07-13 … ne 07-19)
  const now = new Date("2026-07-15T10:00:00");

  it("úkol z pondělí (nesplněný) padne do overdue", () => {
    const b = weekBuckets([task("pondělní", new Date("2026-07-13T09:00:00"))], now);
    expect(b.overdue.map((t) => t.title)).toEqual(["pondělní"]);
    expect(b.thisWeek).toHaveLength(0);
  });

  it("úkoly dnes až neděli jsou v thisWeek", () => {
    const b = weekBuckets([
      task("dnes", new Date("2026-07-15T15:00:00")),
      task("pátek", new Date("2026-07-17T09:00:00")),
      task("neděle", new Date("2026-07-19T23:00:00")),
    ], now);
    expect(b.thisWeek.map((t) => t.title).sort()).toEqual(["dnes", "neděle", "pátek"]);
    expect(b.overdue).toHaveLength(0);
  });

  it("úkoly příštího týdne a dál se do souhrnu nedostanou", () => {
    const b = weekBuckets([
      task("příští pondělí", new Date("2026-07-20T09:00:00")),
      task("za měsíc", new Date("2026-08-15T09:00:00")),
    ], now);
    expect(b.overdue).toHaveLength(0);
    expect(b.thisWeek).toHaveLength(0);
    expect(b.noDue).toHaveLength(0);
  });

  it("úkoly bez termínu jdou do noDue", () => {
    const b = weekBuckets([task("kdykoliv", null)], now);
    expect(b.noDue.map((t) => t.title)).toEqual(["kdykoliv"]);
  });

  it("konec týdne = nejbližší neděle 23:59 (lokální čas, jako v runtime)", () => {
    const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const we = weekBuckets([], now).weekEnd;
    expect(we.getDay()).toBe(0);        // neděle
    expect(ymd(we)).toBe("2026-07-19");
    // v neděli je konec týdne tentýž den
    expect(ymd(weekBuckets([], new Date("2026-07-19T08:00:00")).weekEnd)).toBe("2026-07-19");
  });
});
