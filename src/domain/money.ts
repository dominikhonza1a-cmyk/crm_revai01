/**
 * Peníze jako celé číslo v minoritní jednotce (haléře/centy) + ISO měna. NIKDY float.
 */
export interface Money {
  readonly amountMinor: bigint;
  readonly currency: string; // ISO 4217, char(3)
}

export const money = (amountMinor: bigint | number, currency: string): Money => ({
  amountMinor: typeof amountMinor === "number" ? BigInt(Math.round(amountMinor)) : amountMinor,
  currency: currency.toUpperCase(),
});

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}

/** Vážená hodnota (forecast): amount × probability%. Zaokrouhlení dolů na celý haléř. */
export function weighted(a: Money, probabilityPct: number): Money {
  return { amountMinor: (a.amountMinor * BigInt(Math.round(probabilityPct))) / 100n, currency: a.currency };
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) throw new Error(`Nelze kombinovat měny ${a.currency} a ${b.currency}`);
}
