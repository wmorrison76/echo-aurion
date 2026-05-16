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
const REQUEST_TIMEOUT_MS = 30000;
const MAX_TIMEOUT_DELAY_MS = 120000;
let offlineUntil = 0;
let timeoutPenaltyLevel = 0;

function markOffline(delayMs: number = OFFLINE_RETRY_DELAY_MS, jitterMs = 0) {
  if (typeof Date.now !== "function") return;
  const jitter = jitterMs > 0 ? Math.random() * jitterMs : 0;
  offlineUntil = Date.now() + Math.max(0, Math.round(delayMs + jitter));
}

function markTimeoutOffline() {
  const multiplier = Math.pow(1.6, timeoutPenaltyLevel);
  timeoutPenaltyLevel = Math.min(timeoutPenaltyLevel + 1, 5);
  const delay = Math.min(
    MAX_TIMEOUT_DELAY_MS,
    Math.round(OFFLINE_RETRY_DELAY_MS * multiplier),
  );
  markOffline(delay, 2500);
}

function resetTimeoutPenalty() {
  timeoutPenaltyLevel = 0;
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

  const supportsAbort =
    typeof AbortController !== "undefined" && !init?.signal;
  const controller = supportsAbort ? new AbortController() : null;
  const signal = init?.signal ?? controller?.signal;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let abortedByTimeout = false;

  if (controller) {
    timeoutId = setTimeout(() => {
      if (controller.signal.aborted) return;
      abortedByTimeout = true;
      if (typeof DOMException === "function") {
        controller.abort(
          new DOMException("Guard request timed out", "TimeoutError"),
        );
      } else {
        controller.abort("Guard request timed out");
      }
    }, REQUEST_TIMEOUT_MS);
  }

  try {
    const response = await fetch(`${GUARD_BASE_PATH}${path}`, {
      cache: "no-store",
      credentials: "same-origin",
      keepalive: false,
      ...init,
      signal,
      headers: normalizeHeaders(init?.headers),
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

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
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    const name = (error as any)?.name;
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");

    if (name === "AbortError" || name === "DOMException") {
      if (abortedByTimeout) {
        markTimeoutOffline();
        return {
          data: null,
          offline: true,
          error: "Guard service timed out",
        };
      }
      // Request was aborted externally, not by timeout - treat as normal offline
      markOffline(OFFLINE_RETRY_DELAY_MS, 1000);
      return { data: null, offline: true, error: undefined };
    }

    if (name === "TimeoutError") {
      markTimeoutOffline();
      return {
        data: null,
        offline: true,
        error: "Guard service timed out",
      };
    }

    // Don't log network errors to avoid cluttering console
    markOffline();
    resetTimeoutPenalty();
    return {
      data: null,
      offline: true,
      error: undefined,
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
