# SLA model

## Na co se SLA váže — support ticket = `Task` s `type=support`
Žádná samostatná Ticket entita. Tickety sdílejí s tasky ~90 % chování (assignee, status, priorita, due,
komentáře, timeline, tagy). Support-specifická pole (`reporter_contact_id`, `channel`, `first_responded_at`,
`resolved_at`) jsou nullable sloupce. „Support fronta" = filtr `type=support`. Drží to princip „nezahltit".

## Tři režimy `SLAPolicy.applies_to`

### 1) support — tiery per klient
`organization.support_sla_policy_id` (fallback workspace default). Při vzniku tasku `type=support` vzniknou
**dva** SLATrackery: `first_response` a `resolution`, `due_at` spočtené v business hours policy.

| Tier | P1 response / resolution | P2 | P3 | Business hours |
|---|---|---|---|---|
| Basic | 8 h / 3 dny | 24 h / 5 dní | 48 h / 10 dní | 9–17 Po–Pá |
| Standard | 4 h / 1 den | 8 h / 3 dny | 24 h / 5 dní | 9–17 Po–Pá |
| Premium | 1 h / 8 h | 4 h / 1 den | 8 h / 3 dny | P1 24/7, jinak 8–18 Po–Pá |

- `first_response` splní první odchozí Activity/komentář assignee.
- `resolution` splní `status=done`.
- `status=waiting_on_client` **pauzuje** oba trackery (`paused_total_ms`), neposouvá `due_at`.

### 2) delivery — overdue eskalace
Tasky `type=delivery` s `due_at`. Tracker `metric=due_date` vzniká **lazy** (při T-24h warning / při překročení).
Workspace default, per-projekt override `project.delivery_sla_policy_id`.

### 3) sales_followup — stale deal
**Záměrně bez SLATrackeru.** Noční job porovná `deal.stage_entered_at + pipeline_stage.stale_after_days` vs.
`last_activity_at` → vytvoří `Reminder`. Plné SLA by tu bylo overkill.

## Eskalační kroky (`escalation_rules jsonb`, scheduler ~5 min)
```json
[
 {"at_pct": 75,  "notify": ["assignee"],                  "channels": ["chat"]},
 {"at_pct": 100, "notify": ["assignee", "project_owner"], "channels": ["chat", "email"]},
 {"at_pct": 100, "delay_min": 120, "notify": ["admins"],  "channels": ["chat", "email"]}
]
```
Každý krok inkrementuje `escalation_level` (idempotence). Breach → `TimelineEvent(sla_breached)` +
notifikace `sla_breach`. Manuální posun `due_at` = `audit_log(sla_overridden)`.

## Časové zóny a business hours (past → řešení)
- Vše v **UTC**; `due_at` se počítá knihovnou nad `business_hours jsonb` (timezone **policy**, ne serveru).
- Český svátkový kalendář jako **data**, ne kód.
- DST řeší timezone-aware výpočet; testy na přechody času jsou součást scaffoldu (`tests/unit`).
