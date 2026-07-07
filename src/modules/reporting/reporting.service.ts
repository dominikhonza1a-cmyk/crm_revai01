import type { TenantContext } from "@/shared";

/**
 * Read-only agregační dotazy pro widgety. Jediný (spolu s GDPR joby), kdo smí číst i soft-deleted řádky.
 * Těžké agregace → materializované pohledy / denní snapshot (fáze 3); v MVP přímý dotaz.
 */
export interface ReportingService {
  widget(ctx: TenantContext, widgetKey: string, params?: Record<string, unknown>): Promise<unknown>;
  getLayout(ctx: TenantContext, userId: string): Promise<unknown>;
  saveLayout(ctx: TenantContext, userId: string, layout: unknown): Promise<void>;
}

export const reportingService: ReportingService = {
  async widget(_ctx, key) { void key; throw new Error("reportingService.widget: fáze 1 (3 statické) → fáze 3 (katalog + drill-down)."); },
  async getLayout() { throw new Error("reportingService.getLayout: fáze 3."); },
  async saveLayout() { throw new Error("reportingService.saveLayout: fáze 3."); },
};
