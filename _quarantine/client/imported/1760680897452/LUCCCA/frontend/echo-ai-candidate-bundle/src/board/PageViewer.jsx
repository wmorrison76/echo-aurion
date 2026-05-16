// frontend/src/components/PageViewer.jsx
import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";

/**
 * We use Vite's import.meta.glob to enumerate source-like files.
 * Text-ish files are loaded as raw when previewing.
 * If you click "Try Mount", we attempt a dynamic import (non-raw) and render default export
 * inside an ErrorBoundary so the app doesn’t blow up.
 */
const RAW_FILES = import.meta.glob(
  [
    "../**/*.{js,jsx,ts,tsx,css,scss,md,markdown,txt,json}",
    "./**/*.{js,jsx,ts,tsx,css,scss,md,markdown,txt,json}",
  ],
  { as: "raw", eager: false }
);

// For mount attempts (component render)
const MODULE_FILES = import.meta.glob(
  [
    "../**/*.{js,jsx,ts,tsx}",
    "./**/*.{js,jsx,ts,tsx}",
  ],
  { eager: false }
);

function humanBytes(n) {
  if (n == null) return "—";
  const units = ["B","KB","MB","GB"];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

class SafeBoundary extends React.Component {
  constructor(p){ super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err){ return { err }; }
  componentDidCatch(err, info){ /* noop */ }
  render(){
    if (this.state.err) {
      return (
        <div style={{
          padding:12, borderRadius:10,
          border:"1px solid rgba(239,68,68,.35)",
          background:"rgba(239,68,68,.10)", color:"#fecaca"
        }}>
          <div style={{fontWeight:800, marginBottom:6}}>Component Error</div>
          <div style={{whiteSpace:"pre-wrap", fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>
            {String(this.state.err?.stack || this.state.err || "Unknown error")}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PageViewer() {
  const [files] = useState(() => Object.keys({ ...RAW_FILES })); // list once
  const [sizes, setSizes] = useState({}); // path -> size in bytes (computed on demand)
  const [scanBusy, setScanBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const [minBytes, setMinBytes] = useState(0);
  const [selected, setSelected] = useState("");
  const [raw, setRaw] = useState("");
  const [mountResult, setMountResult] = useState({ status: "idle", msg: "" });

  // Build filtered dropdown options
  const options = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return files
      .filter(p => (q ? p.toLowerCase().includes(q) : true))
      .filter(p => {
        if (!minBytes) return true;
        const sz = sizes[p];
        if (sz == null) return true; // not scanned yet—keep visible
        return sz >= minBytes;
      })
      .sort();
  }, [files, filter, sizes, minBytes]);

  const loadRaw = async (path) => {
    setMountResult({ status: "idle", msg: "" });
    setRaw("");
    try {
      const loader = RAW_FILES[path];
      if (!loader) { setRaw("// Not a raw-loadable file."); return; }
      const txt = await loader();
      setRaw(txt);
      // compute size
      const size = new Blob([txt]).size;
      setSizes(s => ({ ...s, [path]: size }));
    } catch (e) {
      setRaw(String(e));
    }
  };

  const scanAllSizes = async () => {
    if (scanBusy) return;
    setScanBusy(true);
    try {
      // Stream through files and compute sizes in batches
      const entries = Object.entries(RAW_FILES);
      const out = {};
      // batch to avoid event loop starvation
      for (let i = 0; i < entries.length; i++) {
        const [path, loader] = entries[i];
        try {
          const txt = await loader();
          out[path] = new Blob([txt]).size;
        } catch {
          out[path] = null; // can't load raw (maybe TS config or not text) -> leave as null
        }
        if (i % 15 === 0) await new Promise(r => setTimeout(r, 0));
      }
      setSizes(out);
    } finally {
      setScanBusy(false);
    }
  };

  const tryMount = async () => {
    if (!selected) return;
    setMountResult({ status: "loading", msg: "" });
    try {
      const modLoader = MODULE_FILES[selected];
      if (!modLoader) {
        setMountResult({ status: "error", msg: "No module loader available for this path (not JS/TS component?)." });
        return;
      }
      const mod = await modLoader();
      if (!mod || (!mod.default && typeof mod !== "function")) {
        setMountResult({ status: "error", msg: "No default export found to render." });
        return;
      }
      setMountResult({ status: "ready", msg: "" });
    } catch (e) {
      setMountResult({ status: "error", msg: String(e?.stack || e) });
    }
  };

  // Load raw when selection changes
  useEffect(() => { if (selected) loadRaw(selected); }, [selected]);

  return (
    <div className="p-3 space-y-3 text-[13px] leading-[1.25]">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter (e.g. /components/ or .jsx)"
          className="px-2 py-1 rounded-md border border-white/10 bg-white/5 text-white/90 w-[280px]"
        />
        <input
          type="number"
          value={minBytes}
          onChange={e => setMinBytes(Math.max(0, Number(e.target.value || 0)))}
          className="px-2 py-1 rounded-md border border-white/10 bg-white/5 text-white/90 w-[130px]"
          placeholder="Min bytes"
          title="Only show files with size ≥ this value (after scan)."
        />
        <button
          onClick={scanAllSizes}
          disabled={scanBusy}
          className={`px-2 py-1 rounded-md border ${scanBusy ? "opacity-60" : ""}`}
          style={{ borderColor:"rgba(22,224,255,.28)", background:"rgba(22,224,255,.08)", color:"#d7f6ff" }}
          title="Compute sizes for all text-ish files"
        >
          {scanBusy ? "Scanning…" : "Scan sizes"}
        </button>

        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          className="ml-auto px-2 py-1 rounded-md border border-white/10 bg-white/5 text-white/90 w-[520px] max-w-full"
        >
          <option value="">— Select a file —</option>
          {options.map(p => (
            <option key={p} value={p}>
              {p} {sizes[p] != null ? ` (${humanBytes(sizes[p])})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => selected && loadRaw(selected)}
          disabled={!selected}
          className="px-2 py-1 rounded-md border"
          style={{ borderColor:"rgba(22,224,255,.28)", background:"rgba(22,224,255,.08)", color:"#d7f6ff" }}
        >
          Reload as Text
        </button>
        <button
          onClick={tryMount}
          disabled={!selected}
          className="px-2 py-1 rounded-md border"
          style={{ borderColor:"rgba(22,224,255,.28)", background:"rgba(22,224,255,.08)", color:"#d7f6ff" }}
          title="Attempt to import and render default export inside an error boundary"
        >
          Try Mount (Component)
        </button>

        <div className="ml-auto opacity-75">
          {selected ? <>Selected size: <b>{humanBytes(sizes[selected])}</b></> : "No file selected"}
        </div>
      </div>

      {/* Preview / Mount */}
      <div className="grid md:grid-cols-2 gap-3">
        {/* Raw preview */}
        <section className="relative">
          <h3 className="mb-1 font-bold text-cyan-100/90">Text Preview</h3>
          <div
            className="rounded-md border overflow-auto"
            style={{
              borderColor:"rgba(22,224,255,.22)",
              background:"rgba(2,6,23,.65)",
              maxHeight: "60vh"
            }}
          >
            <pre
              style={{
                margin:0, padding:"10px 12px",
                fontSize:12, lineHeight:1.45,
                color:"#d7f6ff",
                whiteSpace:"pre",
              }}
            >
              {raw || (selected ? "Loading..." : "Select a file to preview")}
            </pre>
          </div>
        </section>

        {/* Mount preview */}
        <section className="relative">
          <h3 className="mb-1 font-bold text-cyan-100/90">Mount Preview (Safe)</h3>

          {mountResult.status === "idle" && (
            <div className="opacity-70">Click “Try Mount” to attempt rendering default export (if it’s a React component).</div>
          )}
          {mountResult.status === "loading" && (
            <div className="opacity-90">Importing module…</div>
          )}
          {mountResult.status === "error" && (
            <div
              className="rounded-md border"
              style={{
                borderColor:"rgba(239,68,68,.35)",
                background:"rgba(239,68,68,.10)",
                color:"#fecaca", padding:10
              }}
            >
              <div style={{fontWeight:800, marginBottom:6}}>Import/Render Error</div>
              <div style={{ whiteSpace:"pre-wrap", fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {mountResult.msg}
              </div>
            </div>
          )}
          {mountResult.status === "ready" && selected && (
            <SafeMount path={selected} />
          )}
        </section>
      </div>
    </div>
  );
}

function SafeMount({ path }) {
  // IMPORTANT: we must use the same glob map to import the module
  const [Comp, setComp] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const maps = import.meta.glob(
          [
            "../**/*.{js,jsx,ts,tsx}",
            "./**/*.{js,jsx,ts,tsx}",
          ],
          { eager: false }
        );
        const loader = maps[path];
        if (!loader) { throw new Error("No loader for this path"); }
        const mod = await loader();
        const C = mod?.default || mod;
        if (alive) setComp(() => C);
      } catch (e) {
        if (alive) setErr(String(e?.stack || e));
      }
    })();
    return () => { alive = false; };
  }, [path]);

  if (err) {
    return (
      <div
        className="rounded-md border"
        style={{
          borderColor:"rgba(239,68,68,.35)",
          background:"rgba(239,68,68,.10)",
          color:"#fecaca", padding:10
        }}
      >
        <div style={{fontWeight:800, marginBottom:6}}>Dynamic Import Error</div>
        <div style={{ whiteSpace:"pre-wrap", fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace" }}>
          {err}
        </div>
      </div>
    );
  }

  if (!Comp) return <div className="opacity-80">Preparing…</div>;

  // Render with safety net
  return (
    <div
      className="rounded-md border p-2"
      style={{
        borderColor:"rgba(22,224,255,.22)",
        background:"rgba(2,6,23,.65)",
        minHeight: 120
      }}
    >
      <SafeBoundary>
        <Suspense fallback={<div className="opacity-80">Loading component…</div>}>
          <Comp />
        </Suspense>
      </SafeBoundary>
    </div>
  );
}
