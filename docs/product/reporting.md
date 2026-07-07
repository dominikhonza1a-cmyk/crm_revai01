# 8. Reporting a analytika

## Princip: dashboard = reporting
Žádná samostatná „Reporty" sekce. Dashboard je **mřížka přeskládatelných widgetů** (drag & resize, layout
per-user, `dashboard_layout` entita). Horní řada = velké/detailní widgety, níže kompaktní. Každý widget má
**drill-down** — klik vede do filtrovaného pohledu (kanban/list/detail). Katalog widgetů → tlačítko „Přidat widget".

> **MVP:** 3 statické widgety (Moje práce, Pipeline value, SLA at risk). Přeskládání + plný katalog + drill-down = fáze 3.

## Dashboardy a KPI

### Sales
- **Pipeline value by stage** (sloupce = suma `amount_minor`; drill → kanban filtrovaný na stage).
- **Win-rate** (won / (won+lost)) za období.
- **Forecast** (Σ `amount × probability`, `expected_close_date` v období).
- **Avg. doba ve fázi** (z `stage_entered_at` historie) — kde se dealy zasekávají.
- **Lost reasons** (rozpad `lost_reason`).

### Delivery
- **Stav projektů** (on-track / at-risk / late) dle skluzu fází a overdue tasků.
- **Overdue tasky** (počet + seznam; drill → task view).
- **Skluzy milníků** (fáze s `due_date < now` a `status != done`).
- **Vytížení lidí** (open tasky per assignee) — jednoduchý capacity náhled.

### Support & SLA
- **Otevřené tickety** (`type=support`, status ≠ done) dle priority.
- **SLA compliance** (met / breached za období, per tier).
- **Avg. doba odezvy / vyřešení** (z `first_responded_at`, `resolved_at`).
- **Blížící se breache** (běžící trackery ≥ 75 % okna; drill → ticket).

### Portfolio klientů
- **Revenue per klient** (Σ won dealů / retainer fee).
- **Aktivní projekty a retainery** per klient.
- **Zdraví účtu** (`health_status`, poslední aktivita, otevřené problémy) — kdo potřebuje pozornost.
- **Retaineři bez review > 30 dní** (napojeno na W6).

### Activity / adoption (interní)
- **Aktivita týmu** (logged activities, dokončené tasky za týden per uživatel).
- **Timeline pokrytí** (klienti bez aktivity > X dní) — kde se vztah „ochlazuje".

## Jak se to počítá
`reporting.service.ts` = read-only agregační dotazy (žádné mutace). Widget = `{ query, drilldownTarget, viz }`.
Těžké agregace nad velkými objemy → materializované pohledy / denní snapshot job (fáze 3), v MVP přímý dotaz.
Reporting je jediný (spolu s GDPR joby), kdo smí číst i soft-deleted řádky.
