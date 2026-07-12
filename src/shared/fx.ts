import { logger } from "@/shared/logger";

/**
 * Kurzy měn → CZK z denního kurzovního lístku ČNB (bez API klíče).
 * Cache na kalendářní den; při výpadku ČNB statický fallback (přibližné kurzy).
 */
const FALLBACK: Record<string, number> = { CZK: 1, USD: 23.5, EUR: 25.0, GBP: 29.5 };

let cache: { day: string; rates: Record<string, number> } | null = null;

export async function czkRates(): Promise<Record<string, number>> {
  const day = new Date().toISOString().slice(0, 10);
  if (cache?.day === day) return cache.rates;
  try {
    const res = await fetch("https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt", { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error(`ČNB ${res.status}`);
    const text = await res.text();
    const rates: Record<string, number> = { CZK: 1 };
    // formát řádku: "USA|dolar|1|USD|23,456"
    for (const line of text.split("\n").slice(2)) {
      const [, , qty, code, rate] = line.split("|");
      if (code && rate && qty) rates[code] = parseFloat(rate.replace(",", ".")) / parseInt(qty, 10);
    }
    cache = { day, rates };
    return rates;
  } catch (err) {
    logger.warn("ČNB kurzy nedostupné — používám fallback", { err: String(err) });
    return FALLBACK;
  }
}

/** Převod minor units (centy/haléře) dané měny na CZK minor units (haléře). */
export function toCzkMinor(amountMinor: bigint, currency: string, rates: Record<string, number>): bigint {
  const rate = rates[currency.toUpperCase()] ?? FALLBACK[currency.toUpperCase()] ?? 1;
  return BigInt(Math.round(Number(amountMinor) * rate));
}
