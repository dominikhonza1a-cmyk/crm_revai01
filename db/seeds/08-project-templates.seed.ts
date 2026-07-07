import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { projectTemplates, taskTemplates } from "@/modules/projects/project-template.entity";
import chatbot from "./templates/chatbot-delivery.template.json" with { type: "json" };
import automation from "./templates/automation-delivery.template.json" with { type: "json" };
import customai from "./templates/custom-ai-development.template.json" with { type: "json" };
import retainer from "./templates/retainer-care.template.json" with { type: "json" };

type TplTask = { phase_key: string; title: string; default_assignee_role?: string; offset_days?: number; estimate_minutes?: number; recurrence_rule?: string };
type Tpl = { key: string; name: string; project_type: string; engagement_type: string; default_sla_tier?: string; phases: unknown[]; tasks?: TplTask[] };

const TEMPLATES = [chatbot, automation, customai, retainer] as unknown as Tpl[];

/** Seed 4 projektových šablon + jejich task templates. Idempotentní (dle workspace+key). */
export async function seedProjectTemplates(workspaceId: string): Promise<void> {
  const conn = db();
  for (const tpl of TEMPLATES) {
    const isDefault = tpl.engagement_type === "one_off";   // retainer není default pro Won→projekt
    const existing = (await conn.select({ id: projectTemplates.id }).from(projectTemplates)
      .where(and(eq(projectTemplates.workspaceId, workspaceId), eq(projectTemplates.key, tpl.key))).limit(1))[0];

    let templateId: string;
    if (existing) {
      templateId = existing.id;
      await conn.update(projectTemplates).set({
        name: tpl.name, projectType: tpl.project_type, engagementType: tpl.engagement_type,
        defaultSlaTier: tpl.default_sla_tier ?? null, phases: tpl.phases, isDefault,
      }).where(eq(projectTemplates.id, templateId));
      await conn.delete(taskTemplates).where(eq(taskTemplates.projectTemplateId, templateId));
    } else {
      templateId = randomUUID();
      await conn.insert(projectTemplates).values({
        id: templateId, workspaceId, key: tpl.key, name: tpl.name, projectType: tpl.project_type,
        engagementType: tpl.engagement_type, defaultSlaTier: tpl.default_sla_tier ?? null, phases: tpl.phases, isDefault,
      });
    }

    if (tpl.tasks?.length) {
      await conn.insert(taskTemplates).values(tpl.tasks.map((t, i) => ({
        id: randomUUID(), workspaceId, projectTemplateId: templateId, phaseKey: t.phase_key, title: t.title,
        defaultAssigneeRole: t.default_assignee_role ?? null, offsetDays: t.offset_days ?? 0,
        estimateMinutes: t.estimate_minutes ?? null, recurrenceRule: t.recurrence_rule ?? null, position: i,
      })));
    }
  }
}
