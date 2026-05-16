export type DiagLevel = "info" | "warn" | "error";

export type DiagEvent =
  | { t: number; level: DiagLevel; type: "diag_init"; payload: { href: string } }
  | { t: number; level: DiagLevel; type: "console"; payload: { kind: "log" | "warn" | "error"; args: string[] } }
  | { t: number; level: DiagLevel; type: "window_error"; payload: { message: string; filename?: string; lineno?: number; colno?: number; stack?: string } }
  | { t: number; level: DiagLevel; type: "unhandled_rejection"; payload: { reason: string; stack?: string } }
  | { t: number; level: DiagLevel; type: "loader_start"; payload: { panelKey: string } }
  | { t: number; level: DiagLevel; type: "loader_ok"; payload: { panelKey: string; ms: number } }
  | { t: number; level: DiagLevel; type: "loader_fail"; payload: { panelKey: string; ms: number; message: string; stack?: string } }
  | { t: number; level: DiagLevel; type: "render_start"; payload: { panelKey: string } }
  | { t: number; level: DiagLevel; type: "render_ok"; payload: { panelKey: string; ms: number } }
  | { t: number; level: DiagLevel; type: "render_fail"; payload: { panelKey: string; ms: number; message: string; stack?: string; componentStack?: string } }
  | { t: number; level: DiagLevel; type: "render_timeout"; payload: { panelKey: string; ms: number } };

export type DiagReport = {
  startedAt: number;
  finishedAt?: number;
  href: string;
  panels: Record<
    string,
    {
      loader?: { ok: boolean; ms: number; error?: { message: string; stack?: string } };
      render?: { ok: boolean; ms: number; error?: { message: string; stack?: string; componentStack?: string } };
      notes?: string[];
    }
  >;
  events: DiagEvent[];
};
