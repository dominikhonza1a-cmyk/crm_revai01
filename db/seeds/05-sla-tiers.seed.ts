import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { slaPolicies } from "@/modules/tasks/task.entity";

/**
 * Seed SLA politik. Support tiery per klient + delivery default. Časy v minutách. Viz docs/workflows/sla.md.
 * FÁZE 1: due_at se počítá jednoduše (wall-clock); business-hours-aware výpočet + eskalace = fáze 2.
 */
const CZ_HOURS = { timezone: "Europe/Prague", days: { mon: ["09:00", "17:00"], tue: ["09:00", "17:00"], wed: ["09:00", "17:00"], thu: ["09:00", "17:00"], fri: ["09:00", "17:00"] }, holidayCalendar: "cz" };
const ESCALATION = [
  { at_pct: 75, notify: ["assignee"], channels: ["chat"] },
  { at_pct: 100, notify: ["assignee", "project_owner"], channels: ["chat", "email"] },
  { at_pct: 100, delay_min: 120, notify: ["admins"], channels: ["chat", "email"] },
];

export const slaPolicySeeds = [
  { name: "Support – Basic", appliesTo: "support", tier: "basic", isDefault: true, useBusinessHours: true, businessHours: CZ_HOURS,
    targets: { p1: { first_response_min: 480, resolution_min: 4320 }, p2: { first_response_min: 1440, resolution_min: 7200 }, p3: { first_response_min: 2880, resolution_min: 14400 }, p4: { first_response_min: 2880, resolution_min: 14400 } }, escalationRules: ESCALATION },
  { name: "Support – Standard", appliesTo: "support", tier: "standard", isDefault: false, useBusinessHours: true, businessHours: CZ_HOURS,
    targets: { p1: { first_response_min: 240, resolution_min: 1440 }, p2: { first_response_min: 480, resolution_min: 4320 }, p3: { first_response_min: 1440, resolution_min: 7200 }, p4: { first_response_min: 1440, resolution_min: 7200 } }, escalationRules: ESCALATION },
  { name: "Support – Premium", appliesTo: "support", tier: "premium", isDefault: false, useBusinessHours: false, businessHours: { ...CZ_HOURS, use247: true },
    targets: { p1: { first_response_min: 60, resolution_min: 480 }, p2: { first_response_min: 240, resolution_min: 1440 }, p3: { first_response_min: 480, resolution_min: 4320 }, p4: { first_response_min: 480, resolution_min: 4320 } }, escalationRules: ESCALATION },
  { name: "Delivery – Default", appliesTo: "delivery", tier: null, isDefault: true, useBusinessHours: true, businessHours: CZ_HOURS,
    targets: {}, escalationRules: ESCALATION },
] as const;

export async function seedSlaTiers(workspaceId: string): Promise<void> {
  const conn = db();
  for (const s of slaPolicySeeds) {
    const existing = (await conn.select({ id: slaPolicies.id }).from(slaPolicies)
      .where(and(eq(slaPolicies.workspaceId, workspaceId), eq(slaPolicies.name, s.name))).limit(1))[0];
    const values = {
      name: s.name, appliesTo: s.appliesTo, tier: s.tier, targets: s.targets,
      businessHours: s.businessHours, useBusinessHours: s.useBusinessHours, escalationRules: s.escalationRules, isDefault: s.isDefault,
    };
    if (existing) await conn.update(slaPolicies).set(values).where(eq(slaPolicies.id, existing.id));
    else await conn.insert(slaPolicies).values({ id: randomUUID(), workspaceId, ...values });
  }
}
