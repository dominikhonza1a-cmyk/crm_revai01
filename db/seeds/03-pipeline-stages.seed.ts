import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { pipelineStages } from "@/modules/deals/deal.entity";

/** Seed sales pipeline. staleAfterDays = vstup pro stale-deal reminder (W8). Idempotentní (dle workspace+position). */
export const pipelineStageSeeds = [
  { name: "Nový lead", position: 1, kind: "open", probabilityDefault: 10, staleAfterDays: 14 },
  { name: "Kvalifikace", position: 2, kind: "open", probabilityDefault: 25, staleAfterDays: 14 },
  { name: "Analýza potřeb", position: 3, kind: "open", probabilityDefault: 40, staleAfterDays: 21 },
  { name: "Nabídka", position: 4, kind: "open", probabilityDefault: 60, staleAfterDays: 10 },
  { name: "Vyjednávání", position: 5, kind: "open", probabilityDefault: 80, staleAfterDays: 10 },
  { name: "Vyhráno", position: 6, kind: "won", probabilityDefault: 100, staleAfterDays: null },
  { name: "Prohráno", position: 7, kind: "lost", probabilityDefault: 0, staleAfterDays: null },
] as const;

export async function seedPipelineStages(workspaceId: string): Promise<void> {
  const conn = db();
  for (const s of pipelineStageSeeds) {
    const existing = (await conn.select({ id: pipelineStages.id }).from(pipelineStages)
      .where(and(eq(pipelineStages.workspaceId, workspaceId), eq(pipelineStages.position, s.position))).limit(1))[0];
    if (existing) {
      await conn.update(pipelineStages).set({ name: s.name, kind: s.kind, probabilityDefault: s.probabilityDefault, staleAfterDays: s.staleAfterDays })
        .where(eq(pipelineStages.id, existing.id));
    } else {
      await conn.insert(pipelineStages).values({ id: randomUUID(), workspaceId, ...s });
    }
  }
}
