import type { Project } from "@/domain/entities";
import type { TenantScopedRepository } from "@/shared/repository-base";
import type { ProjectCreateInput, ProjectUpdateInput, ProjectListFilter } from "./project.types";

export interface ProjectRepository extends TenantScopedRepository<Project, ProjectCreateInput, ProjectUpdateInput, ProjectListFilter> {
  findByDealId(dealId: string): Promise<Project | null>;      // idempotence guard
  insertPhases(projectId: string, phases: { key: string; name: string; position: number; dueDate: string | null }[]): Promise<void>;
  setCurrentPhase(projectId: string, phaseId: string): Promise<void>;
  listRetainersForReview(now: Date): Promise<Project[]>;      // W6
}

export const projectRepository: ProjectRepository = {
  async findById() { throw new Error("projectRepository.findById: fáze 1."); },
  async list() { throw new Error("projectRepository.list: fáze 1."); },
  async create() { throw new Error("projectRepository.create: fáze 1."); },
  async update() { throw new Error("projectRepository.update: fáze 1."); },
  async softDelete() { throw new Error("projectRepository.softDelete: fáze 1."); },
  async restore() { throw new Error("projectRepository.restore: fáze 1."); },
  async findByDealId() { throw new Error("projectRepository.findByDealId: fáze 2."); },
  async insertPhases() { throw new Error("projectRepository.insertPhases: fáze 2."); },
  async setCurrentPhase() { throw new Error("projectRepository.setCurrentPhase: fáze 1."); },
  async listRetainersForReview() { throw new Error("projectRepository.listRetainersForReview: fáze 2."); },
};
