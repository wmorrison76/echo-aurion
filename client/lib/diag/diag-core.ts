import type { DiagEvent, DiagReport } from "./diag-events";

declare global {
  interface Window {
    __LUCCCA_DIAG__?: {
      enabled: boolean;
      report: DiagReport;
      emit: (e: DiagEvent) => void;
      finalize: () => void;
      downloadJson: (filename?: string) => void;
    };
  }
}

function now() {
  return Date.now();
}

function safeStringify(arg: unknown): string {
  try {
    if (typeof arg === "string") return arg;
    if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack ?? ""}`;
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

export function isDiagEnabled(): boolean {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("diag") === "1") return true;
  } catch {}
  // Vite env (optional)
  // @ts-expect-error import.meta may exist in Vite
  if (typeof import.meta !== "undefined" && import.meta.env && (import.meta.env.VITE_DIAG === "1" || import.meta.env.MODE === "diag")) {
    return true;
  }
  return false;
}

export function initDiagIfEnabled(): void {
  if (typeof window === "undefined") return;
  if (window.__LUCCCA_DIAG__?.enabled) return;

  const enabled = isDiagEnabled();
  const report: DiagReport = {
    startedAt: now(),
    href: window.location.href,
    panels: {},
    events: [],
  };

  function emit(e: DiagEvent) {
    report.events.push(e);
    // Keep console visible in dev
    if (e.type === "console" && e.payload.kind === "error") {
      // no-op
    }
  }

  window.__LUCCCA_DIAG__ = {
    enabled,
    report,
    emit,
    finalize() {
      report.finishedAt = now();
    },
    downloadJson(filename = "diag-report.json") {
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
  };

  if (!enabled) return;

  emit({ t: now(), level: "info", type: "diag_init", payload: { href: window.location.href } });

  // Hook console
  const original = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };

  console.log = (...args: unknown[]) => {
    emit({ t: now(), level: "info", type: "console", payload: { kind: "log", args: args.map(safeStringify) } });
    original.log(...args);
  };
  console.warn = (...args: unknown[]) => {
    emit({ t: now(), level: "warn", type: "console", payload: { kind: "warn", args: args.map(safeStringify) } });
    original.warn(...args);
  };
  console.error = (...args: unknown[]) => {
    emit({ t: now(), level: "error", type: "console", payload: { kind: "error", args: args.map(safeStringify) } });
    original.error(...args);
  };

  // Window errors
  window.addEventListener("error", (ev) => {
    const err = (ev as ErrorEvent).error as Error | undefined;
    emit({
      t: now(),
      level: "error",
      type: "window_error",
      payload: {
        message: (ev as ErrorEvent).message ?? "Window error",
        filename: (ev as ErrorEvent).filename,
        lineno: (ev as ErrorEvent).lineno,
        colno: (ev as ErrorEvent).colno,
        stack: err?.stack,
      },
    });
  });

  window.addEventListener("unhandledrejection", (ev) => {
    const reason = ev.reason;
    const message = reason instanceof Error ? reason.message : safeStringify(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    emit({ t: now(), level: "error", type: "unhandled_rejection", payload: { reason: message, stack } });
  });
}

export function recordPanelLoaderStart(panelKey: string) {
  if (!window.__LUCCCA_DIAG__?.enabled) return;
  window.__LUCCCA_DIAG__.emit({ t: now(), level: "info", type: "loader_start", payload: { panelKey } });
}

export function recordPanelLoaderOk(panelKey: string, ms: number) {
  if (!window.__LUCCCA_DIAG__?.enabled) return;
  window.__LUCCCA_DIAG__.emit({ t: now(), level: "info", type: "loader_ok", payload: { panelKey, ms } });
}

export function recordPanelLoaderFail(panelKey: string, ms: number, err: unknown) {
  if (!window.__LUCCCA_DIAG__?.enabled) return;
  const e = err instanceof Error ? err : new Error(String(err));
  window.__LUCCCA_DIAG__.emit({
    t: now(),
    level: "error",
    type: "loader_fail",
    payload: { panelKey, ms, message: e.message, stack: e.stack },
  });
}

export function upsertPanelResult(panelKey: string, patch: Partial<DiagReport["panels"][string]>) {
  if (!window.__LUCCCA_DIAG__?.enabled) return;
  const rep = window.__LUCCCA_DIAG__.report;
  rep.panels[panelKey] = { ...(rep.panels[panelKey] ?? {}), ...patch };
}

export function finalizeDiag() {
  if (!window.__LUCCCA_DIAG__?.enabled) return;
  window.__LUCCCA_DIAG__.finalize();
}
