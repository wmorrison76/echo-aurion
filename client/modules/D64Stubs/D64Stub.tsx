/**
 * Shared D64 ComingSoon stub — wires a panel-registered module to live backend
 * endpoints with §1.1 "missing-data state as first-class fact" framing.
 *
 * Each endpoint row is clickable. Click → inline drawer fires the live call
 * against the same-origin /api/* proxy and surfaces HTTP status + duration +
 * formatted JSON response body. This turns the placeholder into a live
 * transparency exhibit: investors and operators can see the substrate is real,
 * tap it, and inspect the response shape immediately.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import "./D64Stub.css";

export interface D64StubProps {
  title: string;
  eyebrow: string;
  endpoints: string[];
  doctrineNote?: string;
  groupHint?: string;
}

const DEMO_PROPERTY = "pier-sixty-six-demo";
const DEMO_OUTLET = "p66demo-galley";

// Replace common path templates with the seeded demo identifiers.
function resolveTemplate(ep: string): { url: string; ok: boolean; missing: string[] } {
  const missing: string[] = [];
  const replaced = ep.replace(/\{([^}]+)\}/g, (_, key) => {
    const k = key.toLowerCase();
    if (k === "property_id" || k === "property" || k === "id") return DEMO_PROPERTY;
    if (k === "outlet_id" || k === "outlet") return DEMO_OUTLET;
    if (k === "run_id") return "demo-run";
    missing.push(key);
    return `{${key}}`;
  });
  return { url: replaced, ok: missing.length === 0, missing };
}

interface FetchState {
  status: "idle" | "loading" | "ok" | "err";
  httpStatus?: number;
  durationMs?: number;
  body?: string;
  error?: string;
}

function EndpointRow({ ep }: { ep: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FetchState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const tmpl = resolveTemplate(ep);

  const fire = useCallback(async () => {
    if (!tmpl.ok) {
      setState({
        status: "err",
        error: `unresolved path templates: ${tmpl.missing.join(", ")} (cannot fire safely)`,
      });
      return;
    }
    setState({ status: "loading" });
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const t0 = performance.now();
    try {
      const r = await fetch(tmpl.url, { signal: ctrl.signal });
      const t1 = performance.now();
      const text = await r.text();
      let body = text;
      try {
        body = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // not JSON — leave the raw body
      }
      setState({
        status: r.ok ? "ok" : "err",
        httpStatus: r.status,
        durationMs: Math.round(t1 - t0),
        body,
      });
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setState({ status: "err", error: String(e?.message || e) });
    } finally {
      abortRef.current = null;
    }
  }, [tmpl.url, tmpl.ok, tmpl.missing]);

  // Abort in-flight request when the drawer collapses.
  useEffect(() => {
    if (!open && abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, [open]);

  const onToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && state.status === "idle") void fire();
  };

  return (
    <li className={`d64-stub-row ${open ? "open" : ""}`}>
      <button
        type="button"
        className="d64-stub-row-trigger"
        data-testid={`d64-stub-row-${ep.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="d64-stub-method">GET</span>
        <code className="d64-stub-path">{ep}</code>
        <span className="d64-stub-state">
          {state.status === "idle" && "live · returning data"}
          {state.status === "loading" && "fetching…"}
          {state.status === "ok" && (
            <span className="d64-stub-state-ok">
              HTTP {state.httpStatus} · {state.durationMs}ms
            </span>
          )}
          {state.status === "err" && (
            <span className="d64-stub-state-err">
              {state.httpStatus ? `HTTP ${state.httpStatus}` : "error"}
            </span>
          )}
        </span>
        <span className="d64-stub-chevron">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="d64-stub-drawer">
          <div className="d64-stub-drawer-meta">
            <span>resolved · </span>
            <code>{tmpl.url}</code>
            {state.status !== "loading" && (
              <button
                type="button"
                className="d64-stub-refire"
                onClick={(e) => {
                  e.stopPropagation();
                  void fire();
                }}
                title="re-fire the request"
                data-testid="d64-stub-refire"
              >
                ↻ re-fire
              </button>
            )}
          </div>
          {state.status === "loading" && <div className="d64-stub-drawer-loading">querying…</div>}
          {state.status === "err" && (
            <div className="d64-stub-drawer-err">{state.error || `request failed (HTTP ${state.httpStatus})`}</div>
          )}
          {state.body && <pre className="d64-stub-body">{state.body.slice(0, 4000)}{state.body.length > 4000 ? "\n… (truncated)" : ""}</pre>}
        </div>
      )}
    </li>
  );
}

export default function D64Stub({ title, eyebrow, endpoints, doctrineNote, groupHint }: D64StubProps) {
  return (
    <div className="d64-stub-root" data-testid="d64-stub-root">
      <div className="d64-stub-header">
        <div className="d64-stub-eyebrow">{eyebrow}</div>
        <div className="d64-stub-title">{title}</div>
        {groupHint && <div className="d64-stub-group">part of · {groupHint}</div>}
      </div>

      <div className="d64-stub-callout">
        <div className="d64-stub-callout-title">§1.1 · This module's UI is under construction.</div>
        <p>
          The substrate is live — the endpoints listed below are returning real data from{" "}
          <code>{DEMO_PROPERTY}</code> right now. The frontend rendering layer is the work
          that remains. Per doctrine §1.1, this missing-data state surfaces here as a first-class
          fact — not a 404, not a generic placeholder. Click any row to fire the live call.
        </p>
        {doctrineNote && <p className="d64-stub-doctrine">{doctrineNote}</p>}
      </div>

      <div className="d64-stub-panel">
        <div className="d64-stub-panel-head">
          <div className="d64-stub-panel-title">Live Backend Endpoints</div>
          <div className="d64-stub-tag">click to fire · {endpoints.length} routes</div>
        </div>
        <ul className="d64-stub-endpoints">
          {endpoints.map((ep, i) => (
            <EndpointRow key={i} ep={ep} />
          ))}
        </ul>
      </div>

      <div className="d64-stub-foot">
        §1.1 · transparency · data quality and missing-data states surface as first-class facts
      </div>
    </div>
  );
}
