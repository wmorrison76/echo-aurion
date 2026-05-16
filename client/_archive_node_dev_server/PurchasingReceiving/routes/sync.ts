import { Router } from "express";
import { promises as fs } from "fs";
import path from "path";
interface VoiceLogPayload {
  id: string;
  transcript: string;
  parsedItems: Array<{
    name: string;
    quantity: number;
    unit?: string;
    bin?: string;
  }>;
  capturedAt: number;
  outlet?: string;
  user?: string;
  retries?: number;
}
interface ApprovalPayload {
  id: string;
  invoiceId: string;
  action: "approve" | "reject" | "hold";
  user: string;
  comment?: string;
  createdAt: number;
  capturedAt?: number;
  retries?: number;
}
interface SyncState {
  voiceLogs: VoiceLogPayload[];
  approvals: ApprovalPayload[];
}
const STORAGE_PATH = path.join(
  process.cwd(),
  "server",
  "data",
  "offline-sync.json",
);
const syncState: SyncState = { voiceLogs: [], approvals: [] };
export function getSyncSnapshot(): SyncState {
  return syncState;
}
async function ensureStorageDir() {
  const dir = path.dirname(STORAGE_PATH);
  await fs.mkdir(dir, { recursive: true }).catch(() => undefined);
}
async function persist() {
  await ensureStorageDir();
  const payload = JSON.stringify(syncState, null, 2);
  await fs.writeFile(STORAGE_PATH, payload, "utf-8").catch(() => undefined);
}
function normalizeVoice(
  payload: Partial<VoiceLogPayload>,
): VoiceLogPayload | null {
  if (!payload.transcript) return null;
  return {
    id: payload.id ?? `voice-${Date.now()}`,
    transcript: payload.transcript,
    parsedItems: Array.isArray(payload.parsedItems) ? payload.parsedItems : [],
    capturedAt: payload.capturedAt ?? Date.now(),
    outlet: payload.outlet,
    user: payload.user,
    retries: payload.retries,
  };
}
function normalizeApproval(
  payload: Partial<ApprovalPayload>,
): ApprovalPayload | null {
  if (!payload.invoiceId || !payload.action || !payload.user) return null;
  return {
    id: payload.id ?? `approval-${Date.now()}`,
    invoiceId: payload.invoiceId,
    action: payload.action,
    user: payload.user,
    comment: payload.comment,
    createdAt: payload.createdAt ?? Date.now(),
    capturedAt: payload.capturedAt,
    retries: payload.retries,
  };
}
const syncRouter = Router();
syncRouter.post("/voice", async (req, res) => {
  const payloads = Array.isArray(req.body) ? req.body : [req.body];
  const normalized = payloads
    .map((entry) => normalizeVoice(entry))
    .filter((entry): entry is VoiceLogPayload => !!entry);
  if (!normalized.length) {
    return res.status(400).json({ error: "Invalid voice log payload" });
  }
  syncState.voiceLogs.push(...normalized);
  syncState.voiceLogs = syncState.voiceLogs.slice(-500);
  await persist();
  return res.json({ ok: true, accepted: normalized.length });
});
syncRouter.post("/approvals", async (req, res) => {
  const payloads = Array.isArray(req.body) ? req.body : [req.body];
  const normalized = payloads
    .map((entry) => normalizeApproval(entry))
    .filter((entry): entry is ApprovalPayload => !!entry);
  if (!normalized.length) {
    return res.status(400).json({ error: "Invalid approval payload" });
  }
  syncState.approvals.push(...normalized);
  syncState.approvals = syncState.approvals.slice(-500);
  await persist();
  return res.json({ ok: true, accepted: normalized.length });
});
syncRouter.get("/summary", (_req, res) => {
  res.json({
    approvals: syncState.approvals.length,
    voiceLogs: syncState.voiceLogs.length,
  });
});
export { syncRouter };
