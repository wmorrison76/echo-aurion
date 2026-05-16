type GuardAlertLevel = "none" | "defcon1";

export interface GuardStatusData {
  alert?: GuardAlertLevel;
  detail?: string;
  since?: number;
}

export interface GuardIpData {
  ip?: string;
}

export interface GuardEventRequest {
  type: "defcon1" | "clear";
  detail?: string;
}

export interface GuardEventData {
  alert?: GuardAlertLevel;
}

export interface GuardClientResult<T> {
  data: T | null;
  offline: boolean;
  status?: number;
  error?: string;
}

type GuardSuccessEnvelope<T> = { ok: true } & T;
type GuardErrorEnvelope = { ok: false; error?: string };
type GuardEnvelope<T> = GuardSuccessEnvelope<T> | GuardErrorEnvelope | null;

const GUARD_BASE_PATH = "/api/guard";
const OFFLINE_RETRY_DELAY_MS = 15000;
const REQUEST_TIMEOUT_MS = 12000;
let offlineUntil = 0;

function markOffline(delayMs: number = OFFLINE_RETRY_DELAY_MS, jitterMs = 0) {
  if (typeof Date.now !== "function") return;
  const jitter = jitterMs > 0 ? Math.random() * jitterMs : 0;
  offlineUntil = Date.now() + Math.max(0, Math.round(delayMs + jitter));
}

function resetTimeoutPenalty() {
  // Intentionally left lightweight; timeout-specific escalation is handled by the caller.
}

function clearOffline() {
  offlineUntil = 0;
}

function isTemporarilyOffline(): boolean {
  if (offlineUntil === 0) return false;
  if (typeof Date.now !== "function") return false;
  return Date.now() < offlineUntil;
}

function normalizeHeaders(headers?: HeadersInit): Headers {
  const normalized = new Headers(headers);
  if (!normalized.has("Accept")) {
    normalized.set("Accept", "application/json");
  }
  return normalized;
}

async function guardRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<GuardClientResult<T>> {
  if (typeof fetch !== "function") {
    return { data: null, offline: true, error: "Fetch API unavailable" };
  }

  if (isTemporarilyOffline()) {
    return { data: null, offline: true };
  }

  try {
    // Use Promise.race for timeout instead of AbortController to avoid AbortError
    const response = await Promise.race([
      fetch(`${GUARD_BASE_PATH}${path}`, {
        cache: "no-store",
        credentials: "same-origin",
        keepalive: false,
        ...init,
        signal: init?.signal,
        headers: normalizeHeaders(init?.headers),
      }),
      new Promise<Response>((resolve) => {
        setTimeout(() => {
          resolve(
            new Response(JSON.stringify({ error: "Guard service unavailable" }), {
              status: 503,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }, REQUEST_TIMEOUT_MS);
      }),
    ]);

    const envelope = (await response
      .json()
      .catch(() => null)) as GuardEnvelope<T>;

    if (envelope && "ok" in envelope && envelope.ok) {
      clearOffline();
      resetTimeoutPenalty();
      const { ok: _ok, ...rest } = envelope as GuardSuccessEnvelope<T>;
      return {
        data: (rest as unknown as T) ?? null,
        offline: false,
        status: response.status,
      };
    }

    const errorMessage =
      (envelope && "error" in envelope && envelope.error)
        ? String(envelope.error)
        : `Guard request failed with status ${response.status}`;

    if (!response.ok && (response.status >= 500 || response.status === 0)) {
      markOffline();
      resetTimeoutPenalty();
      return {
        data: null,
        offline: true,
        status: response.status,
        error: errorMessage,
      };
    }

    return {
      data: null,
      offline: false,
      status: response.status,
      error: errorMessage,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");

    // All errors are treated as offline
    markOffline();
    resetTimeoutPenalty();
    return {
      data: null,
      offline: true,
      error: message,
    };
  }
}

export function getGuardOfflineUntil(): number {
  return offlineUntil;
}

export async function getGuardStatus(): Promise<GuardClientResult<GuardStatusData>> {
  return guardRequest<GuardStatusData>("/status");
}

export async function getGuardIp(): Promise<GuardClientResult<GuardIpData>> {
  return guardRequest<GuardIpData>("/ip");
}

export async function sendGuardEvent(
  payload: GuardEventRequest,
): Promise<GuardClientResult<GuardEventData>> {
  return guardRequest<GuardEventData>("/event", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export type { GuardAlertLevel };
export const GUARD_RETRY_DELAY_MS = OFFLINE_RETRY_DELAY_MS;
