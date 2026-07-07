/**
 * Branded ID typy — brání záměně různých UUID (např. předání OrganizationId tam, kde se čeká DealId).
 * Za běhu jsou to string; branding existuje jen v typovém systému.
 */
type Brand<K, T> = K & { readonly __brand: T };

export type Uuid = string;

export type WorkspaceId = Brand<Uuid, "WorkspaceId">;
export type UserId = Brand<Uuid, "UserId">;
export type RoleId = Brand<Uuid, "RoleId">;
export type OrganizationId = Brand<Uuid, "OrganizationId">;
export type ContactId = Brand<Uuid, "ContactId">;
export type DealId = Brand<Uuid, "DealId">;
export type PipelineStageId = Brand<Uuid, "PipelineStageId">;
export type ProjectId = Brand<Uuid, "ProjectId">;
export type ProjectPhaseId = Brand<Uuid, "ProjectPhaseId">;
export type TaskId = Brand<Uuid, "TaskId">;
export type ActivityId = Brand<Uuid, "ActivityId">;
export type TimelineEventId = Brand<Uuid, "TimelineEventId">;
export type DocumentId = Brand<Uuid, "DocumentId">;
export type SlaPolicyId = Brand<Uuid, "SlaPolicyId">;
export type SlaTrackerId = Brand<Uuid, "SlaTrackerId">;

/** Runtime helpery — validace a přetypování se dějí na hranici (repository/validation). */
export const asId = <T extends Uuid>(v: string): T => v as T;
