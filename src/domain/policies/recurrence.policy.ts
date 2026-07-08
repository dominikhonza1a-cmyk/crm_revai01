/**
 * Recurrence pro retainer recurring tasky. Materializace klouzavým oknem (ne nekonečno instancí).
 * RRULE-lite: podporuje FREQ=DAILY|WEEKLY|MONTHLY, INTERVAL, BYMONTHDAY, BYDAY (jeden den), UNTIL přes pole.
 * Idempotenci zajišťuje DB unique (recurrence_parent_id, due_at) — generátor smí vracet i známé termíny.
 */
export interface RecurrenceInput {
  rule: string;              // např. "FREQ=MONTHLY;BYMONTHDAY=1" nebo "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO"
  lastDueAt: Date;           // due poslední existující instance (nebo start masteru)
  until: Date | null;        // recurrence_until
  windowEnd: Date;           // now + windowDays (config.limits.recurrenceWindowDays)
}

const DOW: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const DAY_MS = 86_400_000;

export function nextOccurrences(i: RecurrenceInput): Date[] {
  const parts: Record<string, string> = {};
  for (const kv of i.rule.split(";")) {
    const [k, v] = kv.split("=").map((s) => s?.trim().toUpperCase());
    if (k && v) parts[k] = v;
  }
  const freq = parts.FREQ;
  const interval = Math.max(1, parseInt(parts.INTERVAL ?? "1", 10) || 1);

  const out: Date[] = [];
  let cursor = new Date(i.lastDueAt);

  for (let n = 0; n < 100; n++) {
    let next: Date;
    if (freq === "DAILY") {
      next = new Date(cursor.getTime() + interval * DAY_MS);
    } else if (freq === "WEEKLY") {
      next = new Date(cursor.getTime() + interval * 7 * DAY_MS);
      const target = parts.BYDAY ? DOW[parts.BYDAY] : undefined;
      if (target != null) {
        const diff = (target - next.getDay() + 7) % 7;
        next = new Date(next.getTime() + diff * DAY_MS);
      }
    } else if (freq === "MONTHLY") {
      const d = new Date(cursor);
      const day = parts.BYMONTHDAY ? parseInt(parts.BYMONTHDAY, 10) : d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + interval);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, lastDay));   // clamp (31. v únoru → 28./29.)
      next = d;
    } else {
      throw new Error(`Nepodporované RRULE FREQ: ${freq ?? "(chybí)"}`);
    }

    if (i.until && next.getTime() > i.until.getTime()) break;
    if (next.getTime() > i.windowEnd.getTime()) break;
    out.push(next);
    cursor = next;
  }
  return out;
}

/** Editace masteru se propíše jen do BUDOUCÍCH (nevygenerovaných) instancí. */
export function affectsOnlyFuture(now: Date, instanceDueAt: Date): boolean {
  return instanceDueAt.getTime() > now.getTime();
}
