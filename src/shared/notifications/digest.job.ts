/**
 * Denní digest job (registrovaný ve scheduleru, běží každou hodinu).
 * Rozešle nahromaděné `daily_digest` notifikace uživatelům, jejichž `digest_hour` == aktuální hodina
 * v jejich timezone. Agreguje do jednoho emailu (React Email šablona).
 */
export async function runDigestJob(_nowUtc: Date): Promise<void> {
  // 1) najdi uživatele s digest_hour == teď (per timezone)
  // 2) vyber jejich digest_queue položky (od posledního digestu)
  // 3) sestav a odešli 1 email; označ položky jako sent
  throw new Error("runDigestJob: implementace fáze 2.");
}
