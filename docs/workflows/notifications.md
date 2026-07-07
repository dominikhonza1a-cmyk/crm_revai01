# Notifikace

## Princip
Kritické události jdou **okamžitě** (chat + email), běžné se agregují do **denního digestu**. Vše je
per-user přenastavitelné (`NotificationPreference`). Výchozí mapování: [../../config/notification-rules.json](../../config/notification-rules.json).

## Severity a kanály (default)

| Kategorie | Severity | Kanály | Režim |
|---|---|---|---|
| `sla_breach` | critical | chat + email | immediate |
| `sla_warning` | critical | chat | immediate |
| `deal_won` | critical | chat | immediate |
| `task_overdue` | normal | chat + email | immediate |
| `mention` | normal | chat + email | immediate |
| `task_assigned` | normal | email | daily_digest |
| `deal_stage` | normal | email | daily_digest |
| `deal_stale` | normal | email | daily_digest |
| `import_finished` | normal | email | immediate |

## Doručení
`notification.service.ts` → `notify({ category, userIds, entityRef, payload })`:
1. Pro každého příjemce se načte `NotificationPreference` (fallback config default).
2. **immediate** → zapíše do `notification_outbox` s dedup klíčem `(user, category, source_id, den)`,
   worker odešle přes `ChatNotifier` / `EmailProvider` adaptéry (viz [../integrations/chat-webhook.md](../integrations/chat-webhook.md)).
3. **daily_digest** → řádek do `digest_queue`; noční `digest.job` v `digest_hour` (default 7:00 v user timezone)
   agreguje a pošle jeden email.
4. **off** → nic.

## Ochrana proti spamu
- Dedup klíč brání dvojímu doručení téže události.
- Immediate kanály mají **rate-limit per user** (`limits.immediateNotificationRatePerMinute`) — přetečení
  spadne do digestu.
- „Mention" a „assigned" se nikdy neposílají autorovi akce (nezískáváš notifikaci o vlastním kroku).
