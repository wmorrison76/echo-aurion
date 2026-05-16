/**
 * MODULE HEALTH DIAGNOSTIC PAGE
 *
 * Visit http://localhost:8080/diagnostic
 *
 * This page will:
 * 1. Attempt to dynamically import every module
 * 2. Attempt to render each module inside isolated error boundaries
 * 3. Report exactly which modules work, which fail, and the exact error
 */

import React, { useEffect, useState, useCallback } from "react";

interface ModuleConfig {
  id: string;
  label: string;
  loader: () => Promise<{ default: React.ComponentType<any> }>;
}

const MODULE_CONFIGS: ModuleConfig[] = [
  { id: "culinary", label: "Culinary", loader: () => import("@/modules/Culinary") },
  // Culinary2 / Pastry2 modules don't exist; use runtime-string imports so vite
  // skips them at build time. ModuleDiagnostic surfaces the failure at runtime.
  { id: "culinary2", label: "Culinary 2", loader: () => import(/* @vite-ignore */ ["@", "modules", "Culinary2"].join("/")) },
  { id: "pastry", label: "Pastry", loader: () => import("@/modules/Pastry") },
  { id: "pastry2", label: "Pastry 2", loader: () => import(/* @vite-ignore */ ["@", "modules", "Pastry2"].join("/")) },
  { id: "schedule", label: "Schedule", loader: () => import("@/schedule-panel") },
  { id: "inventory", label: "Inventory", loader: () => import("@/modules/OrderingInventory") },
  { id: "purchasing-receiving", label: "Purchasing & Receiving", loader: () => import("@/modules/PurchasingReceiving") },
  { id: "echoaurum", label: "EchoAurum", loader: () => import("@/modules/EchoAurum/EchoAurumPanel") },
  { id: "mixology_sommelier", label: "Mixology & Sommelier", loader: () => import("@/modules/MixologySommelier") },
];

function ErrorPlaceholder({ error }: { error: any }) {
  return (
    <div style={{ padding: 12, color: "#f87171", fontSize: 12, fontFamily: "monospace" }}>
      Import failed: {error?.message || String(error)}
    </div>
  );
}

type ModuleResult = {
  id: string;
  label: string;
  importStatus: "pending" | "ok" | "fail";
  importError?: string;
  importTimeMs?: number;
  renderStatus: "pending" | "ok" | "fail" | "skipped";
  renderError?: string;
  component?: React.ComponentType<any>;
};

class DiagnosticBoundary extends React.Component<
  { onError: (error: Error, info: React.ErrorInfo) => void; children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError(error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 8,
            background: "#450a0a",
            borderRadius: 4,
            fontSize: 11,
            fontFamily: "monospace",
            color: "#fca5a5",
          }}
        >
          <strong>Render Error:</strong> {this.state.error.message}
          {this.state.error.stack && (
            <pre
              style={{
                fontSize: 10,
                marginTop: 4,
                opacity: 0.7,
                whiteSpace: "pre-wrap",
                maxHeight: 120,
                overflow: "auto",
              }}
            >
              {this.state.error.stack.split("\n").slice(0, 6).join("\n")}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "#1e293b", text: "#94a3b8", label: "⏳ Pending" },
    ok: { bg: "#052e16", text: "#4ade80", label: "✅ OK" },
    fail: { bg: "#450a0a", text: "#f87171", label: "❌ Failed" },
    skipped: { bg: "#1e293b", text: "#64748b", label: "⏭ Skipped" },
  };
  const c = colors[status] || colors.pending;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        background: c.bg,
        color: c.text,
      }}
    >
      {c.label}
    </span>
  );
}

function RenderProbe({
  moduleId,
  Component,
  onSuccess,
}: {
  moduleId: string;
  Component: React.ComponentType<any>;
  onSuccess: () => void;
}) {
  useEffect(() => {
    onSuccess();
  }, [onSuccess]);
  return (
    <div style={{ minHeight: 50, position: "relative" }}>
      <React.Suspense
        fallback={
          <div style={{ padding: 8, color: "#94a3b8", fontSize: 11 }}>Loading {moduleId}...</div>
        }
      >
        <Component />
      </React.Suspense>
    </div>
  );
}

