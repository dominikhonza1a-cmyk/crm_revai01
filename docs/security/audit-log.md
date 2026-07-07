# Audit log

## Vlastnosti
- **Append-only.** Aplikační DB role nemá `UPDATE`/`DELETE` grant na `audit_log`. Mazání jen retenční
  partition-drop job (privilegovaná role).
- **Diff jen citlivých polí.** `changes jsonb` drží `{field: {from, to}}` pouze pro sledovaná pole, ne celé řádky.
- **Kontext.** `context jsonb` = `{ ip, user_agent, request_id }` pro dohledatelnost.

## Co se loguje (`action` enum)
`permission_changed` · `role_assigned` · `user_deactivated` · `export_executed` · `record_deleted` ·
`record_hard_deleted` · `gdpr_erasure` · `gdpr_export` · `deal_stage_changed` · `project_phase_changed` ·
`project_status_changed` · `sla_policy_changed` · `sla_overridden` · `document_secret_ref_changed` ·
`integration_connected` · `integration_revoked` · `import_executed` · `settings_changed`.

## Jak se zapisuje
`audit.middleware.ts` obalí mutační tRPC procedury a zavolá `audit.service.audited(ctx, action, entityRef, diff)`.
Doménové akce (stage/phase change, SLA override) volají `audited()` explicitně ve service vrstvě, protože znají
sémantiku změny.

```ts
await audit.audited(ctx, "deal_stage_changed", { type: "deal", id: deal.id }, {
  pipeline_stage_id: { from: prev, to: next },
});
```

## Retence
Běžné záznamy 3 roky; `permission_changed`, `export_executed`, `gdpr_*` 5 let. Měsíční partitions →
retence = `DROP PARTITION` (levné, žádné hromadné DELETE). Partitioning se zapne od ~1M řádků.

## Čtení
Jen role s `audit: read` (default admin) a jen v Settings → Audit log. Filtrování dle `action`, `actor`,
`entity_type`, období. Audit log **není** součást běžné timeline (ta je pro tým, audit je pro compliance).
