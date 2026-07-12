/**
 * Doménové enumy s PEVNOU logikou (změna = migrace, záměrně).
 * Číselníky, které se mění za provozu (PipelineStage, ProjectTemplate, SLAPolicy, Tag), jsou naopak řádky v DB.
 */

export const LifecycleStage = [
  "new_contact", "prospect", "meeting", "negotiating", "before_signature",
  "active_client", "on_hold", "past_client", "partner",
] as const;
export type LifecycleStage = (typeof LifecycleStage)[number];

export const EmployeeBand = ["1_49", "50_199", "200_500", "500_plus"] as const;
export type EmployeeBand = (typeof EmployeeBand)[number];

export const ContactRoleKind = ["sponsor", "decision_maker", "technical_contact", "end_user", "billing_contact", "champion"] as const;
export type ContactRoleKind = (typeof ContactRoleKind)[number];

export const StageKind = ["open", "won", "lost"] as const;
export type StageKind = (typeof StageKind)[number];

export const LostReason = ["price", "timing", "competitor", "no_response", "other"] as const;
export type LostReason = (typeof LostReason)[number];

export const ProjectType = ["chatbot_voicebot", "process_automation", "custom_ai"] as const;
export type ProjectType = (typeof ProjectType)[number];

export const EngagementType = ["one_off", "retainer"] as const;
export type EngagementType = (typeof EngagementType)[number];

export const ProjectStatus = ["draft", "active", "on_hold", "closed"] as const;
export type ProjectStatus = (typeof ProjectStatus)[number];

export const ProjectPhaseKey = ["kickoff", "discovery", "build", "test_uat", "deploy", "hypercare", "ongoing", "closed"] as const;
export type ProjectPhaseKey = (typeof ProjectPhaseKey)[number];

export const TaskType = ["delivery", "support", "sales_followup", "internal"] as const;
export type TaskType = (typeof TaskType)[number];

export const TaskStatus = ["todo", "in_progress", "waiting_on_client", "blocked", "done", "canceled"] as const;
export type TaskStatus = (typeof TaskStatus)[number];

export const Priority = ["p1", "p2", "p3", "p4"] as const;
export type Priority = (typeof Priority)[number];

export const ActivityType = ["call", "meeting", "email", "note", "demo", "task_note"] as const;
export type ActivityType = (typeof ActivityType)[number];

export const DocumentKind = ["external_ref", "native_file", "secret_ref"] as const;
export type DocumentKind = (typeof DocumentKind)[number];

export const SlaAppliesTo = ["support", "delivery", "sales_followup"] as const;
export type SlaAppliesTo = (typeof SlaAppliesTo)[number];

export const SlaTier = ["basic", "standard", "premium"] as const;
export type SlaTier = (typeof SlaTier)[number];

export const SlaMetric = ["first_response", "resolution", "due_date", "followup"] as const;
export type SlaMetric = (typeof SlaMetric)[number];

export const NotificationSeverity = ["critical", "normal"] as const;
export type NotificationSeverity = (typeof NotificationSeverity)[number];

export const PermissionLevel = ["none", "read", "write", "manage"] as const;
export type PermissionLevel = (typeof PermissionLevel)[number];

export const RoleKey = ["admin", "sales", "pm", "dev", "support"] as const;
export type RoleKey = (typeof RoleKey)[number];

/** Množina hostitelů pro polymorfní vazby (CHECK constraint v DB kopíruje tento seznam). */
export const TaggableEntity = ["organization", "contact", "deal", "project", "task", "document"] as const;
export type TaggableEntity = (typeof TaggableEntity)[number];

export const TimelineHostEntity = ["organization", "contact", "deal", "project", "task", "idea"] as const;
export type TimelineHostEntity = (typeof TimelineHostEntity)[number];

/** Stav vztahu ke klientovi — od prvního kontaktu po uzavření (každý stav vlastní barva). */
export const LIFECYCLE_META: Record<string, { label: string; color: string }> = {
  new_contact: { label: "Nový kontakt", color: "#38bdf8" },        // nebeská
  prospect: { label: "Prospekt", color: "#818cf8" },              // indigová
  meeting: { label: "Před schůzkou", color: "#fbbf24" },          // žlutá
  negotiating: { label: "V jednání / čekáme", color: "#fb923c" }, // oranžová
  before_signature: { label: "Před podpisem", color: "#a78bfa" }, // fialová
  active_client: { label: "Aktivní klient", color: "#34d399" },   // mint
  on_hold: { label: "Pozastaveno", color: "#94a3b8" },            // šedomodrá
  past_client: { label: "Bývalý klient", color: "#64748b" },      // šedá
  partner: { label: "Partner", color: "#2dd4bf" },                // tyrkysová
};
export const LIFECYCLE_OPTIONS = Object.entries(LIFECYCLE_META).map(([value, m]) => ({ value, label: m.label }));
