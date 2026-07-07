/**
 * Seed SLA politik. Support tiery per klient + delivery default + sales_followup.
 * Časy v minutách; business hours nesou timezone policy. Viz docs/workflows/sla.md.
 */
const CZ_HOURS = { timezone: "Europe/Prague", days: { mon: ["09:00", "17:00"], tue: ["09:00", "17:00"], wed: ["09:00", "17:00"], thu: ["09:00", "17:00"], fri: ["09:00", "17:00"] }, holidayCalendar: "cz" };

const ESCALATION = [
  { at_pct: 75, notify: ["assignee"], channels: ["chat"] },
  { at_pct: 100, notify: ["assignee", "project_owner"], channels: ["chat", "email"] },
  { at_pct: 100, delay_min: 120, notify: ["admins"], channels: ["chat", "email"] },
];

export const slaPolicySeeds = [
  {
    name: "Support – Basic", appliesTo: "support", tier: "basic", isDefault: true, useBusinessHours: true, businessHours: CZ_HOURS,
    targets: { p1: { first_response_min: 480, resolution_min: 4320 }, p2: { first_response_min: 1440, resolution_min: 7200 }, p3: { first_response_min: 2880, resolution_min: 14400 } },
    escalationRules: ESCALATION,
  },
  {
    name: "Support – Standard", appliesTo: "support", tier: "standard", isDefault: false, useBusinessHours: true, businessHours: CZ_HOURS,
    targets: { p1: { first_response_min: 240, resolution_min: 1440 }, p2: { first_response_min: 480, resolution_min: 4320 }, p3: { first_response_min: 1440, resolution_min: 7200 } },
    escalationRules: ESCALATION,
  },
  {
    name: "Support – Premium", appliesTo: "support", tier: "premium", isDefault: false, useBusinessHours: false,
    businessHours: { ...CZ_HOURS, days: { ...CZ_HOURS.days, mon: ["08:00", "18:00"] }, use247: true },
    targets: { p1: { first_response_min: 60, resolution_min: 480 }, p2: { first_response_min: 240, resolution_min: 1440 }, p3: { first_response_min: 480, resolution_min: 4320 } },
    escalationRules: ESCALATION,
  },
  {
    name: "Delivery – Default", appliesTo: "delivery", tier: null, isDefault: true, useBusinessHours: true, businessHours: CZ_HOURS,
    targets: { p1: { first_response_min: 0, resolution_min: 0 } }, escalationRules: ESCALATION,
  },
] as const;

export async function seedSlaTiers(): Promise<void> {
  throw new Error("seedSlaTiers: implementace fáze 0.");
}
