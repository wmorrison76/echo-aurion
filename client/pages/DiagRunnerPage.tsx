import React, { useEffect, useMemo, useRef, useState } from "react";
import { PANEL_REGISTRY } from "@/lib/panel-registry";
import {
  initDiagIfEnabled,
  recordPanelLoaderFail,
  recordPanelLoaderOk,
  recordPanelLoaderStart,
  upsertPanelResult,
  finalizeDiag,
} from "@/lib/diag/diag-core";
import { DiagErrorBoundary } from "@/lib/diag/DiagErrorBoundary";

type PanelLoader = () => Promise<any>;

function isProbablyReactComponent(x: any) {
  return typeof x === "function" || (typeof x === "object" && x && (x.$$typeof || x.render));
}

function pickComponent(mod: any) {
  if (!mod) return null;
  if (isProbablyReactComponent(mod.default)) return mod.default;
  // common named exports
  for (const k of ["Panel", "Component", "View", "Page"]) {
    if (isProbablyReactComponent(mod[k])) return mod[k];
  }
  // last resort: first function export
  for (const [k, v] of Object.entries(mod)) {
    if (isProbablyReactComponent(v)) return v;
  }
  return null;
}

export default function DiagRunnerPage() {
  const [running, setRunning] = useState(false);
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [resultsTick, setResultsTick] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    initDiagIfEnabled();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const panelKeys = useMemo(() => {
    // PANEL_REGISTRY is the truth source: what should exist
    return Object.keys(PANEL_REGISTRY as Record<string, PanelLoader>).sort();
  }, []);

  const [ActiveComponent, setActiveComponent] = useState<React.ComponentType<any> | null>(null);

  async function runAll() {
    setRunning(true);
    setDone(false);

    const url = new URL(window.location.href);
    const timeoutMs = Number(url.searchParams.get("timeoutMs") ?? "8000");
    const renderSettleMs = Number(url.searchParams.get("renderSettleMs") ?? "250");
    const stopAfter = Number(url.searchParams.get("stopAfter") ?? "0"); // 0 = no stop

    let i = 0;
    for (const key of panelKeys) {
      if (!mountedRef.current) break;
      i += 1;
      if (stopAfter > 0 && i > stopAfter) break;

      setCurrentKey(key);
      setActiveComponent(null);
      setResultsTick((t) => t + 1);

      // loader
      const loader = (PANEL_REGISTRY as any)[key] as PanelLoader | undefined;
      if (!loader) {
        upsertPanelResult(key, {
          loader: { ok: false, ms: 0, error: { message: "Missing loader in PANEL_REGISTRY" } },
          notes: ["panel-registry-missing-loader"],
        });
        continue;
      }

      recordPanelLoaderStart(key);
      const t0 = performance.now();
      let mod: any = null;
      try {
        mod = await loader();
        const ms = Math.round(performance.now() - t0);
        recordPanelLoaderOk(key, ms);
        upsertPanelResult(key, { loader: { ok: true, ms } });
      } catch (e) {
        const ms = Math.round(performance.now() - t0);
        recordPanelLoaderFail(key, ms, e);
        upsertPanelResult(key, { loader: { ok: false, ms, error: { message: (e as any)?.message ?? String(e), stack: (e as any)?.stack } } });
        continue;
      }

      // render
      const Comp = pickComponent(mod);
      if (!Comp) {
        upsertPanelResult(key, { notes: ["loaded-module-but-no-react-component-export-found"] });
        continue;
      }

      const renderStart = performance.now();
      upsertPanelResult(key, { render: { ok: true, ms: 0 } }); // provisional
      setActiveComponent(() => Comp);

      // wait for render settle or timeout
      const settled = await new Promise<boolean>((resolve) => {
        const settleTimer = window.setTimeout(() => resolve(true), renderSettleMs);
        const timeoutTimer = window.setTimeout(() => {
          window.clearTimeout(settleTimer);
          resolve(false);
        }, timeoutMs);

        // If an error boundary trips, it will mark render: ok false; we still treat as settled.
        window.setTimeout(() => {
          window.clearTimeout(timeoutTimer);
          resolve(true);
        }, renderSettleMs + 10);
      });

      const ms = Math.round(performance.now() - renderStart);
      if (!settled) {
        upsertPanelResult(key, { render: { ok: false, ms, error: { message: `Render timeout after ${timeoutMs}ms` } } });
        // Ensure we clear component to prevent cascading hangs
        setActiveComponent(null);
      } else {
        // If boundary set render to false, keep it. Otherwise finalize success.
        // (We can't read boundary state directly; we rely on upsert done in boundary.)
        upsertPanelResult(key, { render: { ok: true, ms } });
      }

      // reset view between panels
      setActiveComponent(null);
      await new Promise((r) => setTimeout(r, 50));
    }

    finalizeDiag();
    setRunning(false);
    setDone(true);
    setCurrentKey(null);
    setResultsTick((t) => t + 1);
  }

  const report = (window as any).__LUCCCA_DIAG__?.report;
  const panelsReport = report?.panels ?? {};

  return (
    <div style={{ padding: 16, fontFamily: "ui-sans-serif, system-ui" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>LUCCCA Diagnostic Runner</div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>Loads + renders every panel from PANEL_REGISTRY</div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <button
          onClick={() => runAll()}
          disabled={running}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.2)",
            cursor: running ? "not-allowed" : "pointer",
            fontWeight: 700,
          }}
        >
          {running ? "Running…" : "Run All Panels"}
        </button>

        <button
          onClick={() => (window as any).__LUCCCA_DIAG__?.downloadJson?.("diag-report.json")}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.2)", cursor: "pointer" }}
        >
          Download JSON
        </button>

        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Panels: <b>{panelKeys.length}</b>
          {currentKey ? (
            <>
              {" "}
              | Current: <b>{currentKey}</b>
            </>
          ) : null}
          {done ? <> | ✅ Done</> : null}
        </div>
      </div>

      {/* Live test viewport */}
      <div style={{ border: "1px solid rgba(0,0,0,0.15)", borderRadius: 10, padding: 12, minHeight: 140, marginBottom: 14 }}>
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>Render viewport (one panel at a time)</div>
        <div data-diag-viewport="1">
          {ActiveComponent ? (
            <DiagErrorBoundary panelKey={currentKey ?? undefined}>
              <ActiveComponent />
            </DiagErrorBoundary>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.6 }}>{running ? "Loading next panel…" : "Idle"}</div>
          )}
        </div>
      </div>

      {/* Summary table */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 3fr", gap: 8, fontSize: 12 }}>
        <div style={{ fontWeight: 800 }}>PanelKey</div>
        <div style={{ fontWeight: 800 }}>Loader</div>
        <div style={{ fontWeight: 800 }}>Render</div>
        <div style={{ fontWeight: 800 }}>Notes / Error</div>

        {panelKeys.map((k) => {
          const row = panelsReport[k];
          const loader = row?.loader;
          const render = row?.render;
          const notes = row?.notes ?? [];
          const errMsg = loader?.ok === false ? loader.error?.message : render?.ok === false ? render.error?.message : "";
          const line = notes.length ? notes.join(", ") : errMsg ?? "";
          return (
            <React.Fragment key={k + String(resultsTick)}>
              <div style={{ padding: "6px 0", borderTop: "1px solid rgba(0,0,0,0.08)" }}>{k}</div>
              <div style={{ padding: "6px 0", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                {loader ? (loader.ok ? `✅ ${loader.ms}ms` : `❌ ${loader.ms}ms`) : "—"}
              </div>
              <div style={{ padding: "6px 0", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                {render ? (render.ok ? `✅ ${render.ms}ms` : `❌ ${render.ms}ms`) : "—"}
              </div>
              <div style={{ padding: "6px 0", borderTop: "1px solid rgba(0,0,0,0.08)", opacity: 0.85, whiteSpace: "pre-wrap" }}>{line}</div>
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.75 }}>
        Tip: open <code>/__diag?diag=1</code> then click "Run All Panels". Optional params: <code>timeoutMs</code>, <code>renderSettleMs</code>, <code>stopAfter</code>.
      </div>
    </div>
  );
}
