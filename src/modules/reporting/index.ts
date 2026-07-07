/**
 * Modul REPORTING — dashboard = reporting. Přeskládatelné widgety s drill-down.
 * Soubory: widget-definition.ts (katalog) · dashboard-layout.entity.ts (per-user layout) ·
 *          reporting.service.ts (read-only agregace) · reporting.router.ts.
 * MVP: 3 statické widgety; přeskládání + katalog + drill-down = fáze 3.
 */
export { reportingService } from "./reporting.service";
export { WIDGET_CATALOG } from "./widget-definition";
export function registerModule(): void {}

export const REPORTING_ROUTER_NOTE = "reporting.{widget,getLayout,saveLayout}; dashboard s přeskládáním.";