export default function ModuleDiagnostic() {
  const [results, setResults] = useState<ModuleResult[]>(
    MODULE_CONFIGS.map((m) => ({
      id: m.id,
      label: m.label,
      importStatus: "pending",
      renderStatus: "pending",
    }))
  );
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [renderTest, setRenderTest] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const updateResult = useCallback((id: string, updates: Partial<ModuleResult>) => {
    setResults((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  const runImportTests = useCallback(async () => {
    setIsRunning(true);
    console.log("\n🔬 MODULE DIAGNOSTIC — IMPORT PHASE\n");

    for (const config of MODULE_CONFIGS) {
      const start = performance.now();
      try {
        const mod = await config.loader().catch((e) => {
          throw e;
        });
        const elapsed = Math.round(performance.now() - start);
        const hasDefault = mod && typeof mod.default === "function";
        if (hasDefault) {
          console.log(`  ✅ ${config.label} — ${elapsed}ms`);
          updateResult(config.id, { importStatus: "ok", importTimeMs: elapsed, component: mod.default });
        } else {
          updateResult(config.id, {
            importStatus: "fail",
            importError: "No default export",
            importTimeMs: elapsed,
            renderStatus: "skipped",
          });
        }
      } catch (err: any) {
        const elapsed = Math.round(performance.now() - start);
        console.error(`  ❌ ${config.label}:`, err.message);
        updateResult(config.id, {
          importStatus: "fail",
          importError: err.message || String(err),
          importTimeMs: elapsed,
          renderStatus: "skipped",
        });
      }
    }
    setIsRunning(false);
  }, [updateResult]);

  const runRenderTest = useCallback(
    (id: string) => {
      setRenderTest(id);
      updateResult(id, { renderStatus: "pending" });
    },
    [updateResult]
  );

  const handleRenderError = useCallback(
    (id: string, error: Error) => {
      updateResult(id, { renderStatus: "fail", renderError: error.message });
    },
    [updateResult]
  );

  const handleRenderSuccess = useCallback(
    (id: string) => {
      updateResult(id, { renderStatus: "ok" });
    },
    [updateResult]
  );

  const passCount = results.filter((r) => r.importStatus === "ok").length;
  const failCount = results.filter((r) => r.importStatus === "fail").length;
  const renderPassCount = results.filter((r) => r.renderStatus === "ok").length;
  const renderFailCount = results.filter((r) => r.renderStatus === "fail").length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#e2e8f0",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f8fafc", margin: 0 }}>
            🔬 LUCCCA Module Diagnostic
          </h1>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
            Tests every module&apos;s import and render to find what&apos;s broken.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <button
            onClick={runImportTests}
            disabled={isRunning}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: "none",
              background: isRunning ? "#334155" : "#2563eb",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: isRunning ? "not-allowed" : "pointer",
            }}
          >
            {isRunning ? "Testing..." : "▶ Run All Import Tests"}
          </button>
        </div>

        {(passCount + failCount) > 0 && (
          <div
            style={{
              display: "flex",
              gap: 16,
              marginBottom: 24,
              padding: 16,
              background: "#1e293b",
              borderRadius: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#4ade80" }}>{passCount}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Imports OK</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#f87171" }}>{failCount}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Imports Failed</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#4ade80" }}>{renderPassCount}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Renders OK</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#f87171" }}>{renderFailCount}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Renders Failed</div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {results.map((result) => (
            <div
              key={result.id}
              style={{
                background: "#1e293b",
                borderRadius: 8,
                border: `1px solid ${
                  result.importStatus === "fail" || result.renderStatus === "fail"
                    ? "#991b1b"
                    : result.importStatus === "ok" && result.renderStatus === "ok"
                      ? "#166534"
                      : "#334155"
                }`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  cursor: "pointer",
                }}
                onClick={() => setSelectedModule(selectedModule === result.id ? null : result.id)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{result.label}</div>
                  <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>
                    {result.id}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>Import</div>
                    <StatusBadge status={result.importStatus} />
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>Render</div>
                    <StatusBadge status={result.renderStatus} />
                  </div>
                  {result.importStatus === "ok" && result.renderStatus !== "ok" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        runRenderTest(result.id);
                      }}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 4,
                        border: "1px solid #334155",
                        background: "#0f172a",
                        color: "#93c5fd",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Test Render
                    </button>
                  )}
                </div>
              </div>

              {(result.importError || result.renderError) && selectedModule === result.id && (
                <div style={{ padding: "0 16px 12px", fontSize: 12 }}>
                  {result.importError && (
                    <div
                      style={{
                        background: "#450a0a",
                        borderRadius: 4,
                        padding: 8,
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ color: "#f87171", fontWeight: 600, marginBottom: 4 }}>
                        Import Error:
                      </div>
                      <pre
                        style={{
                          color: "#fca5a5",
                          fontFamily: "monospace",
                          fontSize: 11,
                          whiteSpace: "pre-wrap",
                          margin: 0,
                        }}
                      >
                        {result.importError}
                      </pre>
                    </div>
                  )}
                  {result.renderError && (
                    <div style={{ background: "#450a0a", borderRadius: 4, padding: 8 }}>
                      <div style={{ color: "#f87171", fontWeight: 600, marginBottom: 4 }}>
                        Render Error:
                      </div>
                      <pre
                        style={{
                          color: "#fca5a5",
                          fontFamily: "monospace",
                          fontSize: 11,
                          whiteSpace: "pre-wrap",
                          margin: 0,
                        }}
                      >
                        {result.renderError}
                      </pre>
                    </div>
                  )}
                  {result.importTimeMs !== undefined && (
                    <div style={{ color: "#64748b", fontSize: 10, marginTop: 4 }}>
                      Import time: {result.importTimeMs}ms
                    </div>
                  )}
                </div>
              )}

              {renderTest === result.id && result.component && (
                <div
                  style={{
                    borderTop: "1px solid #334155",
                    padding: 12,
                    maxHeight: 300,
                    overflow: "auto",
                  }}
                >
                  <div style={{ fontSize: 10, color: "#64748b", marginBottom: 8 }}>
                    RENDER TEST — Content below = module renders. Red error = crash.
                  </div>
                  <DiagnosticBoundary
                    onError={(error) => handleRenderError(result.id, error)}
                  >
                    <RenderProbe
                      moduleId={result.id}
                      Component={result.component}
                      onSuccess={() => handleRenderSuccess(result.id)}
                    />
                  </DiagnosticBoundary>
                </div>
              )}
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 32,
            padding: 16,
            background: "#1e293b",
            borderRadius: 8,
            fontSize: 12,
            color: "#94a3b8",
            lineHeight: 1.6,
          }}
        >
          <h3 style={{ color: "#e2e8f0", margin: "0 0 8px", fontSize: 14 }}>How to use</h3>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            <li>
              <strong>Run All Import Tests</strong> — tests if each module&apos;s JS loads
            </li>
            <li>
              <strong>Test Render</strong> on any passed import — attempts to mount the component
            </li>
            <li>
              <strong>Click a row</strong> to expand error details
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
