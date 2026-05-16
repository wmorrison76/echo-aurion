/**
 * LUCCCA Diagnostic Core — runtime flight recorder
 * Enable with ?diag=1 or VITE_DIAG=1. Records console, errors, imports, module lifecycle.
 */

export interface DiagEvent {
  ts: number;
  type: string;
  module?: string;
  data: Record<string, unknown>;
  stack?: string;
}

class DiagnosticCore {
  private events: DiagEvent[] = [];
  private enabled = false;
  private listeners: Set<(event: DiagEvent) => void> = new Set();

  init(): void {
    if (
      (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("diag")) ||
      (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_DIAG)
    ) {
      this.enabled = true;
      console.log("[DIAG] Diagnostic Core activated");
      this.interceptConsole();
      this.interceptErrors();
    }
  }

  emit(type: string, data: Record<string, unknown> = {}, module?: string): void {
    if (!this.enabled) return;
    const event: DiagEvent = {
      ts: typeof performance !== "undefined" ? performance.now() : Date.now(),
      type,
      module,
      data,
    };
    this.events.push(event);
    this.listeners.forEach((fn) => fn(event));
    console.debug(`[DIAG:${type}]`, module ?? "", data);
  }

  private interceptConsole(): void {
    const origError = console.error;
    const origWarn = console.warn;
    console.error = (...args: unknown[]) => {
      this.emit("console.error", { message: args.map((a) => String(a)).join(" ") });
      origError.apply(console, args);
    };
    console.warn = (...args: unknown[]) => {
      this.emit("console.warn", { message: args.map((a) => String(a)).join(" ") });
      origWarn.apply(console, args);
    };
  }

  private interceptErrors(): void {
    if (typeof window === "undefined") return;
    window.addEventListener("error", (e) => {
      this.emit("global.error", {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
      });
    });
    window.addEventListener("unhandledrejection", (e) => {
      this.emit("unhandled.rejection", {
        reason: String(e.reason),
        stack: (e.reason as Error)?.stack,
      });
    });
  }

  moduleMount(moduleId: string): void {
    this.emit("module.mount", { mounted: true }, moduleId);
  }

  moduleUnmount(moduleId: string): void {
    this.emit("module.unmount", {}, moduleId);
  }

  moduleError(moduleId: string, error: Error): void {
    this.emit("module.error", { message: error.message, stack: error.stack }, moduleId);
  }

  moduleNullRender(moduleId: string, reason: string): void {
    this.emit("module.null_render", { reason }, moduleId);
  }

  importStart(moduleId: string, path: string): void {
    this.emit("import.start", { path }, moduleId);
  }

  importSuccess(moduleId: string, path: string): void {
    this.emit("import.success", { path }, moduleId);
  }

  importFailure(moduleId: string, path: string, error: Error): void {
    this.emit("import.failure", { path, message: error.message, stack: error.stack }, moduleId);
  }

  routeChange(from: string, to: string): void {
    this.emit("route.change", { from, to });
  }

  subscribe(fn: (event: DiagEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getEvents(): DiagEvent[] {
    return [...this.events];
  }

  getTimeline(): string {
    return this.events
      .map((e) => `[${e.ts.toFixed(1)}ms] ${e.type} ${e.module ?? ""} ${JSON.stringify(e.data)}`)
      .join("\n");
  }

  exportNDJSON(): string {
    return this.events.map((e) => JSON.stringify(e)).join("\n");
  }

  downloadReport(): void {
    const blob = new Blob([this.exportNDJSON()], { type: "application/x-ndjson" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `luccca-diag-${Date.now()}.ndjson`;
    a.click();
    URL.revokeObjectURL(url);
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const diag = new DiagnosticCore();
