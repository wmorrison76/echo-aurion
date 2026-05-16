import { promises as fs } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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

export interface StagedFile {
  relativePath: string;
  content: string;
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

const STORE_DIR = ".echocoder";
const STORE_FILE = "change-requests.json";
const STAGING_DIR = "staging";

function getStorePath(cwd: string) {
  return path.join(cwd, STORE_DIR, STORE_FILE);
}

function getStagingRoot(cwd: string, changeId: string) {
  return path.join(cwd, STORE_DIR, STAGING_DIR, changeId);
}

export function getRequiredChecks(changeType: ChangeType): CheckType[] {
  if (changeType === "major") {
    return ["smoke", "audit", "security"];
  }
  return ["smoke"];
}

export async function loadChangeRequests(cwd: string): Promise<ChangeRequest[]> {
  const storePath = getStorePath(cwd);
  try {
    const data = await fs.readFile(storePath, "utf8");
    return JSON.parse(data) as ChangeRequest[];
  } catch {
    return [];
  }
}

export async function saveChangeRequests(
  cwd: string,
  requests: ChangeRequest[],
): Promise<void> {
  const storePath = getStorePath(cwd);
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(requests, null, 2), "utf8");
}

export async function createChangeRequest(
  cwd: string,
  payload: {
    tenantId: string;
    changeType: ChangeType;
    operation: ChangeOperation;
    title: string;
    description: string;
  },
): Promise<ChangeRequest> {
  const now = new Date().toISOString();
  const id = `chg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const requiredChecks = getRequiredChecks(payload.changeType);
  const checks: Record<CheckType, ChangeCheckResult> = {
    smoke: { type: "smoke", status: requiredChecks.includes("smoke") ? "pending" : "skipped" },
    audit: { type: "audit", status: requiredChecks.includes("audit") ? "pending" : "skipped" },
    security: { type: "security", status: requiredChecks.includes("security") ? "pending" : "skipped" },
  };

  const request: ChangeRequest = {
    id,
    tenantId: payload.tenantId,
    changeType: payload.changeType,
    operation: payload.operation,
    title: payload.title,
    description: payload.description,
    status: "pending_tests",
    requiredChecks,
    checks,
    stagedPaths: [],
    appliedPaths: [],
    createdAt: now,
  };

  const existing = await loadChangeRequests(cwd);
  existing.unshift(request);
  await saveChangeRequests(cwd, existing);
  return request;
}

export async function updateChangeRequest(
  cwd: string,
  changeId: string,
  updater: (req: ChangeRequest) => ChangeRequest,
): Promise<ChangeRequest | null> {
  const requests = await loadChangeRequests(cwd);
  const index = requests.findIndex((req) => req.id === changeId);
  if (index === -1) return null;
  const updated = updater(requests[index]);
  requests[index] = updated;
  await saveChangeRequests(cwd, requests);
  return updated;
}

export async function stageFiles(
  cwd: string,
  changeId: string,
  files: StagedFile[],
): Promise<string[]> {
  const stagingRoot = getStagingRoot(cwd, changeId);
  const stagedPaths: string[] = [];

  for (const file of files) {
    const target = path.join(stagingRoot, file.relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, file.content, "utf8");
    stagedPaths.push(file.relativePath);
  }

  return stagedPaths;
}

async function listStagedFiles(root: string): Promise<string[]> {
  const results: string[] = [];
  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
      } else {
        results.push(abs);
      }
    }
  }
  try {
    await walk(root);
  } catch {
    return [];
  }
  return results;
}

export async function applyChangeRequest(
  cwd: string,
  request: ChangeRequest,
): Promise<string[]> {
  const stagingRoot = getStagingRoot(cwd, request.id);
  const stagedFiles = await listStagedFiles(stagingRoot);

  const tenantRoot = path.join(cwd, "client", "tenants", request.tenantId);
  const appliedPaths: string[] = [];

  for (const absPath of stagedFiles) {
    const rel = path.relative(stagingRoot, absPath);
    const target = path.join(tenantRoot, rel);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(absPath, target);
    appliedPaths.push(path.relative(cwd, target).replace(/\\/g, "/"));
  }

  return appliedPaths;
}

export async function runCheck(
  type: CheckType,
  command: string | undefined,
): Promise<ChangeCheckResult> {
  const started = Date.now();
  if (!command || !command.trim()) {
    return {
      type,
      status: "failed",
      output: `${type} command not configured`,
      ranAt: new Date().toISOString(),
      durationMs: Date.now() - started,
    };
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 10 * 60 * 1000,
      maxBuffer: 1024 * 1024 * 8,
    });
    const output = [stdout, stderr].filter(Boolean).join("\n");
    return {
      type,
      status: "passed",
      output,
      ranAt: new Date().toISOString(),
      durationMs: Date.now() - started,
    };
  } catch (error: any) {
    const output = error?.stdout || error?.stderr || error?.message || "Check failed";
    return {
      type,
      status: "failed",
      output,
      ranAt: new Date().toISOString(),
      durationMs: Date.now() - started,
    };
  }
}
