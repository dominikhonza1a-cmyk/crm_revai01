import type { TaggableEntity } from "@/domain/enums";

/**
 * Polymorfní tagy přes `tagging(tag_id, entity_type, entity_id)`. Viz docs/data-model/conventions.md.
 * entity_type má CHECK constraint na množinu TaggableEntity.
 */
export interface TagsService {
  attach(entityType: TaggableEntity, entityId: string, tagIds: string[]): Promise<void>;
  detach(entityType: TaggableEntity, entityId: string, tagIds: string[]): Promise<void>;
  listFor(entityType: TaggableEntity, entityId: string): Promise<{ id: string; name: string; color: string }[]>;
}

export const tags: TagsService = {
  async attach() { throw new Error("tags.attach: implementace fáze 2."); },
  async detach() { throw new Error("tags.detach: implementace fáze 2."); },
  async listFor() { throw new Error("tags.listFor: implementace fáze 2."); },
};
