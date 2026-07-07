/**
 * Retenční job (noční). NEMAŽE automaticky — plní "Retention review" frontu, admin schválí dávku.
 * Lhůty z config/default.json → retentionDefaults (per-workspace override). Viz docs/security/gdpr.md.
 */
export async function runRetentionReview(_nowUtc: Date): Promise<void> {
  // najdi kandidáty dle kategorií:
  //  - leady bez konverze: last_activity_at < now - leadNoConversionMonths
  //  - komunikace prospektu: > 18 měs.
  //  - audit logy po lhůtě → partition drop (privilegovaná role)
  // zapiš do retention_review_queue; admin v Nastavení → GDPR schválí → volá erasure.
  throw new Error("runRetentionReview: implementace fáze 3.");
}
