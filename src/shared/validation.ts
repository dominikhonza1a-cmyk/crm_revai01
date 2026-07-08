import { z } from "zod";

/**
 * Benevolentní URL: uživatel smí zadat „www.firma.cz" i „firma.cz" — protokol https:// se doplní
 * automaticky. Teprve pak se validuje jako URL (s českou hláškou).
 */
export const urlish = z.string().trim()
  .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
  .pipe(z.string().url({ message: "Neplatná webová adresa" }));
