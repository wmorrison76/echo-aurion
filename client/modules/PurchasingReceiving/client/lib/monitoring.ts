import { toast } from "@/hooks/use-toast";
export interface OcrMetrics {
  averageConfidence: number;
  lowConfidenceRate: number;
  glCoverage: number;
  totalLines: number;
  vendor?: string;
  source?: string;
}
export interface CorrectionEvent {
  vendor?: string;
  field: string;
  before?: string | number | null;
  after?: string | number | null;
}
const NETWORK_FAILURE_BACKOFF_MS = 5 * 60 * 1000;
let telemetryBackoffUntil = 0;
let telemetryBackoffLogged = false;
function resolveTelemetryUrl(path: string) {
  if (typeof window === "undefined") {
    return path;
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const configuredBase = (
    window as unknown as { __APP_TELEMETRY_BASE__?: string }
  ).__APP_TELEMETRY_BASE__;
  if (configuredBase) {
    return new URL(path, configuredBase).toString();
  }
  return new URL(path, window.location.origin).toString();
}
function shouldSkipTelemetryRequests() {
  return Date.now() < telemetryBackoffUntil;
}
function markTelemetryRequestSuccess() {
  telemetryBackoffUntil = 0;
  telemetryBackoffLogged = false;
}
function handleTelemetryNetworkFailure(error: unknown) {
  telemetryBackoffUntil = Date.now() + NETWORK_FAILURE_BACKOFF_MS;
  if (!telemetryBackoffLogged) {
    console.info(
      "Telemetry API unreachable, pausing telemetry for 5 minutes.",
      error,
    );
    telemetryBackoffLogged = true;
  }
}
async function postJson<T>(url: string, body: unknown): Promise<T | null> {
  if (shouldSkipTelemetryRequests()) {
    return null;
  }
  const target = resolveTelemetryUrl(url);
  try {
    const response = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });
    if (!response.ok) {
      console.warn("Telemetry request failed", response.statusText);
      return null;
    }
    const payload = (await response.json()) as T;
    markTelemetryRequestSuccess();
    return payload;
  } catch (error) {
    handleTelemetryNetworkFailure(error);
    return null;
  }
}
export async function recordOcrMetrics(metrics: OcrMetrics) {
  await postJson<{ ok: boolean }>("/api/telemetry/ocr", {
    ...metrics,
    timestamp: Date.now(),
  });
}
export async function recordCorrection(event: CorrectionEvent) {
  await postJson<{ ok: boolean }>("/api/telemetry/correction", {
    ...event,
    timestamp: Date.now(),
  });
}
type TelemetryAlert = {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  detail?: string;
};
async function fetchAlerts(): Promise<TelemetryAlert[]> {
  if (shouldSkipTelemetryRequests()) {
    return [];
  }
  const target = resolveTelemetryUrl("/api/telemetry/alerts");
  try {
    const response = await fetch(target, { credentials: "include" });
    if (!response.ok) return [];
    const payload = (await response.json()) as { alerts?: TelemetryAlert[] };
    markTelemetryRequestSuccess();
    return payload.alerts ?? [];
  } catch (error) {
    handleTelemetryNetworkFailure(error);
    return [];
  }
}
const displayedAlerts = new Set<string>();
const lastAlertByKey = new Map<string, number>();
const MIN_ALERT_INTERVAL_MS = 10 * 60 * 1000;
export function startTelemetryAlerts(intervalMs = 60000) {
  let cancelled = false;
  const tick = async () => {
    if (cancelled) return;
    const alerts = await fetchAlerts();
    alerts.forEach((alert) => {
      if (displayedAlerts.has(alert.id)) return;
      const key = `${alert.severity}:${alert.message}:${alert.detail ?? ""}`;
      const lastShown = lastAlertByKey.get(key) ?? 0;
      if (Date.now() - lastShown < MIN_ALERT_INTERVAL_MS) {
        displayedAlerts.add(alert.id);
        return;
      }
      displayedAlerts.add(alert.id);
      lastAlertByKey.set(key, Date.now());
      const title =
        alert.severity === "critical" ? "Critical data drift" : alert.message;
      toast({
        title,
        description: alert.detail ?? alert.message,
        variant: alert.severity === "critical" ? "destructive" : "default",
      });
    });
    if (!cancelled) {
      setTimeout(tick, intervalMs);
    }
  };
  void tick();
  return () => {
    cancelled = true;
  };
}
