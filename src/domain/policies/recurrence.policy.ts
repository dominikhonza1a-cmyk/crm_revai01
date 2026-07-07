/**
 * Recurrence pro retainer recurring tasky. Materializace klouzavým oknem (ne nekonečno instancí).
 * `recurrence_rule` je RFC 5545 RRULE, jen na master tasku.
 */
export interface RecurrenceInput {
  rule: string;              // RRULE, např. "FREQ=MONTHLY;BYMONTHDAY=1"
  lastDueAt: Date;           // due poslední existující instance (nebo start masteru)
  until: Date | null;        // recurrence_until
  windowEnd: Date;           // now + windowDays (config.limits.recurrenceWindowDays)
}

/**
 * Vrátí due termíny nových instancí, které mají vzniknout do windowEnd.
 * Idempotenci zajišťuje DB unique (recurrence_parent_id, due_at) — generátor smí vracet i známé termíny.
 * Implementace RRULE parseru ve fázi 2.
 */
export function nextOccurrences(_i: RecurrenceInput): Date[] {
  throw new Error("nextOccurrences: implementace ve fázi 2 (RRULE parser + window materializace).");
}

/** Editace masteru se propíše jen do BUDOUCÍCH (nevygenerovaných) instancí. */
export function affectsOnlyFuture(now: Date, instanceDueAt: Date): boolean {
  return instanceDueAt.getTime() > now.getTime();
}
