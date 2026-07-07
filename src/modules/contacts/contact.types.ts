import type { ContactRoleKind } from "@/domain/enums";

export interface ContactCreateInput {
  organizationId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;             // PII — maskováno pro dev roli
  jobTitle?: string;
  legalBasis?: "legitimate_interest" | "consent" | "contract";
  roles?: { organizationId: string; projectId?: string; role: ContactRoleKind; isPrimary?: boolean }[];
  customFields?: Record<string, unknown>;
}
export type ContactUpdateInput = Partial<ContactCreateInput>;
export interface ContactListFilter { organizationId?: string; role?: ContactRoleKind; q?: string; }
