import { enqueueOfflinePayload, listOfflinePayloads, registerOfflineHandler, removeOfflinePayloads, type OfflineEnvelope,
} from "@/lib/offline-queue"; const VOICE_CHANNEL ="inventory-voice";
const APPROVAL_CHANNEL ="approvals"; interface VoiceEnvelopePayload { transcript: string; parsedItems: Array<{ name: string; quantity: number; unit?: string; bin?: string; }>; outlet?: string; user?: string; capturedAt: number;
} interface ApprovalEnvelopePayload { invoiceId: string; action:"approve" |"reject" |"hold"; user: string; comment?: string; createdAt: number; capturedAt?: number;
} async function postJson(url: string, payload: unknown) { const response = await fetch(url, { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify(payload), }); if (!response.ok) { throw new Error(await response.text()); }
} async function flushVoice(records: OfflineEnvelope<VoiceEnvelopePayload>[]) { if (!records.length) return; await postJson("/api/sync/voice", records.map((record) => ({ id: record.id, ...record.payload, retries: record.retries, })), );
} async function flushApprovals( records: OfflineEnvelope<ApprovalEnvelopePayload>[],
) { if (!records.length) return; await postJson("/api/sync/approvals", records.map((record) => ({ id: record.id, ...record.payload, retries: record.retries, })), );
} registerOfflineHandler<VoiceEnvelopePayload>(VOICE_CHANNEL, flushVoice);
registerOfflineHandler<ApprovalEnvelopePayload>( APPROVAL_CHANNEL, flushApprovals,
); export async function recordVoiceLog(payload: VoiceEnvelopePayload) { if (typeof navigator !=="undefined" && navigator.onLine !== false) { try { await flushVoice([ { id: payload.capturedAt.toString(), channel: VOICE_CHANNEL, payload, createdAt: payload.capturedAt, retries: 0, }, ]); return; } catch { // fallthrough to offline queue } } await enqueueOfflinePayload(VOICE_CHANNEL, payload);
} export async function recordApprovalAction(payload: ApprovalEnvelopePayload) { if (typeof navigator !=="undefined" && navigator.onLine !== false) { try { await flushApprovals([ { id: payload.createdAt.toString(), channel: APPROVAL_CHANNEL, payload, createdAt: payload.createdAt, retries: 0, }, ]); return; } catch { // fallback to offline queue } } await enqueueOfflinePayload(APPROVAL_CHANNEL, payload);
} export function getPendingVoiceLogs() { return listOfflinePayloads<VoiceEnvelopePayload>(VOICE_CHANNEL);
} export function getPendingApprovals() { return listOfflinePayloads<ApprovalEnvelopePayload>(APPROVAL_CHANNEL);
} export function clearVoiceLogs(ids: string[]) { removeOfflinePayloads(ids);
} export function clearApprovals(ids: string[]) { removeOfflinePayloads(ids);
}
