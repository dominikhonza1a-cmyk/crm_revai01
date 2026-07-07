/**
 * Doménové eventy — kontrakt mezi moduly, workflow enginem a notifikacemi.
 * Publikují se přes event-bus do transactional outboxu; workflow engine na ně reaguje.
 * Diskriminátor je `type`. Payload je minimální (jen ID + co je potřeba pro rozhodnutí), NE celé entity.
 */
import type {
  WorkspaceId, UserId, DealId, ProjectId, TaskId, OrganizationId, SlaTrackerId, DocumentId, PipelineStageId,
} from "./ids";

interface Base {
  workspaceId: WorkspaceId;
  occurredAt: string;           // ISO UTC — stampuje se při publish
  actorId: UserId | null;       // null = systém
}

export type DomainEvent =
  | (Base & { type: "deal.stage_changed"; dealId: DealId; fromStageId: PipelineStageId | null; toStageId: PipelineStageId })
  | (Base & { type: "deal.won"; dealId: DealId; organizationId: OrganizationId })
  | (Base & { type: "deal.lost"; dealId: DealId; lostReason: string })
  | (Base & { type: "project.created"; projectId: ProjectId; dealId: DealId | null })
  | (Base & { type: "project.phase_changed"; projectId: ProjectId; toPhaseKey: string })
  | (Base & { type: "project.status_changed"; projectId: ProjectId; toStatus: string })
  | (Base & { type: "task.created"; taskId: TaskId; taskType: string })
  | (Base & { type: "task.completed"; taskId: TaskId })
  | (Base & { type: "task.overdue"; taskId: TaskId })
  | (Base & { type: "ticket.opened"; taskId: TaskId; organizationId: OrganizationId })
  | (Base & { type: "ticket.sla_at_risk"; trackerId: SlaTrackerId; atPct: number })
  | (Base & { type: "sla.breached"; trackerId: SlaTrackerId })
  | (Base & { type: "document.linked"; documentId: DocumentId })
  | (Base & { type: "integration.event"; provider: string; kind: string; raw: unknown });

export type DomainEventType = DomainEvent["type"];

/** Handler subscriberů (modulové *.workflow.ts). */
export type EventHandler<T extends DomainEventType = DomainEventType> = (
  event: Extract<DomainEvent, { type: T }>,
) => Promise<void>;
