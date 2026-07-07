# 4. Workflowy a automatizace

Každý workflow je deklarativní definice (`src/workflows/definitions/*.workflow.ts`) se strukturou
**trigger → conditions → actions**. Engine (viz [engine.md](engine.md)) je vyhodnocuje idempotentně a každý
běh loguje do `workflow_runs`. Notifikace viz [notifications.md](notifications.md), SLA viz [sla.md](sla.md).

---

## W1 — Lead lifecycle (Lead → Qualified → Proposal → Won/Lost)
Není to jeden automatický workflow, ale řízený přechod stagí s pravidly (`deal-stage.policy`).
- **Trigger:** uživatel táhne deal mezi stagemi (UI) nebo `deals.moveStage`.
- **Conditions:** povolený přechod dle policy; při přechodu do `Lost` **povinný `lost_reason`**.
- **Actions:** `deal.stage_entered_at = now()` (reset stale hodin), zápis `TimelineEvent(deal_stage_changed)`,
  přepočet `probability` z `PipelineStage.probability_default`.
- **Exceptions:** zpětný přechod povolen jen adminovi/ownerovi (policy).
- **Notifikace:** `deal_stage` (digest); `deal_won` (immediate chat).
- **Audit:** `audit_log(deal_stage_changed)`.

## W2 — Won deal → vytvoření projektu (draft)
- **Trigger:** event `deal.won` (deal vstoupil do stage `kind=won`).
- **Conditions:** `deal.created_project_id IS NULL` (idempotence), `amount_minor > 0` (volitelná guard).
- **Actions:** v transakci se `SELECT … FOR UPDATE` dealu: vytvoř `Project(status=draft)` ze šablony dle
  `deal.project_type_hint`, provisionuj fáze + tasky ze šablony (W3), nastav `deal.created_project_id`,
  zapiš `TimelineEvent(project_created)`.
- **Exceptions:** chybějící šablona pro daný typ → projekt vznikne bez fází + task „Doplnit šablonu projektu" pro PM.
- **Notifikace:** `task_assigned`/immediate PM ownerovi („Nový projekt v draftu — potvrď tým a termíny").
- **Audit:** implicitně přes `record` create + `deal_stage_changed`.

## W3 — Projekt → task template provisioning
- **Trigger:** vznik projektu (z W2) nebo ruční „Aplikovat šablonu".
- **Conditions:** projekt nemá dosud fáze/tasky ze šablony.
- **Actions:** **zkopíruj** (snapshot) fáze z `ProjectTemplate.phases` do `ProjectPhase`; z `TaskTemplate`
  vytvoř `Task` s `due_at = start_date + phase.offset + task.offset_days`, přiřaď dle `default_assignee_role`
  (nejbližší uživatel s rolí / nechá nepřiřazené). Recurring TaskTemplate → vytvoř master task s `recurrence_rule`.
- **Exceptions:** žádný uživatel s cílovou rolí → task nepřiřazen, upozornění PM.
- **Notifikace:** —(souhrn v W2).
- **Audit:** — (běžný create).

## W4 — Overdue tasks → reminder + eskalace
- **Trigger:** scheduler (cron ~ každých 15 min) + `metric=due_date` SLATracker.
- **Conditions:** `task.status NOT IN (done, canceled)` a `now() > due_at` (příp. `now() > due_at - 24h` pro warning).
- **Actions:** vytvoř/aktualizuj `SLATracker(metric=due_date)`; dle `escalation_rules`: T-24h warning assignee,
  po due assignee+PM, +2h po due admini; zapiš `TimelineEvent(task_overdue)`.
- **Exceptions:** `waiting_on_client` pauzuje (nepočítá se jako overdue).
- **Notifikace:** `task_overdue` (immediate chat+email dle stupně).
- **Audit:** — (eskalace se loguje do `workflow_runs`; `sla_overridden` jen při manuálním posunu).

## W5 — Support SLA breach risk
- **Trigger:** scheduler (~ každých 5 min) nad běžícími `SLATracker(metric in first_response, resolution)`.
- **Conditions:** `elapsed / window >= at_pct` daného eskalačního kroku a krok ještě neproběhl (`escalation_level`).
- **Actions:** pošli eskalaci dle kroku, inkrementuj `escalation_level`; při 100 % zapiš `TimelineEvent(sla_breached)`
  a `SLATracker.breached_at`.
- **Exceptions:** `waiting_on_client` pauzuje oba trackery (`paused_total_ms`); business hours mimo okno nepočítají.
- **Notifikace:** `sla_warning` (75 %, immediate chat), `sla_breach` (100 %, immediate chat+email).
- **Audit:** `sla_overridden` při manuálním posunu `due_at`.

## W6 — Recurring account review (retainer)
- **Trigger:** scheduler (denně) + retainer projekty ve fázi `ongoing`.
- **Conditions:** `engagement_type=retainer` a (neexistuje review task v aktuálním období **nebo** poslední review > perioda).
- **Actions:** vytvoř task „Account review {měsíc}" pro PM, přilož checklist (viz [../templates/onboarding-and-templates.md](../templates/onboarding-and-templates.md)),
  zapiš `TimelineEvent(task_created)`.
- **Exceptions:** projekt `on_hold`/`closed` → přeskoč.
- **Notifikace:** `task_assigned` (digest).
- **Audit:** — .

## W7 — Recurring tasks materializace
- **Trigger:** scheduler (denně) + dokončení předchozí instance.
- **Conditions:** master task s `recurrence_rule`, další výskyt spadá do okna 60 dní, `recurrence_until` nepřekročeno.
- **Actions:** vytvoř další instanci s `recurrence_parent_id`; unique `(recurrence_parent_id, due_at)` brání duplikátu.
- **Exceptions:** editace masteru mění jen **budoucí** (nevygenerované) instance.
- **Notifikace:** `task_assigned` při vzniku instance (dle preference).
- **Audit:** — .

## W8 — Sales stale-deal reminder
- **Trigger:** scheduler (noční).
- **Conditions:** `now() > deal.stage_entered_at + pipeline_stage.stale_after_days` a `last_activity_at` starší než práh.
- **Actions:** vytvoř `Reminder(source=stale_deal_rule)` ownerovi dealu. (Záměrně bez SLATrackeru — plné SLA overkill.)
- **Notifikace:** `deal_stale` (digest).
- **Audit:** — .

## W9 — Externí události → timeline (email / meeting / Git / webhook)
- **Trigger:** příchozí webhook (`/api/webhooks/{provider}`) nebo email sync.
- **Conditions:** ověřený podpis / platný účet; spárování na entitu (email↔kontakt/deal, git↔projekt).
- **Actions:** email → `Activity(type=email)` + `TimelineEvent(email_received/sent)`; meeting → `TimelineEvent(meeting_held)`;
  git push/PR → `TimelineEvent(git_push)`; generický webhook → `TimelineEvent(webhook_received)`.
- **Exceptions:** nespárováno → event se přiřadí na workspace „inbox" k ručnímu dořešení, ne zahodí.
- **Notifikace:** `mention` pokud je zmíněn uživatel; jinak žádná (jen zápis).
- **Audit:** `integration_connected/revoked` u změny připojení, ne u každého eventu.
