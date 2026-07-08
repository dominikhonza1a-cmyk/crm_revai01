/**
 * Výchozí mapování událost → kanál/režim (nahrazuje dřívější notification-rules.json —
 * TS modul se bez problémů bundluje v Next i tsx). Per-user preference = pozdější rozšíření.
 */
export const notificationRules = {
  categories: {
    sla_breach: { severity: "critical", channels: ["chat", "email"], mode: "immediate" },
    sla_warning: { severity: "critical", channels: ["chat"], mode: "immediate" },
    deal_won: { severity: "critical", channels: ["chat"], mode: "immediate" },
    task_assigned: { severity: "normal", channels: ["email"], mode: "daily_digest" },
    task_overdue: { severity: "normal", channels: ["chat", "email"], mode: "immediate" },
    deal_stage: { severity: "normal", channels: ["email"], mode: "daily_digest" },
    deal_stale: { severity: "normal", channels: ["email"], mode: "daily_digest" },
    mention: { severity: "normal", channels: ["chat", "email"], mode: "immediate" },
    import_finished: { severity: "normal", channels: ["email"], mode: "immediate" },
    digest: { severity: "normal", channels: ["email"], mode: "daily_digest" },
  },
} as const;
