import { and, eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { projectTemplates, taskTemplates, type ProjectTemplateRow, type TaskTemplateRow } from "./project-template.entity";

/** Repository projektových šablon. Použito při Won→projekt (kopie fází/tasků). */
export const projectTemplateRepository = {
  async getByKey(key: string): Promise<ProjectTemplateRow | null> {
    const ws = currentWorkspaceId();
    return (await db().select().from(projectTemplates)
      .where(and(eq(projectTemplates.workspaceId, ws), eq(projectTemplates.key, key))).limit(1))[0] ?? null;
  },

  /** Najde šablonu podle typu projektu (default první). */
  async getByProjectType(projectType: string): Promise<ProjectTemplateRow | null> {
    const ws = currentWorkspaceId();
    const rows = await db().select().from(projectTemplates)
      .where(and(eq(projectTemplates.workspaceId, ws), eq(projectTemplates.projectType, projectType)));
    return rows.find((r) => r.isDefault) ?? rows[0] ?? null;
  },

  async listTaskTemplates(projectTemplateId: string): Promise<TaskTemplateRow[]> {
    const ws = currentWorkspaceId();
    return db().select().from(taskTemplates)
      .where(and(eq(taskTemplates.workspaceId, ws), eq(taskTemplates.projectTemplateId, projectTemplateId)))
      .orderBy(taskTemplates.position);
  },
};
