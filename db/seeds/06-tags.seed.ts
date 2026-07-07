import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/shared/db";
import { tags } from "@/shared/tags/tag.entity";

/** Seed výchozích tagů. Idempotentní (dle workspace+name). */
export const tagSeeds = [
  { name: "e-commerce", color: "#2563eb" }, { name: "finance", color: "#0891b2" },
  { name: "healthcare", color: "#059669" }, { name: "manufacturing", color: "#ca8a04" },
  { name: "real-estate", color: "#7c3aed" },
  { name: "chatbot", color: "#db2777" }, { name: "voicebot", color: "#e11d48" },
  { name: "rag", color: "#9333ea" }, { name: "n8n", color: "#ea580c" },
  { name: "make", color: "#7c3aed" }, { name: "openai", color: "#16a34a" }, { name: "claude", color: "#d97706" },
  { name: "vip", color: "#dc2626" }, { name: "at-risk", color: "#f59e0b" },
  { name: "upsell", color: "#10b981" }, { name: "referral-source", color: "#3b82f6" }, { name: "partner", color: "#6366f1" },
] as const;

export async function seedTags(workspaceId: string): Promise<void> {
  const conn = db();
  for (const t of tagSeeds) {
    const existing = (await conn.select({ id: tags.id }).from(tags)
      .where(and(eq(tags.workspaceId, workspaceId), eq(tags.name, t.name), isNull(tags.deletedAt))).limit(1))[0];
    if (!existing) await conn.insert(tags).values({ id: randomUUID(), workspaceId, name: t.name, color: t.color });
  }
}
