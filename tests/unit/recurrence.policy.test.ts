import { describe, it, expect } from "vitest";
import { nextOccurrences } from "@/domain/policies/recurrence.policy";

const d = (s: string) => new Date(s);

describe("recurrence.policy (RRULE-lite)", () => {
  it("MONTHLY;BYMONTHDAY=1 generuje první dny měsíců v okně", () => {
    const out = nextOccurrences({ rule: "FREQ=MONTHLY;BYMONTHDAY=1", lastDueAt: d("2026-01-15T09:00:00Z"), until: null, windowEnd: d("2026-04-10T00:00:00Z") });
    expect(out.map((x) => x.toISOString().slice(0, 10))).toEqual(["2026-02-01", "2026-03-01", "2026-04-01"]);
  });

  it("WEEKLY;INTERVAL=2;BYDAY=MO drží pondělí po 14 dnech", () => {
    // 2026-01-05 je pondělí
    const out = nextOccurrences({ rule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO", lastDueAt: d("2026-01-05T09:00:00Z"), until: null, windowEnd: d("2026-02-20T00:00:00Z") });
    expect(out.map((x) => x.toISOString().slice(0, 10))).toEqual(["2026-01-19", "2026-02-02", "2026-02-16"]);
    for (const x of out) expect(x.getUTCDay()).toBe(1);
  });

  it("respektuje until", () => {
    const out = nextOccurrences({ rule: "FREQ=MONTHLY;BYMONTHDAY=1", lastDueAt: d("2026-01-15T00:00:00Z"), until: d("2026-02-15T00:00:00Z"), windowEnd: d("2026-06-01T00:00:00Z") });
    expect(out).toHaveLength(1);
  });

  it("BYMONTHDAY=31 se v kratším měsíci zkrátí na poslední den", () => {
    const out = nextOccurrences({ rule: "FREQ=MONTHLY;BYMONTHDAY=31", lastDueAt: d("2026-01-31T00:00:00Z"), until: null, windowEnd: d("2026-03-05T00:00:00Z") });
    expect(out[0]!.getDate()).toBe(28); // únor 2026
  });

  it("neznámé FREQ hodí chybu", () => {
    expect(() => nextOccurrences({ rule: "FREQ=YEARLY", lastDueAt: d("2026-01-01T00:00:00Z"), until: null, windowEnd: d("2027-01-01T00:00:00Z") })).toThrow();
  });
});
