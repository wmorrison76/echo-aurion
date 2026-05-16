import { Router } from "express";
import { promises as fs } from "fs";
import path from "path";
interface OcrMetricPayload {
  id: string;
  vendor?: string;
  averageConfidence: number;
  lowConfidenceRate: number;
  glCoverage: number;
  totalLines: number;
  source?: string;
  timestamp: number;
}
interface CorrectionPayload {
  id: string;
  vendor?: string;
  field: string;
  before?: string | number | null;
  after?: string | number | null;
  timestamp: number;
}
interface TelemetryAlert {
  id: string;
  type: "ocr_confidence" | "gl_coverage" | "high_corrections";
  severity: "info" | "warning" | "critical";
  message: string;
  detail?: string;
  createdAt: number;
  resolvedAt?: number;
  acknowledged?: boolean;
}
interface TelemetryState {
  ocrEvents: OcrMetricPayload[];
  corrections: CorrectionPayload[];
  alerts: TelemetryAlert[];
}
const MAX_EVENTS = 200;
const MAX_CORRECTIONS = 500;
const STORAGE_PATH = path.join(
  process.cwd(),
  "server",
  "data",
  "telemetry.json",
);
const telemetryState: TelemetryState = {
  ocrEvents: [],
  corrections: [],
  alerts: [],
};
export function getTelemetrySnapshot(): TelemetryState {
  return telemetryState;
}
async function ensureStorageDir() {
  const dir = path.dirname(STORAGE_PATH);
  await fs.mkdir(dir, { recursive: true }).catch(() => undefined);
}
async function persistState() {
  await ensureStorageDir();
  const payload = JSON.stringify(telemetryState, null, 2);
  await fs.writeFile(STORAGE_PATH, payload, "utf-8").catch(() => undefined);
}
function pushAlert(alert: TelemetryAlert) {
  telemetryState.alerts.push(alert);
  telemetryState.alerts = telemetryState.alerts.slice(-100);
}
function computeStatistics(windowMinutes = 240) {
  const cutoff = Date.now() - windowMinutes * 60 * 1000;
  const windowEvents = telemetryState.ocrEvents.filter(
    (event) => event.timestamp >= cutoff,
  );
  const windowCorrections = telemetryState.corrections.filter(
    (entry) => entry.timestamp >= cutoff,
  );
  const avgConfidence =
    windowEvents.reduce((sum, event) => sum + event.averageConfidence, 0) /
    Math.max(windowEvents.length, 1);
  const avgLowRate =
    windowEvents.reduce((sum, event) => sum + event.lowConfidenceRate, 0) /
    Math.max(windowEvents.length, 1);
  const avgGlCoverage =
    windowEvents.reduce((sum, event) => sum + event.glCoverage, 0) /
    Math.max(windowEvents.length, 1);
  const correctionsPerInvoice =
    windowEvents.length > 0
      ? windowCorrections.length / windowEvents.length
      : windowCorrections.length;
  return {
    windowEvents,
    windowCorrections,
    avgConfidence,
    avgLowRate,
    avgGlCoverage,
    correctionsPerInvoice,
  };
}
function evaluateAlerts(metric: OcrMetricPayload) {
  const { avgConfidence, avgLowRate, avgGlCoverage, correctionsPerInvoice } =
    computeStatistics();
  if (avgConfidence < 0.78 && avgLowRate > 0.32) {
    const existing = telemetryState.alerts.find(
      (alert) => alert.type === "ocr_confidence" && !alert.resolvedAt,
    );
    if (!existing) {
      pushAlert({
        id: `alert-${Date.now()}`,
        type: "ocr_confidence",
        severity: avgConfidence < 0.7 ? "critical" : "warning",
        message: "OCR confidence trending low",
        detail: `Avg confidence ${avgConfidence.toFixed(2)} with low-confidence rate ${(avgLowRate * 100).toFixed(1)}%.`,
        createdAt: metric.timestamp,
      });
    }
  } else {
    telemetryState.alerts = telemetryState.alerts.map((alert) =>
      alert.type === "ocr_confidence" && !alert.resolvedAt
        ? {
            ...alert,
            resolvedAt: Date.now(),
            detail: `Confidence recovered to ${(avgConfidence * 100).toFixed(1)}%.`,
          }
        : alert,
    );
  }
  if (avgGlCoverage < 0.6) {
    const existing = telemetryState.alerts.find(
      (alert) => alert.type === "gl_coverage" && !alert.resolvedAt,
    );
    if (!existing) {
      pushAlert({
        id: `alert-${Date.now()}-gl`,
        type: "gl_coverage",
        severity: avgGlCoverage < 0.45 ? "critical" : "warning",
        message: "GL classification coverage down",
        detail: `Coverage ${(avgGlCoverage * 100).toFixed(1)}%.`,
        createdAt: metric.timestamp,
      });
    }
  } else {
    telemetryState.alerts = telemetryState.alerts.map((alert) =>
      alert.type === "gl_coverage" && !alert.resolvedAt
        ? {
            ...alert,
            resolvedAt: Date.now(),
            detail: `Coverage recovered to ${(avgGlCoverage * 100).toFixed(1)}%.`,
          }
        : alert,
    );
  }
  if (correctionsPerInvoice > 5) {
    const existing = telemetryState.alerts.find(
      (alert) => alert.type === "high_corrections" && !alert.resolvedAt,
    );
    if (!existing) {
      pushAlert({
        id: `alert-${Date.now()}-corr`,
        type: "high_corrections",
        severity: correctionsPerInvoice > 10 ? "critical" : "warning",
        message: "Heavy reviewer corrections detected",
        detail: `${correctionsPerInvoice.toFixed(1)} corrections per invoice in last window.`,
        createdAt: metric.timestamp,
      });
    }
  } else {
    telemetryState.alerts = telemetryState.alerts.map((alert) =>
      alert.type === "high_corrections" && !alert.resolvedAt
        ? {
            ...alert,
            resolvedAt: Date.now(),
            detail: `Corrections normalized to ${correctionsPerInvoice.toFixed(1)} per invoice.`,
          }
        : alert,
    );
  }
}
const telemetryRouter = Router();
telemetryRouter.post("/ocr", async (req, res) => {
  const payload = req.body as Partial<OcrMetricPayload>;
  if (
    typeof payload.averageConfidence !== "number" ||
    typeof payload.lowConfidenceRate !== "number"
  ) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const entry: OcrMetricPayload = {
    id: payload.id ?? `ocr-${Date.now()}`,
    vendor: payload.vendor,
    averageConfidence: Math.min(Math.max(payload.averageConfidence, 0), 1),
    lowConfidenceRate: Math.min(Math.max(payload.lowConfidenceRate, 0), 1),
    glCoverage: Math.min(Math.max(payload.glCoverage ?? 0, 0), 1),
    totalLines: Math.max(Math.floor(payload.totalLines ?? 0), 0),
    source: payload.source,
    timestamp: payload.timestamp ?? Date.now(),
  };
  telemetryState.ocrEvents.push(entry);
  telemetryState.ocrEvents = telemetryState.ocrEvents.slice(-MAX_EVENTS);
  evaluateAlerts(entry);
  await persistState();
  return res.json({ ok: true });
});
telemetryRouter.post("/correction", async (req, res) => {
  const payload = req.body as Partial<CorrectionPayload>;
  if (!payload.field) {
    return res.status(400).json({ error: "Missing field" });
  }
  const entry: CorrectionPayload = {
    id: payload.id ?? `corr-${Date.now()}`,
    vendor: payload.vendor,
    field: payload.field,
    before: payload.before,
    after: payload.after,
    timestamp: payload.timestamp ?? Date.now(),
  };
  telemetryState.corrections.push(entry);
  telemetryState.corrections =
    telemetryState.corrections.slice(-MAX_CORRECTIONS);
  await persistState();
  return res.json({ ok: true });
});
telemetryRouter.get("/alerts", (_req, res) => {
  const active = telemetryState.alerts.filter((alert) => !alert.resolvedAt);
  return res.json({ alerts: active });
});
telemetryRouter.get("/summary", (_req, res) => {
  const { avgConfidence, avgLowRate, avgGlCoverage, correctionsPerInvoice } =
    computeStatistics();
  res.json({
    avgConfidence,
    avgLowRate,
    avgGlCoverage,
    correctionsPerInvoice,
    totals: {
      events: telemetryState.ocrEvents.length,
      corrections: telemetryState.corrections.length,
    },
  });
});
telemetryRouter.post("/alerts/:id/ack", async (req, res) => {
  const { id } = req.params;
  const alert = telemetryState.alerts.find((entry) => entry.id === id);
  if (!alert) {
    return res.status(404).json({ error: "Alert not found" });
  }
  alert.acknowledged = true;
  await persistState();
  res.json({ ok: true });
});
export { telemetryRouter };
