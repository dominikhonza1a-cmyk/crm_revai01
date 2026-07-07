import type { WorkspaceId, TaskId, ProjectId, OrganizationId, ProjectPhaseId, UserId, ContactId } from "../ids";
import type { TaskType, TaskStatus, Priority } from "../enums";

export interface Task {
  id: TaskId;
  workspaceId: WorkspaceId;
  projectId: ProjectId | null;
  organizationId: OrganizationId | null;   // CHECK: aspoň jedno u type≠internal
  phaseId: ProjectPhaseId | null;
  type: TaskType;                           // delivery | support | sales_followup | internal
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  assigneeId: UserId | null;
  dueAt: string | null;
  estimateMinutes: number | null;
  spentMinutes: number | null;             // later

  // support ticket (NULL u jiných typů)
  reporterContactId: ContactId | null;
  channel: "email" | "chat" | "phone" | "portal" | null;
  firstRespondedAt: string | null;
  resolvedAt: string | null;

  // recurrence (jen master task)
  recurrenceRule: string | null;           // RFC 5545 RRULE
  recurrenceParentId: TaskId | null;
  recurrenceUntil: string | null;

  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
