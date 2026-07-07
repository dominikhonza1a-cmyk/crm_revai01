/**
 * Katalog widgetů dashboardu. Widget = { query, drilldownTarget, viz }. Dashboard = reporting (žádná zvláštní sekce).
 * Přeskládatelné (dnd-kit), layout per-user v dashboard_layout. Viz docs/product/reporting.md.
 */
export interface WidgetDefinition {
  key: string;
  title: string;
  category: "sales" | "delivery" | "support" | "portfolio" | "activity";
  viz: "number" | "bar" | "list" | "gauge";
  drilldownTarget?: string;          // route + filtr (klik → filtrovaný pohled)
  size: "sm" | "md" | "lg";          // lg patří do horní řady (detailnější)
}

export const WIDGET_CATALOG: WidgetDefinition[] = [
  { key: "my_work", title: "Moje dnešní práce", category: "activity", viz: "list", size: "lg", drilldownTarget: "/tasks?view=my_work" },
  { key: "pipeline_value", title: "Pipeline value by stage", category: "sales", viz: "bar", size: "lg", drilldownTarget: "/deals" },
  { key: "sla_at_risk", title: "SLA at risk", category: "support", viz: "list", size: "lg", drilldownTarget: "/tasks?view=ticket_queue" },
  { key: "win_rate", title: "Win-rate", category: "sales", viz: "number", size: "sm" },
  { key: "forecast", title: "Forecast", category: "sales", viz: "number", size: "sm" },
  { key: "projects_status", title: "Stav projektů", category: "delivery", viz: "bar", size: "md" },
  { key: "overdue_tasks", title: "Overdue tasky", category: "delivery", viz: "list", size: "md" },
  { key: "sla_compliance", title: "SLA compliance", category: "support", viz: "gauge", size: "sm" },
  { key: "revenue_per_client", title: "Revenue per klient", category: "portfolio", viz: "bar", size: "md" },
  { key: "retainers_no_review", title: "Retaineři bez review >30 dní", category: "portfolio", viz: "list", size: "md" },
];
