import type { Task } from "@/domain/entities";
import type { TenantScopedRepository } from "@/shared/repository-base";
import type { TaskCreateInput, TaskUpdateInput, TaskListFilter } from "./task.types";

export interface TaskRepository extends TenantScopedRepository<Task, TaskCreateInput, TaskUpdateInput, TaskListFilter> {
  findOverdue(now: Date): Promise<Task[]>;                               // W4
  findRecurrenceMasters(): Promise<Task[]>;                              // W7
  createRecurrenceInstance(masterId: string, dueAt: Date): Promise<Task | null>;  // idempotent (unique)
  setFirstResponded(taskId: string, at: Date): Promise<void>;           // plní SLA first_response
}

export const taskRepository: TaskRepository = {
  async findById() { throw new Error("taskRepository.findById: fáze 1."); },
  async list() { throw new Error("taskRepository.list: fáze 1."); },
  async create() { throw new Error("taskRepository.create: fáze 1."); },
  async update() { throw new Error("taskRepository.update: fáze 1."); },
  async softDelete() { throw new Error("taskRepository.softDelete: fáze 1."); },
  async restore() { throw new Error("taskRepository.restore: fáze 1."); },
  async findOverdue() { throw new Error("taskRepository.findOverdue: fáze 2."); },
  async findRecurrenceMasters() { throw new Error("taskRepository.findRecurrenceMasters: fáze 2."); },
  async createRecurrenceInstance() { throw new Error("taskRepository.createRecurrenceInstance: fáze 2."); },
  async setFirstResponded() { throw new Error("taskRepository.setFirstResponded: fáze 2."); },
};
