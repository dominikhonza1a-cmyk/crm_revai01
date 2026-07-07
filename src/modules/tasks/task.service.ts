import type { TenantContext } from "@/shared";
import type { TaskCreateInput, TaskStatusChangeInput } from "./task.types";

/**
 * Use-casy modulu tasks. Zahrnuje support tickety (type=support → založí SLATrackery) a recurring tasky.
 * waiting_on_client pauzuje SLA trackery; done plní resolution.
 */
export interface TaskService {
  create(ctx: TenantContext, input: TaskCreateInput): Promise<{ taskId: string }>;
  changeStatus(ctx: TenantContext, input: TaskStatusChangeInput): Promise<void>;
  recordFirstResponse(ctx: TenantContext, taskId: string): Promise<void>;
}

export const taskService: TaskService = {
  async create(_ctx, input) {
    // pokud type=support → vytvoř 2 SLATrackery (first_response, resolution) dle org.support_sla_policy (fallback default),
    //   due_at spočítá sla.policy (business hours). eventBus.publish(ticket.opened) + timeline(ticket_opened).
    void input; throw new Error("taskService.create: implementace fáze 1–2.");
  },
  async changeStatus(_ctx, input) {
    // waiting_on_client → pauza SLA (paused_total_ms); done → resolution.satisfied + timeline(task_completed/ticket_resolved).
    void input; throw new Error("taskService.changeStatus: implementace fáze 1–2.");
  },
  async recordFirstResponse(_ctx, _taskId) {
    // první odchozí reakce assignee → SLATracker.first_response met.
    throw new Error("taskService.recordFirstResponse: fáze 2.");
  },
};
