/**
 * Obaluje mutační procedury a zapisuje audit stopu pro sledované akce.
 * Doménové akce se sémantikou (stage/phase change, SLA override) volají audit.audited() přímo ve service —
 * middleware pokrývá generické create/delete/settings. Viz docs/security/audit-log.md.
 */
export async function auditMiddleware(): Promise<void> {
  throw new Error("auditMiddleware: implementace fáze 1 (zápis přes shared/audit).");
}
