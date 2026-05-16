export type ChangeType = "cosmetic" | "major";
export type ChangeOperation = "generate" | "fix" | "upgrade";
export type CheckType = "smoke" | "audit" | "security";
export type CheckStatus = "pending" | "passed" | "failed" | "skipped";
export type ChangeStatus =
  | "pending_tests"
  | "ready_for_approval"
  | "approved"
  | "applied"
  | "failed";

export interface ChangeCheckResult {
  type: CheckType;
  status: CheckStatus;
  output?: string;
  ranAt?: string;
  durationMs?: number;
}

export interface ChangeRequest {
  id: string;
  tenantId: string;
  changeType: ChangeType;
  operation: ChangeOperation;
  title: string;
  description: string;
  status: ChangeStatus;
  requiredChecks: CheckType[];
  checks: Record<CheckType, ChangeCheckResult>;
  stagedPaths: string[];
  appliedPaths: string[];
  contextBundle?: {
    prompt: string;
    files: { path: string; truncated: boolean }[];
  };
  aiPlan?: {
    summary?: string;
    plan?: string;
    patches?: Array<{ path: string; rationale?: string }>;
    generatedAt?: string;
  };
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  appliedAt?: string;
  failureReason?: string;
}

export async function listChangeRequests(): Promise<ChangeRequest[]> {
  const response = await fetch("/api/echocoder/change-requests");
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  const data = await response.json();
  return data.requests || [];
}

export async function runChangeChecks(changeId: string): Promise<ChangeRequest> {
  const response = await fetch(`/api/echocoder/change-requests/${changeId}/checks`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  const data = await response.json();
  return data.changeRequest;
}

export async function approveChangeRequest(changeId: string): Promise<ChangeRequest> {
  const response = await fetch(`/api/echocoder/change-requests/${changeId}/approve`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  const data = await response.json();
  return data.changeRequest;
}

export async function applyChangeRequest(changeId: string): Promise<ChangeRequest> {
  const response = await fetch(`/api/echocoder/change-requests/${changeId}/apply`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  const data = await response.json();
  return data.changeRequest;
}

export async function createUpgradeRequest(payload: {
  tenantId: string;
  changeType: ChangeType;
  title: string;
  description: string;
}): Promise<ChangeRequest> {
  const response = await fetch("/api/echocoder/upgrade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: payload.title,
      description: payload.description,
      changeControl: {
        tenantId: payload.tenantId,
        changeType: payload.changeType,
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  const data = await response.json();
  return data.changeRequest;
}
