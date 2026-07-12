import { router, protectedProcedure, requirePermission } from "@/api/trpc";
import { reportingService } from "./reporting.service";

/** tRPC router reportingu (read-only agregace). dashboard vrátí sadu widgetů najednou. */
export const reportingRouter = router({
  dashboard: protectedProcedure.use(requirePermission("reporting", "read")).query(({ ctx }) => reportingService.dashboard(ctx)),
  pipelineValue: protectedProcedure.use(requirePermission("reporting", "read")).query(() => reportingService.pipelineValue()),
  activeClients: protectedProcedure.use(requirePermission("reporting", "read")).query(() => reportingService.activeClients()),
  projectsStatus: protectedProcedure.use(requirePermission("reporting", "read")).query(() => reportingService.projectsStatus()),
  openTickets: protectedProcedure.use(requirePermission("reporting", "read")).query(() => reportingService.openTickets()),
  revenuePerClient: protectedProcedure.use(requirePermission("reporting", "read")).query(() => reportingService.revenuePerClient()),
  finance: protectedProcedure.use(requirePermission("reporting", "read")).query(() => reportingService.finance()),
  todayTasks: protectedProcedure.use(requirePermission("reporting", "read")).query(() => reportingService.todayTasks()),
});
