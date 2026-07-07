import type { Task } from "@/domain/entities";
import type { TaskType, TaskStatus, Priority } from "@/domain/enums";

export interface TaskCreateInput {
  type: TaskType;                    // delivery | support | sales_followup | internal
  title: string;
  projectId?: string;
  organizationId?: string;           // support ticket bez projektu → přímo na klienta
  phaseId?: string;
  description?: string;
  priority?: Priority;
  assigneeId?: string;
  dueAt?: string;
  // support ticket
  reporterContactId?: string;
  channel?: "email" | "chat" | "phone" | "portal";
  // recurrence (master)
  recurrenceRule?: string;
  recurrenceUntil?: string;
  customFields?: Record<string, unknown>;
}

export type TaskUpdateInput = Partial<Omit<TaskCreateInput, "type">>;

export interface TaskStatusChangeInput { taskId: string; toStatus: TaskStatus; }

export interface TaskListFilter {
  type?: TaskType;
  status?: TaskStatus;
  assigneeId?: string;
  projectId?: string;
  organizationId?: string;
  overdue?: boolean;
  view?: "my_work" | "ticket_queue" | "all";
}

export type TaskView = Task;
