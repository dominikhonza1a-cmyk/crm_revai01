# UI vrstva (src/ui)

Prezentace odděleně od `src/app` (Next.js routing = tenká slupka). Kompletní UX viz
[../../docs/product/architecture-overview.md](../../docs/product/architecture-overview.md).

## layout/
- `AppShell.tsx` — hlavní rám (sidebar + topbar + content).
- `Sidebar.tsx` — **6 položek**: Dashboard · Klienti · Obchod · Projekty · Úkoly · Nastavení.
- `Topbar.tsx` — workspace switcher (SaaS), profil, notifikační zvoneček.
- `CommandPalette.tsx` — `Cmd+K` fulltext přes entity + „+ Nový".

## components/ (znovupoužitelné)
`DataTable` · `KanbanBoard` (deals i tasks) · `TimelineFeed` · `WidgetGrid` (dnd-kit, drag+resize) ·
`CustomFieldsForm` (renderuje pole dle definic) · `TagPicker` · `CsvImportWizard` (upload→mapping→dry-run→commit) ·
`SlaBadge` (countdown/breach) · `EntityTabs`.

## pages/
- `dashboard/` — `DashboardPage` + `widgets/*` (přeskládatelné; horní = detailní).
- `clients/` — `ClientListPage`, `ClientDetailPage` + taby: Overview · **Projekty (sub-karty)** · Kontakty · Timeline · Dokumenty · Dealy.
- `deals/` — `DealPipelinePage` (kanban, drop na Won → dialog „Vytvořit projekt?"), `DealDetailDrawer`.
- `projects/` — `ProjectDetailPage` + fáze-stepper + taby: Overview · Tasky (+ tickety s SLA) · Timeline · Dokumenty · Integrace · SLA.
- `tasks/` — `MyWorkPage`, `TaskBoardPage`, `TicketQueuePage` (řazeno dle SLA due).
- `settings/` — Users&Roles · Pipeline · Fáze&Šablony · Custom fields&Tagy · Integrace · Notifikace · Workflows · Import · GDPR · Audit log.

## hooks/
`useTenant` · `usePermission` (skrývá akce dle role) · `useWidgetLayout` (per-user layout dashboardu).
