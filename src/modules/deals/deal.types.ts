import type { Deal } from "@/domain/entities";
import type { LostReason, ProjectType } from "@/domain/enums";

/** DTO typy modulu deals — odvozené z validation (z.infer). Bez logiky. */
export interface DealCreateInput {
  organizationId: string;
  title: string;
  pipelineStageId?: string;         // default = první stage (Lead)
  primaryContactId?: string;
  amountMinor?: bigint;
  currency?: string;
  expectedMarginPct?: number;       // field-level restricted
  expectedCloseDate?: string;
  ownerId?: string;
  projectTypeHint?: ProjectType;
  customFields?: Record<string, unknown>;
}

export type DealUpdateInput = Partial<Omit<DealCreateInput, "organizationId">>;

export interface DealMoveStageInput {
  dealId: string;
  toStageId: string;
  lostReason?: LostReason;
  lostNote?: string;
}

export interface DealListFilter {
  stageId?: string;
  ownerId?: string;
  organizationId?: string;
  stale?: boolean;                  // dealy po stale_after_days bez aktivity
}

/** View-model pro UI (po field-level filtrování dle role). */
export type DealView = Deal;
