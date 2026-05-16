import { Buffer } from "node:buffer";
import { isRoleAtLeast, type UserRole } from "./auth";
import type { SnapshotEnvelope } from "./snapshots";
export interface AccessContext {
  role: UserRole;
  propertyIds: string[];
}
export interface AccessRequest {
  propertyId: string;
  requiredRole: UserRole;
}
export function hasAccess(context: AccessContext, request: AccessRequest) {
  const roleAllowed = isRoleAtLeast(context.role, request.requiredRole);
  const propertyAllowed = context.propertyIds.includes(request.propertyId);
  return roleAllowed && propertyAllowed;
}
export interface WorkpaperSection {
  id: string;
  title: string;
  tickMark?: string;
  documents: { name: string; content: string; contentType: string }[];
}
export interface BinderComposerInput {
  ledgerId: string;
  period: string;
  sections: WorkpaperSection[];
}
export interface BinderComposerResult {
  ledgerId: string;
  period: string;
  sections: WorkpaperSection[];
  archive: string;
}
export function composeBinder(
  input: BinderComposerInput,
): BinderComposerResult {
  const archivePayload = {
    ledgerId: input.ledgerId,
    period: input.period,
    sections: input.sections,
  };
  return {
    ...input,
    archive: Buffer.from(JSON.stringify(archivePayload), "utf-8").toString(
      "base64",
    ),
  };
}
export interface PbcRequest {
  id: string;
  description: string;
  status: "pending" | "uploaded" | "approved";
  documents: { name: string; uploadedAt?: string }[];
}
export interface PbcPortalState {
  requests: PbcRequest[];
}
export function createPbcPortalState(requests: PbcRequest[]): PbcPortalState {
  return { requests };
}
export interface ChecklistItem {
  id: string;
  description: string;
  completed: boolean;
  evidenceVersion?: string;
}
export interface ChecklistValidationResult {
  completed: boolean;
  outstanding: ChecklistItem[];
}
export function validateChecklist(
  items: ChecklistItem[],
): ChecklistValidationResult {
  const outstanding = items.filter(
    (item) => !item.completed || !item.evidenceVersion,
  );
  return { completed: outstanding.length === 0, outstanding };
}
export interface DocuSignBundleInput {
  snapshot: SnapshotEnvelope;
  recipients: { email: string; name: string }[];
}
export interface DocuSignBundle {
  envelopeId: string;
  pdf: string;
  metadata: Record<string, unknown>;
}
export function buildDocuSignBundle(
  input: DocuSignBundleInput,
): DocuSignBundle {
  const pdfPayload = {
    ledgerId: input.snapshot.ledgerId,
    snapshotId: input.snapshot.id,
    eventCount: input.snapshot.eventCount,
    recipients: input.recipients,
  };
  return {
    envelopeId: `docusign-${input.snapshot.id}`,
    pdf: Buffer.from(JSON.stringify(pdfPayload), "utf-8").toString("base64"),
    metadata: {
      journalHash: input.snapshot.journalHash,
      asOf: input.snapshot.asOf,
    },
  };
}
