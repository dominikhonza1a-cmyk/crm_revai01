import type { TenantScopedRepository } from "@/shared/repository-base";
import type { ActivityCreateInput, TimelineWriteInput, TimelineListFilter } from "./activity.types";
import type { Page, PageParams } from "@/shared/pagination";

export interface ActivityRepository extends TenantScopedRepository<unknown, ActivityCreateInput, Partial<ActivityCreateInput>, unknown> {
  insertTimelineEvent(input: TimelineWriteInput): Promise<void>;         // ON CONFLICT DO NOTHING
  listTimeline(filter: TimelineListFilter, page?: PageParams): Promise<Page<unknown>>;
  listUpcomingActivities(userId: string): Promise<unknown[]>;           // status=planned
}

export const activityRepository: ActivityRepository = {
  async findById() { throw new Error("activityRepository.findById: fáze 1."); },
  async list() { throw new Error("activityRepository.list: fáze 1."); },
  async create() { throw new Error("activityRepository.create: fáze 1."); },
  async update() { throw new Error("activityRepository.update: fáze 1."); },
  async softDelete() { throw new Error("activityRepository.softDelete: fáze 1."); },
  async restore() { throw new Error("activityRepository.restore: fáze 1."); },
  async insertTimelineEvent() { throw new Error("activityRepository.insertTimelineEvent: fáze 1."); },
  async listTimeline() { throw new Error("activityRepository.listTimeline: fáze 1."); },
  async listUpcomingActivities() { throw new Error("activityRepository.listUpcomingActivities: fáze 1."); },
};
