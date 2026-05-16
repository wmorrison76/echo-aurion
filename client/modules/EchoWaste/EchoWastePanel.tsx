/**
 * iter210 · EchoWaste Panel — Phase 1+2 scaffold.
 *
 * Sidebar-level module at `/panels/echowaste`. Three tabs:
 *   - Capture Hub   · initiate stills/video/voice captures (E2E demo-ready)
 *   - Entries       · paginated entries log with items drill-down
 *   - Daily Digest  · per-day waste roll-up from /api/waste/insights/digest/daily
 *
 * Uses the new iter210 primitives:
 *   - `@/lib/api-url`            · API()
 *   - `@/lib/side-panel`         · <SidePanel /> for the entry review drawer
 *   - `@/lib/echo-window-bus`    · typed echo:event:* dispatch
 */
import React from "react";
import {
  Video,
  Camera,
  Mic,
  Loader2,
  RefreshCw,
  Package,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { API } from "@/lib/api-url";
import SidePanel from "@/lib/side-panel";
import { echoWindowBus } from "@/lib/echo-window-bus";

type Entry = {
  entry_id: string;
  mode: string;
  total_items: number;
  total_cost: number;
  total_weight_g: number;
  status: string;
  created_at: string;
};

type Item = {
  item_id: string;
  name: string;
  count: number;
  portion_g: number;
  cost_per_unit: number;
  total_cost: number;
  confidence: number;
  recipe_id?: string;
  is_unknown?: boolean;
};

type DigestDay = {
  date: string;
  entries: number;
  items: number;
  total_cost: number;
  total_weight_g: number;
  by_mode: Record<string, number>;
};

export default function EchoWastePanel() {
  const [tab, setTab] = React.useState<"capture" | "entries" | "digest" | "parsheet" | "logs" | "fingerprints" | "atelier" | "audit" | "settings" | "benchmark">("capture");

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden" data-testid="echowaste-panel">
      <header className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[3px] text-amber-500 font-bold">ECW · Echo Cognitive Waste Systems</div>
          <h1 className="text-lg font-light">Waste Intelligence · v1.4</h1>
        </div>
        <nav className="flex gap-1 text-sm flex-wrap" data-testid="echowaste-tabs">
          {(["capture", "entries", "parsheet", "digest", "logs", "fingerprints", "atelier", "audit", "settings", "benchmark"] as const).map((t) => (
            <button
              key={t}
              data-testid={`echowaste-tab-${t}`}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                tab === t
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {t === "capture" ? "Capture Hub"
                : t === "entries" ? "Entries"
                : t === "parsheet" ? "Par Sheet"
                : t === "logs" ? "Analysis Logs"
                : t === "fingerprints" ? "🧬 Fingerprints"
                : t === "atelier" ? "🏺 Atelier"
                : t === "audit" ? "🔍 Audit"
                : t === "settings" ? "⚙ Settings"
                : t === "benchmark" ? "📊 Benchmark"
                : "Daily Digest"}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex-1 overflow-auto">
        {tab === "capture" && <CaptureHub />}
        {tab === "entries" && <EntriesLog />}
        {tab === "parsheet" && <ParSheetView />}
        {tab === "digest" && <DigestView />}
        {tab === "logs" && <AnalysisLogsView />}
        {tab === "fingerprints" && <FingerprintLibraryView />}
        {tab === "atelier" && <AtelierView />}
        {tab === "audit" && <AuditQueueView />}
        {tab === "settings" && <CEYSettingsView />}
        {tab === "benchmark" && <BenchmarkView />}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Capture Hub
// ───────────────────────────────────────────────────────────────────────────
function CaptureHub() {
  const [busy, setBusy] = React.useState<string | null>(null);
  const [lastEntry, setLastEntry] = React.useState<Entry | null>(null);

  async function runCapture(mode: "video" | "still" | "voice") {
    setBusy(mode);
    try {
      const init = await fetch(`${API()}/api/waste/capture/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, user_id: "demo-user", outlet_id: "outlet-main" }),
      }).then((r) => r.json());
      const capId = init.capture_id;
      let r;
      if (mode === "voice") {
        r = await fetch(`${API()}/api/waste/capture/voice`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ capture_id: capId, transcript: "ten muffins in the bin, plus bacon" }),
        });
      } else {
        r = await fetch(`${API()}/api/waste/capture/${mode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            capture_id: capId,
            duration_ms: mode === "video" ? 4200 : undefined,
            frame_count: mode === "video" ? 128 : undefined,
            telemetry: { speed: 0.82, focus: 0.91, distance: 0.75, lighting: 0.88 },
          }),
        });
      }
      const j = await r.json();
      if (j?.ok) {
        setLastEntry({
          entry_id: j.entry_id,
          mode,
          total_items: (j.items || []).length,
          total_cost: j.total_cost || 0,
          total_weight_g: j.total_weight_g || 0,
          status: "pending_review",
          created_at: new Date().toISOString(),
        });
        echoWindowBus.emit("waste:capture-complete", { entry_id: j.entry_id, items: (j.items || []).length });
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto" data-testid="capture-hub-root">
      {/* iter220 · Launch on mobile card — QR + URL + copy */}
      <LaunchOnMobileCard />

      <div className="rounded-xl border border-border/30 p-6 bg-gradient-to-br from-amber-500/5 to-purple-500/5">
        <div className="text-xs uppercase tracking-widest text-amber-500 font-bold mb-2">14-day demo flow</div>
        <p className="text-sm text-muted-foreground">
          Pan 10 muffins → logged with count + recipe match + value. The vision
          layer is a deterministic stub during scaffolding so the full chain
          (capture → entry → items → timeline) is exercisable today. Real vision
          (Claude Sonnet 4.5 · Nano Banana) drops in behind the same API.
        </p>
      </div>

      {/* iter220 · 8-tile grid mirroring mobile WasteTab */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="capture-hub-tiles">
        <CaptureCard
          icon={<Video className="h-8 w-8" />}
          label="Video scan"
          hint="Multi-frame MOT"
          testId="echowaste-capture-video"
          busy={busy === "video"}
          onClick={() => void runCapture("video")}
        />
        <CaptureCard
          icon={<Camera className="h-8 w-8" />}
          label="Still photo"
          hint="Single frame · fast"
          testId="echowaste-capture-still"
          busy={busy === "still"}
          onClick={() => void runCapture("still")}
        />
        <CaptureCard
          icon={<Mic className="h-8 w-8" />}
          label="Voice note"
          hint="Hands-free"
          testId="echowaste-capture-voice"
          busy={busy === "voice"}
          onClick={() => void runCapture("voice")}
        />
        <CaptureCard
          icon={<span className="text-2xl">🎬</span>}
          label="Live guided"
          hint="Mobile only · IMU + MP"
          testId="echowaste-capture-live"
          busy={false}
          onClick={() => { /* desktop cannot open live camera; show mobile launch card */
            document.querySelector('[data-testid="launch-on-mobile-card"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          muted
        />
        <CaptureCard
          icon={<span className="text-2xl">🍽️</span>}
          label="Buffet set"
          hint="Before service"
          testId="echowaste-capture-buffet-set"
          busy={false}
          onClick={() => { document.querySelector('[data-testid="launch-on-mobile-card"]')?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
          muted
        />
        <CaptureCard
          icon={<span className="text-2xl">🍴</span>}
          label="Buffet close"
          hint="After service"
          testId="echowaste-capture-buffet-close"
          busy={false}
          onClick={() => { document.querySelector('[data-testid="launch-on-mobile-card"]')?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
          muted
        />
        <CaptureCard
          icon={<span className="text-2xl">🏷️</span>}
          label="Ground truth"
          hint="Labelled sample"
          testId="echowaste-capture-ground-truth"
          busy={false}
          onClick={() => { document.querySelector('[data-testid="launch-on-mobile-card"]')?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
          muted
        />
        <CaptureCard
          icon={<span className="text-2xl">🧑‍🍳</span>}
          label="New dish"
          hint="Draft recipe"
          testId="echowaste-capture-draft-recipe"
          busy={false}
          onClick={() => { document.querySelector('[data-testid="launch-on-mobile-card"]')?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
          muted
        />
      </div>

      {lastEntry && (
        <div
          data-testid="echowaste-last-entry"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold text-sm">Capture logged · {lastEntry.entry_id}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {lastEntry.total_items} items · ${lastEntry.total_cost.toFixed(2)} · {Math.round(lastEntry.total_weight_g)}g · {lastEntry.mode}
              </div>
            </div>
          </div>
          <button
            data-testid="echowaste-review-last"
            onClick={() => echoWindowBus.emit("waste:review-open", { entry_id: lastEntry.entry_id })}
            className="text-xs px-3 py-1.5 rounded-md border border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
          >
            Review →
          </button>
        </div>
      )}

      <ReviewDrawer />
    </div>
  );
}

function CaptureCard({
  icon,
  label,
  hint,
  testId,
  busy,
  onClick,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  testId: string;
  busy: boolean;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      disabled={busy}
      className={`group p-5 rounded-xl border transition-all flex flex-col items-center gap-3 disabled:opacity-60 ${
        muted
          ? "border-border/20 bg-muted/10 hover:border-amber-500/30 hover:bg-amber-500/5"
          : "border-border/30 hover:border-amber-500/40 hover:bg-amber-500/5"
      }`}
    >
      <div className={`h-12 w-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${
        muted ? "bg-slate-500/10 text-slate-400" : "bg-amber-500/10 text-amber-600"
      }`}>
        {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : icon}
      </div>
      <div>
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
        {muted && <div className="text-[9px] text-amber-500/70 uppercase tracking-widest mt-1">Mobile</div>}
      </div>
    </button>
  );
}

// iter220 · Launch on mobile — QR + URL so William can hop from desktop to phone
function LaunchOnMobileCard() {
  const [showFullQr, setShowFullQr] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const mobileUrl = `${base}/m/waste?devAuth=1`;
  // Use a public QR service (no install needed, no API key required)
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(mobileUrl)}&size=220x220&margin=8&bgcolor=0a0e1a&color=f5efe4`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(mobileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  }

  return (
    <div data-testid="launch-on-mobile-card"
      className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-indigo-500/10 p-5 flex flex-col md:flex-row gap-5 items-start">
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-[3px] text-amber-400 font-bold">Launch on mobile</div>
        <h3 className="text-lg mt-1">Live camera capture lives on your phone</h3>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          The <b>Live guided</b> mode (IMU pan-speed + MediaPipe framing) only works on a device with a real camera + motion sensor.
          Scan this QR with your phone — it opens the mobile capture app at <code className="text-amber-400">/m/waste</code> with dev auth pre-unlocked.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code data-testid="launch-on-mobile-url"
            className="text-[11px] px-2 py-1 rounded bg-background/60 border border-border/40 text-amber-300 break-all max-w-full">
            {mobileUrl}
          </code>
          <button data-testid="launch-on-mobile-copy" onClick={copy}
            className="text-[11px] px-3 py-1 rounded border border-amber-500/40 text-amber-300 hover:bg-amber-500/10">
            {copied ? "✓ Copied" : "Copy link"}
          </button>
          <a data-testid="launch-on-mobile-open" href={mobileUrl} target="_blank" rel="noreferrer"
            className="text-[11px] px-3 py-1 rounded border border-border/50 hover:bg-muted/50">
            Open in new tab →
          </a>
          <button data-testid="launch-on-mobile-toggle-qr" onClick={() => setShowFullQr(!showFullQr)}
            className="text-[11px] px-3 py-1 rounded border border-border/50 hover:bg-muted/50">
            {showFullQr ? "Hide QR" : "Enlarge QR"}
          </button>
        </div>
        <div className="mt-3 text-[10px] text-foreground/40 leading-relaxed">
          Tip: Once loaded on your phone, tap <b>Add to Home Screen</b> for a PWA that launches in 1 tap. Also available at <code>/m/staff/&lt;token&gt;</code> (full staff app with Waste tab) after proper auth.
        </div>
      </div>
      <div className={`flex flex-col items-center ${showFullQr ? "md:scale-150" : ""} transition-transform`}
        data-testid="launch-on-mobile-qr-wrap">
        <img data-testid="launch-on-mobile-qr" src={qrSrc} alt="Mobile capture QR code"
          style={{ width: showFullQr ? 260 : 160, height: showFullQr ? 260 : 160, borderRadius: 12 }}
          className="border border-amber-500/40 bg-slate-950" />
        <div className="text-[10px] text-foreground/50 mt-1">Scan with phone camera</div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Review Drawer (listens for waste:review-open)
// ───────────────────────────────────────────────────────────────────────────
function ReviewDrawer() {
  const [entryId, setEntryId] = React.useState<string | null>(null);
  const [entry, setEntry] = React.useState<Entry | null>(null);
  const [items, setItems] = React.useState<Item[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const unsub = echoWindowBus.on("waste:review-open", async ({ entry_id }) => {
      setEntryId(entry_id);
      setLoading(true);
      try {
        const r = await fetch(`${API()}/api/waste/entries/${entry_id}`);
        if (r.ok) {
          const j = await r.json();
          setEntry(j.entry);
          setItems(j.items || []);
        }
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  return (
    <SidePanel
      open={!!entryId}
      onClose={() => setEntryId(null)}
      title={entry ? `Review · ${entry.total_items} items` : "Review"}
      subtitle={entryId || ""}
      testId="echowaste-review-drawer"
    >
      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading entry…
        </div>
      )}

      {entry && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Pill label="Items" value={String(entry.total_items)} />
            <Pill label="Cost" value={`$${Math.round(entry.total_cost).toLocaleString()}`} />
            <Pill label="Weight" value={`${Math.round(entry.total_weight_g)}g`} />
          </div>

          <div className="space-y-2">
            {items.map((it) => (
              <div
                key={it.item_id}
                data-testid={`echowaste-item-${it.item_id}`}
                className="rounded-lg border border-slate-800 bg-slate-900/40 p-3"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-300" />
                    <span className="font-semibold text-sm">{it.name}</span>
                    {it.is_unknown && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        <AlertCircle className="inline h-3 w-3 mr-0.5" /> unknown
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono">
                    {it.count}× {it.portion_g}g · ${it.total_cost.toFixed(2)}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 flex gap-2">
                  <span>confidence {Math.round((it.confidence || 0) * 100)}%</span>
                  {it.recipe_id && <span>· recipe {it.recipe_id}</span>}
                </div>
              </div>
            ))}
            {items.length === 0 && !loading && (
              <div className="text-xs text-slate-600">No items on this entry.</div>
            )}
          </div>
        </div>
      )}
    </SidePanel>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900/40 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">{label}</div>
      <div className="text-xs mt-0.5 font-mono">{value}</div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Entries Log
// ───────────────────────────────────────────────────────────────────────────
function EntriesLog() {
  const [rows, setRows] = React.useState<Entry[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API()}/api/waste/entries?limit=50`);
      if (r.ok) {
        const j = await r.json();
        setRows(j.entries || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto" data-testid="echowaste-entries-list">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Entries</h2>
          <p className="text-xs text-muted-foreground">{rows.length} captured</p>
        </div>
        <button
          data-testid="echowaste-entries-refresh"
          onClick={() => void load()}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-md border border-border/40 hover:bg-accent/20 flex items-center gap-1.5"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          No entries yet — fire a capture from the Capture Hub.
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((e) => (
            <button
              key={e.entry_id}
              data-testid={`echowaste-entry-${e.entry_id}`}
              onClick={() => echoWindowBus.emit("waste:review-open", { entry_id: e.entry_id })}
              className="w-full text-left p-3 rounded-lg border border-border/30 bg-background/40 hover:bg-accent/10 flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{e.mode}</span>
                  <span className="text-sm font-semibold truncate">{e.entry_id}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                  {e.created_at?.slice(0, 19).replace("T", " ")}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-mono">{e.total_items} items · ${e.total_cost.toFixed(2)}</div>
                <div className="text-[10px] text-muted-foreground">{Math.round(e.total_weight_g)}g</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <ReviewDrawer />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Daily Digest
// ───────────────────────────────────────────────────────────────────────────
function DigestView() {
  const [days, setDays] = React.useState<DigestDay[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API()}/api/waste/insights/digest/daily?days=7`);
        if (r.ok) {
          const j = await r.json();
          setDays(j.days || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalCost = days.reduce((s, d) => s + d.total_cost, 0);
  const totalWeight = days.reduce((s, d) => s + d.total_weight_g, 0);

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto" data-testid="echowaste-digest">
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-rose-500/10 p-5 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-600 font-bold">Last 7 days</div>
          <div className="text-3xl font-light mt-1" data-testid="digest-total-cost">
            ${Math.round(totalCost).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {Math.round(totalWeight / 1000)} kg · {days.reduce((s, d) => s + d.entries, 0)} captures
          </div>
        </div>
        <TrendingDown className="h-8 w-8 text-amber-500" />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Building digest…
        </div>
      ) : days.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">No data yet.</div>
      ) : (
        <div className="space-y-1.5">
          {days.map((d) => (
            <div
              key={d.date}
              data-testid={`digest-day-${d.date}`}
              className="p-3 rounded-lg border border-border/30 bg-background/40 flex items-center justify-between"
            >
              <div>
                <div className="text-sm font-semibold">{d.date}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                  {d.entries} captures · {d.items} items · {Math.round(d.total_weight_g)}g
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono">${d.total_cost.toFixed(2)}</div>
                <div className="text-[10px] text-muted-foreground">
                  {Object.entries(d.by_mode || {}).map(([m, c]) => `${m}:${c}`).join(" · ")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// iter214 · Par Sheet view (wireframe 07)
// ───────────────────────────────────────────────────────────────────────────
function ParSheetView() {
  const [rows, setRows] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<{
    total: number; sampled: number; categories: Record<string, number>;
    outlet?: string; service?: string;
  }>({ total: 0, sampled: 0, categories: {} });
  const [outlet, setOutlet] = React.useState("outlet-main");
  const [service, setService] = React.useState("breakfast");
  const [lookback, setLookback] = React.useState(14);
  const [loading, setLoading] = React.useState(false);

  const API = (): string => {
    const env = (import.meta as any).env || {};
    return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || "";
  };

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        outlet_id: outlet, service_name: service, lookback_days: String(lookback),
      });
      const r = await fetch(`${API()}/api/waste/par-sheet?${qs}`).then(r => r.json());
      setRows(r.par_rows || []);
      setSummary({
        total: r.total_par_cost_usd || 0, sampled: r.sessions_sampled || 0,
        categories: r.category_par_cost || {},
        outlet: r.outlet_id, service: r.service_name,
      });
    } finally { setLoading(false); }
  }
  React.useEffect(() => { load(); /* eslint-disable-line */ }, []);

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto" data-testid="echowaste-parsheet">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="text-xs text-foreground/60 uppercase tracking-wider">Outlet</label>
          <input value={outlet} onChange={e => setOutlet(e.target.value)} data-testid="parsheet-outlet"
            className="block mt-1 bg-background border border-amber-500/30 rounded-md px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-foreground/60 uppercase tracking-wider">Service</label>
          <select value={service} onChange={e => setService(e.target.value)} data-testid="parsheet-service"
            className="block mt-1 bg-background border border-amber-500/30 rounded-md px-3 py-1.5 text-sm">
            <option value="breakfast">breakfast</option>
            <option value="brunch">brunch</option>
            <option value="lunch">lunch</option>
            <option value="dinner">dinner</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-foreground/60 uppercase tracking-wider">Look-back (days)</label>
          <input type="number" min={1} max={90} value={lookback}
            onChange={e => setLookback(parseInt(e.target.value) || 14)} data-testid="parsheet-lookback"
            className="block mt-1 bg-background border border-amber-500/30 rounded-md px-3 py-1.5 text-sm w-24" />
        </div>
        <button onClick={load} disabled={loading} data-testid="parsheet-refresh"
          className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-md px-4 py-1.5 text-sm">
          {loading ? "Loading…" : "Recalculate"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3" data-testid="parsheet-kpis">
        <div className="bg-foreground/5 border border-amber-500/20 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-amber-500 font-bold">Recommended par</div>
          <div className="text-3xl font-light text-foreground mt-1">${summary.total.toFixed(2)}</div>
          <div className="text-xs text-foreground/60 mt-1">tomorrow · covers historical avg + 1 SD</div>
        </div>
        <div className="bg-foreground/5 border border-amber-500/20 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-amber-500 font-bold">Sample</div>
          <div className="text-3xl font-light text-foreground mt-1">{summary.sampled}</div>
          <div className="text-xs text-foreground/60 mt-1">closed sessions in window</div>
        </div>
        <div className="bg-foreground/5 border border-amber-500/20 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-amber-500 font-bold">Items</div>
          <div className="text-3xl font-light text-foreground mt-1">{rows.length}</div>
          <div className="text-xs text-foreground/60 mt-1">recipes in par</div>
        </div>
      </div>

      {Object.keys(summary.categories).length > 0 && (
        <div className="bg-foreground/5 border border-amber-500/20 rounded-lg p-4" data-testid="parsheet-category-summary">
          <div className="text-xs uppercase tracking-wider text-amber-500 font-bold mb-3">By category</div>
          <div className="grid grid-cols-6 gap-2">
            {Object.entries(summary.categories).map(([cat, val]: any) => (
              <div key={cat} className="bg-background/70 border border-amber-500/10 rounded-md p-2 text-center">
                <div className="text-xs capitalize text-foreground/60">{cat}</div>
                <div className="font-mono text-sm mt-0.5">${Number(val).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-background/50 border border-amber-500/20 rounded-lg overflow-hidden" data-testid="parsheet-table">
        <table className="w-full text-sm">
          <thead className="bg-foreground/5 text-foreground/60">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wider">Recipe</th>
              <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wider">Category</th>
              <th className="px-3 py-2 text-right font-semibold text-xs uppercase tracking-wider">Avg consumed</th>
              <th className="px-3 py-2 text-right font-semibold text-xs uppercase tracking-wider">±SD</th>
              <th className="px-3 py-2 text-right font-semibold text-xs uppercase tracking-wider">Recommended par</th>
              <th className="px-3 py-2 text-right font-semibold text-xs uppercase tracking-wider">Est. cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr><td colSpan={6} className="text-center p-6 text-foreground/50">
                No closed sessions in window — run some buffet services first.
              </td></tr>
            )}
            {rows.map(r => (
              <tr key={r.recipe_id} data-testid={`parsheet-row-${r.recipe_id}`}
                className="border-t border-amber-500/10 hover:bg-foreground/5">
                <td className="px-3 py-2">
                  <div className="text-foreground font-medium">{r.name}</div>
                  <div className="text-xs text-foreground/50 font-mono">{r.recipe_id}</div>
                </td>
                <td className="px-3 py-2 text-xs capitalize text-foreground/70">{r.category}</td>
                <td className="px-3 py-2 text-right font-mono">{r.avg_consumed}</td>
                <td className="px-3 py-2 text-right font-mono text-foreground/60">±{r.std_dev}</td>
                <td className="px-3 py-2 text-right font-mono text-amber-300 font-bold">{r.recommended_par}</td>
                <td className="px-3 py-2 text-right font-mono">${r.est_par_cost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// iter215 · Analysis Logs view (Claude-readable operator-test trail)
// ───────────────────────────────────────────────────────────────────────────
function AnalysisLogsView() {
  const [summary, setSummary] = React.useState<any>(null);
  const [logs, setLogs] = React.useState<any[]>([]);
  const [filter, setFilter] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [autoRefresh, setAutoRefresh] = React.useState(true);

  const API = (): string => {
    const env = (import.meta as any).env || {};
    return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || "";
  };

  async function load() {
    setLoading(true);
    try {
      const [summaryResp, logsResp] = await Promise.all([
        fetch(`${API()}/api/waste/logs/summary`).then(r => r.json()),
        fetch(`${API()}/api/waste/logs?limit=100${filter ? `&event_type=${filter}` : ""}`).then(r => r.json()),
      ]);
      setSummary(summaryResp.summary);
      setLogs(logsResp.logs || []);
    } finally { setLoading(false); }
  }

  React.useEffect(() => {
    load();
    if (!autoRefresh) return;
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, autoRefresh]);

  async function copyClaudeDigest() {
    if (!summary) return;
    const text = JSON.stringify(summary, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied the summary JSON — paste into Claude and ask:\n\n" +
            "\"Analyse this EchoWaste operator-test summary. Identify the top 3 issues by impact, the slowest calls, and any silent failures. Be specific about log_ids.\"");
    } catch {
      // fallback — prompt
      prompt("Copy this:", text);
    }
  }

  const EVENT_TYPES = [
    "", "vision_llm", "capture_video_mot_start", "capture_video_mot_done",
    "capture_video_mot_no_items", "vision_failed_no_stub",
    "menu_extract_vision", "menu_extract_text", "draft_recipe_extract",
    "whisper_stt", "whisper_error",
  ];

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto" data-testid="echowaste-logs">
      {/* Top bar */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="text-xs text-foreground/60 uppercase tracking-wider">Event type</label>
          <select value={filter} onChange={e => setFilter(e.target.value)} data-testid="logs-filter"
            className="block mt-1 bg-background border border-amber-500/30 rounded-md px-3 py-1.5 text-sm">
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t || "(all)"}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs text-foreground/70 mt-5">
          <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)}
            data-testid="logs-autorefresh" />
          Auto-refresh (12s)
        </label>
        <button onClick={load} disabled={loading} data-testid="logs-refresh"
          className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-md px-4 py-1.5 text-sm">
          {loading ? "Loading…" : "Refresh"}
        </button>
        <button onClick={copyClaudeDigest} disabled={!summary} data-testid="logs-claude-digest"
          className="bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 rounded-md px-4 py-1.5 text-sm">
          🤖 Copy for Claude
        </button>
      </div>

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-4 gap-3" data-testid="logs-kpis">
          <div className="bg-foreground/5 border border-amber-500/20 rounded-lg p-3">
            <div className="text-xs uppercase tracking-wider text-amber-500 font-bold">Total events</div>
            <div className="text-2xl font-light text-foreground mt-1">{summary.total_events}</div>
          </div>
          <div className="bg-foreground/5 border border-amber-500/20 rounded-lg p-3">
            <div className="text-xs uppercase tracking-wider text-amber-500 font-bold">Vision captures</div>
            <div className="text-2xl font-light text-foreground mt-1">{summary.captures?.total || 0}</div>
            <div className="text-xs text-foreground/60 mt-1">
              ✓ {summary.captures?.vision_ok || 0} · ✕ {summary.captures?.vision_failed || 0}
            </div>
          </div>
          <div className="bg-foreground/5 border border-amber-500/20 rounded-lg p-3">
            <div className="text-xs uppercase tracking-wider text-amber-500 font-bold">Errors</div>
            <div className="text-2xl font-light mt-1" style={{ color: (summary.errors?.length || 0) > 0 ? "#fca5a5" : "#86efac" }}>
              {summary.errors?.length || 0}
            </div>
          </div>
          <div className="bg-foreground/5 border border-amber-500/20 rounded-lg p-3">
            <div className="text-xs uppercase tracking-wider text-amber-500 font-bold">p50 / p99 ms</div>
            <div className="text-2xl font-light text-foreground mt-1 font-mono">
              {summary.timing_percentiles_ms?.p50 ?? "—"} / {summary.timing_percentiles_ms?.p99 ?? "—"}
            </div>
          </div>
        </div>
      )}

      {/* Event-type breakdown */}
      {summary?.by_event_type && (
        <div className="bg-foreground/5 border border-amber-500/20 rounded-lg p-4" data-testid="logs-by-event">
          <div className="text-xs uppercase tracking-wider text-amber-500 font-bold mb-2">By event type</div>
          <div className="space-y-1 text-sm">
            {Object.entries(summary.by_event_type).sort((a: any, b: any) => b[1].count - a[1].count).map(([et, info]: any) => (
              <div key={et} className="flex justify-between items-center py-1 border-b border-amber-500/10 last:border-0">
                <span className="font-mono text-foreground/80">{et}</span>
                <span className="flex gap-3 text-xs text-foreground/60">
                  <span>count {info.count}</span>
                  {info.errors > 0 && <span className="text-red-400">errors {info.errors}</span>}
                  {info.avg_ms > 0 && <span>avg {Math.round(info.avg_ms)}ms</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log stream */}
      <div className="bg-background/50 border border-amber-500/20 rounded-lg overflow-hidden" data-testid="logs-stream">
        <table className="w-full text-xs">
          <thead className="bg-foreground/5 text-foreground/60">
            <tr>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider">Time</th>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider">Event</th>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider">Capture</th>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider">Mode</th>
              <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider">ms</th>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider">Summary</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && <tr><td colSpan={6} className="text-center p-6 text-foreground/50">No logs yet — start capturing.</td></tr>}
            {logs.map(l => {
              const llm = l.llm || {};
              const err = !!l.error;
              return (
                <tr key={l.log_id} data-testid={`logs-row-${l.log_id}`}
                  className="border-t border-amber-500/10 hover:bg-foreground/5"
                  style={{ background: err ? "rgba(239,68,68,0.05)" : undefined }}>
                  <td className="px-3 py-2 font-mono text-foreground/60">{(l.timestamp || "").slice(11, 19)}</td>
                  <td className="px-3 py-2">
                    <span className="font-mono font-semibold" style={{ color: err ? "#fca5a5" : "#c8a97e" }}>{l.event_type}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-foreground/50">{(l.capture_id || "").slice(0, 16)}</td>
                  <td className="px-3 py-2 text-xs">{llm.mode || "—"}</td>
                  <td className="px-3 py-2 text-right font-mono text-foreground/70">{llm.duration_ms || ""}</td>
                  <td className="px-3 py-2 text-foreground/80 max-w-md">
                    {err ? <span className="text-red-400">⚠ {l.error.message?.slice(0, 100)}</span>
                        : <span>{llm.response_raw_preview ? llm.response_raw_preview.slice(0, 90) + "…" : JSON.stringify(l.outputs || {}).slice(0, 90)}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// iter216 · Fingerprint Library view (Progressive Analysis Stage-1 KPIs)
// ───────────────────────────────────────────────────────────────────────────
function FingerprintLibraryView() {
  const [stats, setStats] = React.useState<any>(null);
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [propertyId, setPropertyId] = React.useState<string>("outlet-main");

  async function load() {
    setLoading(true); setErr(null);
    try {
      const s = await fetch(`${API()}/api/waste/fingerprints/stats?property_id=${encodeURIComponent(propertyId)}`)
        .then(r => r.json());
      setStats(s);
      const l = await fetch(`${API()}/api/waste/logs?event_type=fingerprint_shadow_contribute&limit=20`).then(r => r.json());
      setRows(l?.logs || []);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally { setLoading(false); }
  }

  React.useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [propertyId]);

  const hitPct = Math.round((stats?.recent_hit_rate || 0) * 100);

  return (
    <div className="p-5 space-y-4" data-testid="fingerprint-library-root">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-500 font-bold">Library</div>
          <div className="text-sm text-foreground/60">Fingerprint-first recognition · Stage-1 of progressive analysis</div>
        </div>
        <div className="flex gap-2 items-center">
          <input
            data-testid="fingerprint-property-id"
            value={propertyId}
            onChange={e => setPropertyId(e.target.value)}
            className="text-xs px-2 py-1 rounded bg-background border border-border/40"
          />
          <button
            data-testid="fingerprint-refresh"
            onClick={() => void load()}
            className="text-xs px-3 py-1 rounded border border-border/50 hover:bg-muted/50"
          >
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {err && <div className="text-sm text-rose-400" data-testid="fingerprint-err">{err}</div>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="fingerprint-kpis">
        <Kpi label="Local" value={stats?.local_count ?? 0} testId="kpi-local" tone="amber" />
        <Kpi label="Pending → Collective" value={stats?.pending_collective ?? 0} testId="kpi-pending" tone="indigo" />
        <Kpi label="Collective (validated)" value={stats?.collective_validated ?? 0} testId="kpi-collective" tone="emerald" />
        <Kpi label="Total rows" value={stats?.total ?? 0} testId="kpi-total" tone="slate" />
        <Kpi label="Hit rate (last 200)" value={`${hitPct}%`} testId="kpi-hitrate" tone={hitPct > 40 ? "emerald" : hitPct > 10 ? "amber" : "rose"} />
      </div>

      <div className="border border-border/40 rounded-md overflow-hidden" data-testid="fingerprint-recent">
        <div className="px-3 py-2 text-xs uppercase tracking-widest text-foreground/60 bg-muted/20 border-b border-border/40">
          Recent shadow contributions
        </div>
        {rows.length === 0 ? (
          <div className="p-4 text-xs text-foreground/50">No shadow contributions yet — capture a few waste entries and they&apos;ll appear here.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-muted/10">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-foreground/60">Timestamp</th>
                <th className="text-left px-3 py-2 font-medium text-foreground/60">Capture</th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60">Touched</th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60">Items</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.log_id} className="border-t border-border/30" data-testid={`fp-contrib-${r.log_id}`}>
                  <td className="px-3 py-1.5 font-mono text-foreground/60">{(r.timestamp || "").slice(11, 19)}</td>
                  <td className="px-3 py-1.5 font-mono text-foreground/70">{r.capture_id}</td>
                  <td className="px-3 py-1.5 text-right">{r.outputs?.touched ?? 0}</td>
                  <td className="px-3 py-1.5 text-right text-foreground/50">{r.outputs?.item_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="text-[11px] text-foreground/50 leading-relaxed pt-2" data-testid="fingerprint-explain">
        Shadow mode: every high-confidence Sonnet identification (≥0.85) auto-contributes or confirms a local fingerprint.
        Once <b>≥3 independent properties</b> confirm the same fingerprint it graduates to the validated collective library.
        A library hit on similarity ≥0.94 short-circuits Sonnet entirely (≈$0.02 saved per capture).
      </div>
    </div>
  );
}

function Kpi({ label, value, testId, tone }: { label: string; value: React.ReactNode; testId: string; tone: string }) {
  const toneMap: Record<string, string> = {
    amber: "text-amber-400 border-amber-500/30 bg-amber-500/5",
    indigo: "text-indigo-400 border-indigo-500/30 bg-indigo-500/5",
    emerald: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
    slate: "text-slate-300 border-slate-500/30 bg-slate-500/5",
    rose: "text-rose-400 border-rose-500/30 bg-rose-500/5",
  };
  return (
    <div data-testid={testId} className={`p-3 rounded-md border ${toneMap[tone] || toneMap.slate}`}>
      <div className="text-[10px] uppercase tracking-widest opacity-70">{label}</div>
      <div className="text-2xl font-light mt-1">{value}</div>
    </div>
  );
}


// ───────────────────────────────────────────────────────────────────────────
// iter217 · Atelier view (v1.4 recognition program — dignified, no XP/streaks)
// ───────────────────────────────────────────────────────────────────────────
function AtelierView() {
  const [stats, setStats] = React.useState<any>(null);
  const [recent, setRecent] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [propertyId, setPropertyId] = React.useState<string>("outlet-main");

  async function load() {
    setLoading(true); setErr(null);
    try {
      const s = await fetch(`${API()}/api/waste/photo-intake/atelier/stats?property_id=${encodeURIComponent(propertyId)}`).then(r => r.json());
      setStats(s);
      const l = await fetch(`${API()}/api/waste/photo-intake?property_id=${encodeURIComponent(propertyId)}&limit=10`).then(r => r.json());
      setRecent(l?.rows || []);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally { setLoading(false); }
  }

  React.useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [propertyId]);

  return (
    <div className="p-5 space-y-4" data-testid="atelier-root">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-500 font-bold">The Atelier</div>
          <div className="text-sm text-foreground/60">Recognition program · every photo improves CEY</div>
        </div>
        <div className="flex gap-2 items-center">
          <input data-testid="atelier-property-id" value={propertyId}
            onChange={e => setPropertyId(e.target.value)}
            className="text-xs px-2 py-1 rounded bg-background border border-border/40" />
          <button data-testid="atelier-refresh" onClick={() => void load()}
            className="text-xs px-3 py-1 rounded border border-border/50 hover:bg-muted/50">
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {err && <div className="text-sm text-rose-400" data-testid="atelier-err">{err}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="atelier-counts">
        <Kpi label="Photos contributed" value={stats?.total_intakes ?? 0} testId="atelier-total" tone="amber" />
        <Kpi label="Library fingerprints" value={stats?.local_fingerprint_count ?? 0} testId="atelier-local-fps" tone="indigo" />
        <Kpi label="Hit rate" value={`${Math.round((stats?.hit_rate || 0) * 100)}%`} testId="atelier-hit-rate" tone="emerald" />
        <Kpi label="Collective validated" value={stats?.collective_contributions ?? 0} testId="atelier-collective" tone="slate" />
      </div>

      <div className="border border-border/40 rounded-md overflow-hidden" data-testid="atelier-milestones">
        <div className="px-3 py-2 text-xs uppercase tracking-widest text-foreground/60 bg-muted/20 border-b border-border/40">
          Milestones
        </div>
        <div className="p-3 space-y-2">
          {(stats?.milestones || []).map((m: any) => {
            const pct = Math.min(100, Math.round(((m.current || 0) / (m.target || 1)) * 100));
            return (
              <div key={m.key} data-testid={`milestone-${m.key}`} className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 ${m.achieved ? "bg-emerald-500 border-emerald-500" : "border-slate-500"}`} />
                <div className="flex-1">
                  <div className="text-sm">{m.label}</div>
                  <div className="h-1.5 bg-slate-700/40 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="text-xs font-mono text-foreground/60 w-20 text-right">{m.current || 0} / {m.target}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border border-border/40 rounded-md overflow-hidden" data-testid="atelier-recent-intakes">
        <div className="px-3 py-2 text-xs uppercase tracking-widest text-foreground/60 bg-muted/20 border-b border-border/40 flex items-center justify-between">
          <span>Recent photo intakes</span>
          <span className="normal-case tracking-normal text-[10px] text-foreground/40">photos stay property-local by default</span>
        </div>
        {recent.length === 0 ? (
          <div className="p-4 text-xs text-foreground/50">No intakes yet for this property.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-muted/10">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-foreground/60">Timestamp</th>
                <th className="text-left px-3 py-2 font-medium text-foreground/60">Source</th>
                <th className="text-left px-3 py-2 font-medium text-foreground/60">Suggestion</th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60">Quality</th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60">Latency</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r: any) => (
                <tr key={r.id} className="border-t border-border/30" data-testid={`intake-row-${r.id}`}>
                  <td className="px-3 py-1.5 font-mono text-foreground/60">{(r.created_at || "").slice(11, 19)}</td>
                  <td className="px-3 py-1.5 text-foreground/70">{r.source_module}</td>
                  <td className="px-3 py-1.5">
                    {r.suggested_recipe ? (
                      <span className="text-emerald-400">{r.suggested_recipe.recipe_name} <span className="text-foreground/40">({r.suggestion_source})</span></span>
                    ) : <span className="text-foreground/40">—</span>}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">{r.quality_score}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-foreground/50">{r.duration_ms}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="text-[11px] text-foreground/50 leading-relaxed pt-1" data-testid="atelier-explain">
        Photos flow through one pipeline: quality gate → face blur → consent check → label OCR → fingerprint extract.
        Faces are always blurred before any downstream processing. Photos stay property-local unless you explicitly opt in to collective sharing.
        No XP, no streaks, no leaderboards — just a record of your contribution to the shared craft.
      </div>
    </div>
  );
}

// ═══════════════════════ iter218 · AUDIT QUEUE view ═══════════════════════
function AuditQueueView() {
  const [rows, setRows] = React.useState<any[]>([]);
  const [banner, setBanner] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [propertyId, setPropertyId] = React.useState<string>("outlet-main");
  const [resolving, setResolving] = React.useState<string | null>(null);
  const [recipeInput, setRecipeInput] = React.useState<Record<string, string>>({});
  const [nameInput, setNameInput] = React.useState<Record<string, string>>({});

  async function load() {
    setLoading(true); setErr(null);
    try {
      const [b, l] = await Promise.all([
        fetch(`${API()}/api/waste/audit-queue/stats/banner?property_id=${encodeURIComponent(propertyId)}`).then(r => r.json()),
        fetch(`${API()}/api/waste/audit-queue/pending?property_id=${encodeURIComponent(propertyId)}&limit=50`).then(r => r.json()),
      ]);
      setBanner(b);
      setRows(l?.rows || []);
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setLoading(false); }
  }
  React.useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [propertyId]);

  async function resolve(id: string, method: string) {
    setResolving(id);
    try {
      const body: any = { resolution_method: method };
      if (method === "recipe_pick" || method === "text") {
        body.resolved_recipe_id = recipeInput[id] || undefined;
        body.resolved_item_name = nameInput[id] || undefined;
      }
      const r = await fetch(`${API()}/api/waste/audit-queue/${id}/resolve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(r => r.json());
      if (!r.ok) throw new Error("resolve failed");
      await load();
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setResolving(null); }
  }

  return (
    <div className="p-5 space-y-4" data-testid="audit-queue-root">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-500 font-bold">Audit Queue</div>
          <div className="text-sm text-foreground/60">24-hour self-healing · batch review unidentified items</div>
        </div>
        <div className="flex gap-2 items-center">
          <input data-testid="audit-property-id" value={propertyId}
            onChange={e => setPropertyId(e.target.value)}
            className="text-xs px-2 py-1 rounded bg-background border border-border/40" />
          <button data-testid="audit-refresh" onClick={() => void load()}
            className="text-xs px-3 py-1 rounded border border-border/50 hover:bg-muted/50">
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>
      </div>
      {err && <div className="text-sm text-rose-400" data-testid="audit-err">{err}</div>}

      {banner?.show_banner && (
        <div data-testid="audit-banner" className="p-3 rounded-md border border-amber-500/40 bg-amber-500/5 flex items-center justify-between">
          <div className="text-sm text-amber-300">⚠ {banner.total_pending} unidentified items need your review.</div>
          <div className="text-[11px] text-foreground/50">Threshold: ≥{banner.threshold} items · Banner hour from CEY settings</div>
        </div>
      )}
      {!banner?.show_banner && (
        <div data-testid="audit-no-banner" className="text-xs text-foreground/50">
          {banner?.total_pending ?? 0} pending · banner hidden until ≥{banner?.threshold ?? 5} accumulate
        </div>
      )}

      <div className="border border-border/40 rounded-md overflow-hidden" data-testid="audit-rows">
        {rows.length === 0 ? (
          <div className="p-4 text-xs text-foreground/50">No pending audit items — nice work.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-muted/10">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-foreground/60">When</th>
                <th className="text-left px-3 py-2 font-medium text-foreground/60">Best guess</th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60">Conf</th>
                <th className="text-left px-3 py-2 font-medium text-foreground/60">Recipe</th>
                <th className="text-left px-3 py-2 font-medium text-foreground/60">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} data-testid={`audit-row-${r.id}`} className="border-t border-border/30">
                  <td className="px-3 py-2 font-mono text-foreground/60">{(r.created_at || "").slice(11, 19)}</td>
                  <td className="px-3 py-2">{r.sonnet_best_guess || <span className="text-foreground/40">—</span>}</td>
                  <td className="px-3 py-2 text-right font-mono">{Math.round((r.sonnet_confidence || 0) * 100)}%</td>
                  <td className="px-3 py-2">
                    <input data-testid={`audit-recipe-input-${r.id}`} placeholder="recipe-id"
                      value={recipeInput[r.id] || ""}
                      onChange={e => setRecipeInput({ ...recipeInput, [r.id]: e.target.value })}
                      className="text-xs px-1.5 py-0.5 rounded bg-background border border-border/40 w-28" />
                    <input data-testid={`audit-name-input-${r.id}`} placeholder="name (opt)"
                      value={nameInput[r.id] || ""}
                      onChange={e => setNameInput({ ...nameInput, [r.id]: e.target.value })}
                      className="text-xs px-1.5 py-0.5 rounded bg-background border border-border/40 w-24 ml-1" />
                  </td>
                  <td className="px-3 py-2 flex gap-1">
                    <button data-testid={`audit-resolve-${r.id}`} disabled={resolving === r.id || !(recipeInput[r.id])}
                      onClick={() => resolve(r.id, "recipe_pick")}
                      className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 disabled:opacity-40">
                      {resolving === r.id ? "…" : "✓ Label"}
                    </button>
                    <button data-testid={`audit-skip-${r.id}`} onClick={() => resolve(r.id, "skip")}
                      className="text-[10px] px-2 py-0.5 rounded border border-border/50 text-foreground/60">Skip</button>
                    <button data-testid={`audit-notfood-${r.id}`} onClick={() => resolve(r.id, "not_food")}
                      className="text-[10px] px-2 py-0.5 rounded border border-rose-500/40 text-rose-300">Not food</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="text-[11px] text-foreground/50 leading-relaxed">
        Every resolved label creates a new fingerprint — the next morning&apos;s captures benefit. Items that sit pending more than 7 days auto-expire.
      </div>
    </div>
  );
}

// ═══════════════════════ iter218 · CEY SETTINGS view ══════════════════════
function CEYSettingsView() {
  const [s, setS] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [propertyId, setPropertyId] = React.useState<string>("outlet-main");
  const [err, setErr] = React.useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`${API()}/api/waste/cey-settings?property_id=${encodeURIComponent(propertyId)}`).then(r => r.json());
      setS(r?.settings || null);
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setLoading(false); }
  }
  React.useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [propertyId]);

  async function save(patch: any) {
    setSaving(true); setErr(null);
    try {
      const r = await fetch(`${API()}/api/waste/cey-settings?property_id=${encodeURIComponent(propertyId)}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).then(r => r.json());
      setS(r?.settings || null);
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setSaving(false); }
  }

  if (!s) return <div className="p-5 text-xs text-foreground/50">{loading ? "Loading settings…" : "No settings available."}</div>;

  return (
    <div className="p-5 space-y-5 max-w-3xl" data-testid="cey-settings-root">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-500 font-bold">CEY Settings</div>
          <div className="text-sm text-foreground/60">Property-level consent &amp; feature toggles</div>
        </div>
        <div className="flex gap-2 items-center">
          <input data-testid="cey-property-id" value={propertyId}
            onChange={e => setPropertyId(e.target.value)}
            className="text-xs px-2 py-1 rounded bg-background border border-border/40" />
          {saving && <span className="text-xs text-amber-400">Saving…</span>}
        </div>
      </div>
      {err && <div className="text-sm text-rose-400" data-testid="cey-err">{err}</div>}

      <div className="border border-border/40 rounded-md overflow-hidden" data-testid="cey-photo-policy">
        <div className="px-3 py-2 text-xs uppercase tracking-widest text-foreground/60 bg-muted/20 border-b border-border/40">
          Photo contribution policy
        </div>
        <div className="p-3 space-y-2">
          {[
            { val: "full", label: "Full · contribute locally + to collective library (after ≥3 property confirmations)", desc: "Best for teams who want EchoYield network benefits." },
            { val: "local_only", label: "Local only · library stays property-scoped", desc: "Photos never leave your property. Default per v1.4 non-negotiable #3." },
            { val: "off", label: "Off · no fingerprint extraction", desc: "Photos stored for audit only; no library writes." },
          ].map(opt => (
            <label key={opt.val} data-testid={`cey-policy-${opt.val}`} className="flex gap-3 items-start cursor-pointer">
              <input type="radio" name="photo_policy" className="mt-1"
                checked={s.photo_contribution_policy === opt.val}
                onChange={() => save({ photo_contribution_policy: opt.val })} />
              <div>
                <div className="text-sm">{opt.label}</div>
                <div className="text-[11px] text-foreground/50">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="border border-border/40 rounded-md overflow-hidden" data-testid="cey-toggles">
        <div className="px-3 py-2 text-xs uppercase tracking-widest text-foreground/60 bg-muted/20 border-b border-border/40">
          Feature toggles
        </div>
        <div className="p-3 space-y-3">
          {[
            { k: "audit_queue_enabled", label: "Audit queue enabled" },
            { k: "forbes_label_ocr_enabled", label: "Forbes label OCR enabled" },
            { k: "menu_ocr_enabled", label: "Menu OCR enabled" },
            { k: "atelier_enabled_property_wide", label: "Atelier recognition visible" },
          ].map(({ k, label }) => (
            <div key={k} data-testid={`cey-toggle-${k}`} className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <button onClick={() => save({ [k]: !s[k] })}
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                  s[k] ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" :
                          "bg-slate-500/20 text-slate-300 border border-slate-500/40"
                }`}>{s[k] ? "ON" : "OFF"}</button>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-border/40 rounded-md overflow-hidden" data-testid="cey-timing">
        <div className="px-3 py-2 text-xs uppercase tracking-widest text-foreground/60 bg-muted/20 border-b border-border/40">
          Timing &amp; retention
        </div>
        <div className="p-3 space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <label className="w-48 text-foreground/70">Audit banner hour (local)</label>
            <input type="number" min={0} max={23} value={s.audit_queue_banner_hour ?? 8}
              data-testid="cey-banner-hour"
              onChange={e => save({ audit_queue_banner_hour: parseInt(e.target.value || "8", 10) })}
              className="w-20 px-2 py-1 rounded bg-background border border-border/40" />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-48 text-foreground/70">Minimum items to show banner</label>
            <input type="number" min={1} max={50} value={s.audit_min_items_threshold ?? 5}
              data-testid="cey-min-threshold"
              onChange={e => save({ audit_min_items_threshold: parseInt(e.target.value || "5", 10) })}
              className="w-20 px-2 py-1 rounded bg-background border border-border/40" />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-48 text-foreground/70">Audit queue expiry (days)</label>
            <input type="number" min={1} max={90} value={s.audit_queue_expiry_days ?? 7}
              data-testid="cey-expiry-days"
              onChange={e => save({ audit_queue_expiry_days: parseInt(e.target.value || "7", 10) })}
              className="w-20 px-2 py-1 rounded bg-background border border-border/40" />
          </div>
        </div>
      </div>

      <div className="text-[11px] text-foreground/50 leading-relaxed" data-testid="cey-explain">
        Changes auditable. Last updated: <span className="font-mono">{s.updated_at || "never"}</span>.
        Faces are <b>always</b> blurred before any downstream processing — this is not a toggle.
      </div>
    </div>
  );
}

// ═══════════════════════ iter221 · BENCHMARK HARNESS view ══════════════════
function BenchmarkView() {
  const [status, setStatus] = React.useState<any>(null);
  const [samples, setSamples] = React.useState<any[]>([]);
  const [runs, setRuns] = React.useState<any[]>([]);
  const [selectedRun, setSelectedRun] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [label, setLabel] = React.useState("");
  const [recipeId, setRecipeId] = React.useState("");
  const [expectedCount, setExpectedCount] = React.useState(1);
  const [expectedGrams, setExpectedGrams] = React.useState(100);
  const [expectedCategory, setExpectedCategory] = React.useState("pastry");
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const [st, sm, rn] = await Promise.all([
        fetch(`${API()}/api/waste/benchmark/status`).then(r => r.json()),
        fetch(`${API()}/api/waste/benchmark/samples?limit=200`).then(r => r.json()),
        fetch(`${API()}/api/waste/benchmark/runs?limit=20`).then(r => r.json()),
      ]);
      setStatus(st); setSamples(sm?.rows || []); setRuns(rn?.rows || []);
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setLoading(false); }
  }
  React.useEffect(() => { void load(); }, []);

  async function handleUpload(file: File) {
    if (!label.trim()) { setErr("Enter a label first"); return; }
    setUploading(true); setErr(null);
    try {
      const b64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1] || "");
        r.onerror = rej; r.readAsDataURL(file);
      });
      const r = await fetch(`${API()}/api/waste/benchmark/samples`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_base64: b64, label, expected_recipe_id: recipeId || null,
          expected_count: Number(expectedCount), expected_portion_g: Number(expectedGrams),
          expected_category: expectedCategory,
        }),
      }).then(r => r.json());
      if (!r.ok) throw new Error(JSON.stringify(r));
      await load();
      setLabel(""); setRecipeId("");
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }

  async function runBench(sampleIds?: string[], videoMode: boolean = false) {
    setRunning(true); setErr(null);
    try {
      const r = await fetch(`${API()}/api/waste/benchmark/run`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sample_ids: sampleIds || null,
          note: (videoMode ? "video-mode · " : "") + (sampleIds ? "subset" : "full run"),
          video_mode: videoMode,
          video_frames: videoMode ? 6 : undefined,
        }),
      }).then(r => r.json());
      if (!r.ok) throw new Error(JSON.stringify(r));
      // iter222 · Async: returns run_id immediately, then we poll for status="complete"
      const rid = r.run_id || r.run?.id;
      if (!rid) throw new Error("no run_id in response");
      // Poll every 2.5s up to 4 minutes (video mode = 6× slower)
      const maxAttempts = videoMode ? 240 : 100;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(res => setTimeout(res, 2500));
        const doc = await fetch(`${API()}/api/waste/benchmark/runs/${rid}`).then(r => r.json());
        if (!doc.ok) continue;
        setSelectedRun(doc.run);
        await load();
        if (doc.run?.status === "complete") break;
      }
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setRunning(false); }
  }

  async function deleteSample(id: string) {
    await fetch(`${API()}/api/waste/benchmark/samples/${id}`, { method: "DELETE" });
    await load();
  }

  const bestOverall = status?.best_overall ?? 0;
  const bestPct = Math.round(bestOverall * 100);
  const bestColor = bestOverall >= 0.98 ? "emerald" : bestOverall >= 0.90 ? "amber" : bestOverall >= 0.80 ? "indigo" : "rose";

  return (
    <div className="p-5 space-y-5" data-testid="benchmark-root">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-500 font-bold">Recognition Benchmark</div>
          <div className="text-sm text-foreground/60">Goal: 98%+ on counts · A+ grade · then unlock video</div>
        </div>
        <div className="flex gap-2 items-center">
          <button data-testid="bench-refresh" onClick={() => void load()}
            className="text-xs px-3 py-1 rounded border border-border/50 hover:bg-muted/50">
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
          <button data-testid="bench-run-all" disabled={running || samples.length === 0}
            onClick={() => void runBench()}
            className="text-xs px-3 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 disabled:opacity-40">
            {running ? "Running…" : `▶ Run all (${samples.length})`}
          </button>
          <button data-testid="bench-run-all-video" disabled={running || samples.length === 0}
            onClick={() => void runBench(undefined, true)}
            title="Video mode replays each still through 6 frames via MOT best-of-N — validates multi-frame aggregation against the image pass. ~6× slower."
            className="text-xs px-3 py-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 disabled:opacity-40">
            🎥 Video mode
          </button>
        </div>
      </div>
      {err && <div className="text-sm text-rose-400" data-testid="bench-err">{err}</div>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="bench-kpis">
        <Kpi testId="bench-samples" label="Samples" value={status?.sample_count ?? 0} tone="slate" />
        <Kpi testId="bench-runs" label="Runs" value={status?.runs_captured ?? 0} tone="slate" />
        <Kpi testId="bench-best" label="Best accuracy" value={`${bestPct}%`} tone={bestColor} />
        <Kpi testId="bench-grade" label="Best grade" value={status?.best_grade ?? "F"} tone={bestColor} />
        <Kpi testId="bench-target" label="Target" value="98%" tone="emerald" />
      </div>

      <div className="border border-border/40 rounded-md overflow-hidden" data-testid="bench-upload-card">
        <div className="px-3 py-2 text-xs uppercase tracking-widest text-foreground/60 bg-muted/20 border-b border-border/40">
          Teach ECW a new sample
        </div>
        <div className="p-3 grid grid-cols-1 md:grid-cols-6 gap-2 text-xs">
          <input data-testid="bench-label" placeholder="Label (e.g. Blueberry Muffin)"
            value={label} onChange={e => setLabel(e.target.value)}
            className="md:col-span-2 px-2 py-1.5 rounded bg-background border border-border/40" />
          <input data-testid="bench-recipe-id" placeholder="recipe_id (optional)"
            value={recipeId} onChange={e => setRecipeId(e.target.value)}
            className="md:col-span-2 px-2 py-1.5 rounded bg-background border border-border/40" />
          <input data-testid="bench-count" type="number" min={1} placeholder="count"
            value={expectedCount} onChange={e => setExpectedCount(parseFloat(e.target.value) || 1)}
            className="px-2 py-1.5 rounded bg-background border border-border/40" />
          <input data-testid="bench-grams" type="number" min={1} placeholder="portion g"
            value={expectedGrams} onChange={e => setExpectedGrams(parseFloat(e.target.value) || 100)}
            className="px-2 py-1.5 rounded bg-background border border-border/40" />
          <select data-testid="bench-category" value={expectedCategory}
            onChange={e => setExpectedCategory(e.target.value)}
            className="md:col-span-2 px-2 py-1.5 rounded bg-background border border-border/40">
            {["protein","pastry","produce","beverages","dairy","sundries"].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label data-testid="bench-upload-btn" className={`md:col-span-4 px-3 py-1.5 rounded text-center cursor-pointer ${
            uploading || !label ? "bg-muted/20 text-foreground/40" : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
          }`}>
            {uploading ? "Uploading…" : "📎 Upload image + ground truth"}
            <input ref={fileInputRef} type="file" accept="image/*"
              disabled={uploading || !label}
              onChange={e => { const f = e.target.files?.[0]; if (f) void handleUpload(f); }}
              style={{ display: "none" }} />
          </label>
        </div>
        <div className="px-3 pb-3 text-[10px] text-foreground/50 leading-relaxed">
          Tip: upload 20-50 diverse samples covering pastries, proteins, produce, chafers. Keep <b>expected_count</b> accurate (discrete items → real count; bulk → 1 with portion_g = total visible weight).
        </div>
      </div>

      <div className="border border-border/40 rounded-md overflow-hidden" data-testid="bench-samples-list">
        <div className="px-3 py-2 text-xs uppercase tracking-widest text-foreground/60 bg-muted/20 border-b border-border/40 flex justify-between">
          <span>Samples ({samples.length})</span>
        </div>
        {samples.length === 0 ? (
          <div className="p-4 text-xs text-foreground/50">No samples yet — upload your first image above.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-muted/10">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-foreground/60">Label</th>
                <th className="text-left px-3 py-2 font-medium text-foreground/60">Recipe ID</th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60">Count</th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60">Grams</th>
                <th className="text-left px-3 py-2 font-medium text-foreground/60">Category</th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60"></th>
              </tr>
            </thead>
            <tbody>
              {samples.map((s: any) => (
                <tr key={s.id} className="border-t border-border/30" data-testid={`bench-sample-${s.id}`}>
                  <td className="px-3 py-1.5">
                    <div>{s.label}</div>
                    {(s.complexity || (s.expected_items && s.expected_items.length > 0)) && (
                      <div className="text-[9px] uppercase tracking-widest text-amber-500/80 mt-0.5">
                        {s.complexity || `mixed-${s.expected_items.length}`}
                        {s.expected_items && s.expected_items.length > 0 && (
                          <span className="ml-2 text-foreground/50 normal-case tracking-normal">
                            {s.expected_items.map((it: any) => it.label).join(" · ")}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-foreground/60">{s.expected_recipe_id || (s.expected_items ? `${s.expected_items.length} items` : "—")}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{s.expected_count}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{s.expected_portion_g}</td>
                  <td className="px-3 py-1.5 text-foreground/60">{s.expected_category || "—"}</td>
                  <td className="px-3 py-1.5 text-right">
                    <button data-testid={`bench-run-${s.id}`}
                      onClick={() => void runBench([s.id])}
                      className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 mr-1">Run</button>
                    <button data-testid={`bench-delete-${s.id}`}
                      onClick={() => void deleteSample(s.id)}
                      className="text-[10px] px-2 py-0.5 rounded border border-rose-500/40 text-rose-300">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border border-border/40 rounded-md overflow-hidden" data-testid="bench-runs-list">
        <div className="px-3 py-2 text-xs uppercase tracking-widest text-foreground/60 bg-muted/20 border-b border-border/40">
          Recent runs
        </div>
        {runs.length === 0 ? (
          <div className="p-4 text-xs text-foreground/50">No runs yet. Hit ▶ Run all to score.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-muted/10">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-foreground/60">When</th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60">Samples</th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60">Overall</th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60">Item</th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60">Count</th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60">Portion</th>
                <th className="text-center px-3 py-2 font-medium text-foreground/60">Grade</th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60">Latency</th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60"></th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r: any) => {
                const col = r.overall_accuracy >= 0.98 ? "text-emerald-400" :
                           r.overall_accuracy >= 0.90 ? "text-amber-400" :
                           r.overall_accuracy >= 0.80 ? "text-indigo-400" : "text-rose-400";
                return (
                  <tr key={r.id} className="border-t border-border/30" data-testid={`bench-run-row-${r.id}`}>
                    <td className="px-3 py-1.5 font-mono text-foreground/60">{(r.created_at || "").slice(11, 19)}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{r.scored_count}/{r.sample_count}</td>
                    <td className={`px-3 py-1.5 text-right font-mono ${col}`}>{Math.round(r.overall_accuracy * 100)}%</td>
                    <td className="px-3 py-1.5 text-right font-mono text-foreground/60">{Math.round(r.item_match_avg * 100)}%</td>
                    <td className="px-3 py-1.5 text-right font-mono text-foreground/60">{Math.round(r.count_accuracy_avg * 100)}%</td>
                    <td className="px-3 py-1.5 text-right font-mono text-foreground/60">{Math.round(r.portion_accuracy_avg * 100)}%</td>
                    <td className={`px-3 py-1.5 text-center font-bold ${col}`}>{r.grade}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-foreground/50">{r.avg_latency_ms}ms</td>
                    <td className="px-3 py-1.5 text-right">
                      <button data-testid={`bench-view-${r.id}`}
                        onClick={async () => { const j = await fetch(`${API()}/api/waste/benchmark/runs/${r.id}`).then(rr => rr.json()); setSelectedRun(j?.run); }}
                        className="text-[10px] px-2 py-0.5 rounded border border-border/50">View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selectedRun && (
        <div className="border border-amber-500/40 rounded-md overflow-hidden" data-testid="bench-run-detail">
          <div className="px-3 py-2 text-xs uppercase tracking-widest text-amber-300 bg-amber-500/5 border-b border-amber-500/40 flex items-center justify-between gap-3">
            <span>Run {selectedRun.id} · {selectedRun.grade} · {Math.round(selectedRun.overall_accuracy * 100)}%
              {selectedRun.mode === "video" && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[9px] normal-case tracking-normal">🎥 VIDEO · {selectedRun.video_frames}f</span>}
              {selectedRun.f1_avg != null && selectedRun.f1_avg > 0 && <span className="ml-2 text-foreground/60 normal-case tracking-normal">F1 {Math.round(selectedRun.f1_avg * 100)}% · cost {Math.round((selectedRun.cost_accuracy_avg || 0) * 100)}%</span>}
            </span>
            <div className="flex items-center gap-2">
              <button data-testid="bench-trust-all-matched"
                title="Auto-calibrate ground truth from every prediction where the item was correctly identified (item_match ≥ 85%). Also writes fingerprints for instant future recognition."
                onClick={async () => {
                  if (!confirm("Trust all matched predictions and write fingerprints? This updates ground truth for any sample where the model correctly identified the item.")) return;
                  const r = await fetch(`${API()}/api/waste/benchmark/runs/${selectedRun.id}/trust-all-matched`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ min_item_match: 0.85, also_write_fingerprints: true }),
                  });
                  const j = await r.json();
                  alert(`Calibrated ${j.updates} samples · wrote ${j.fingerprints_written} fingerprints.\nRun again for higher accuracy.`);
                  await load(); setSelectedRun(null);
                }}
                className="text-[10px] px-2 py-0.5 rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 normal-case tracking-normal">
                ✓ Trust all matched
              </button>
              <button onClick={() => setSelectedRun(null)} className="text-foreground/50 text-xs">✕</button>
            </div>
          </div>
          {/* Complexity breakdown */}
          {selectedRun.by_complexity && Object.keys(selectedRun.by_complexity).length > 0 && (
            <div className="px-3 py-2 bg-muted/10 border-b border-border/40 flex flex-wrap gap-2 text-[10px]" data-testid="bench-complexity-breakdown">
              {Object.entries(selectedRun.by_complexity as Record<string, any>).map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border/50">
                  <span className="uppercase tracking-widest text-foreground/50">{k}</span>
                  <span className="font-mono text-foreground/80">{v.n}×</span>
                  <span className="font-mono font-bold">{Math.round(v.overall * 100)}%</span>
                  <span className="text-amber-400">{v.grade}</span>
                </span>
              ))}
            </div>
          )}
          <table className="w-full text-xs">
            <thead className="bg-muted/10">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-foreground/60">Label</th>
                <th className="text-left px-3 py-2 font-medium text-foreground/60">Top prediction / matches</th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60">Count</th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60">Portion</th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60">Item</th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60">Overall</th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60">Calibrate</th>
              </tr>
            </thead>
            <tbody>
              {(selectedRun.per_sample || []).map((p: any, i: number) => (
                <tr key={p.sample_id || i} className="border-t border-border/30 align-top" data-testid={`bench-row-${p.sample_id || i}`}>
                  <td className="px-3 py-1.5">
                    <div>{p.label}</div>
                    {p.complexity && <div className="text-[9px] uppercase tracking-widest text-amber-500/80 mt-0.5">{p.complexity}</div>}
                  </td>
                  <td className="px-3 py-1.5 text-foreground/60">
                    {p.multi_item ? (
                      <div className="space-y-1">
                        <div className="text-[10px] text-foreground/60">
                          matched {p.matched}/{p.expected_count_total} · FP {p.false_positives} · FN {p.false_negatives}
                          {p.expected_total_cost != null && <> · ${p.expected_total_cost}<span className="text-foreground/40"> exp</span> / ${p.predicted_total_cost}<span className="text-foreground/40"> pred</span></>}
                        </div>
                        {(p.per_item || []).slice(0, 6).map((pi: any, ii: number) => (
                          <div key={ii} className="text-[10px] flex gap-2 font-mono">
                            <span className={pi.item_match >= 0.85 ? "text-emerald-400" : "text-amber-400"}>{Math.round(pi.item_match * 100)}%</span>
                            <span className="text-foreground/80">{pi.expected?.label}</span>
                            <span className="text-foreground/40">→</span>
                            <span className="text-foreground/70">{pi.predicted?.name} (c={pi.predicted?.count}, g={pi.predicted?.portion_g})</span>
                          </div>
                        ))}
                        {(p.missing_items || []).length > 0 && (
                          <div className="text-[10px] text-rose-400 font-mono">missing: {p.missing_items.map((m: any) => m.label).join(", ")}</div>
                        )}
                        {(p.extra_items || []).length > 0 && (
                          <div className="text-[10px] text-sky-400 font-mono">extras: {p.extra_items.map((x: any) => x.name).join(", ")}</div>
                        )}
                      </div>
                    ) : (
                      p.top_prediction ? `${p.top_prediction.name} (c=${p.top_prediction.count}, g=${p.top_prediction.portion_g})` : (p.reason || p.error)
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">{p.count_accuracy != null ? Math.round(p.count_accuracy * 100) + "%" : "—"}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{p.portion_accuracy != null ? Math.round(p.portion_accuracy * 100) + "%" : "—"}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{p.item_match != null ? Math.round(p.item_match * 100) + "%" : "—"}</td>
                  <td className="px-3 py-1.5 text-right font-mono font-bold">{p.overall != null ? Math.round(p.overall * 100) + "%" : "—"}</td>
                  <td className="px-3 py-1.5 text-right">
                    {p.multi_item ? (
                      <button data-testid={`bench-trust-fp-${p.sample_id}`}
                        title="Write fingerprints for this multi-item sample (skips Sonnet on future matches)"
                        onClick={async () => {
                          const r = await fetch(`${API()}/api/waste/benchmark/samples/${p.sample_id}`, {
                            method: "PATCH", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ trust_fingerprint: true }),
                          });
                          const j = await r.json();
                          alert(`Wrote ${j.fingerprints_written} fingerprints for this sample`);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded border border-sky-500/40 text-sky-300 hover:bg-sky-500/10">
                        ⚡ Fingerprint
                      </button>
                    ) : (p.top_prediction && p.sample_id && (
                      <button data-testid={`bench-trust-${p.sample_id}`}
                        title="Use model prediction as new ground truth for this sample"
                        onClick={async () => {
                          const top = p.top_prediction;
                          await fetch(`${API()}/api/waste/benchmark/samples/${p.sample_id}`, {
                            method: "PATCH", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              label: top.name, expected_count: top.count,
                              expected_portion_g: top.portion_g,
                              expected_recipe_id: top.recipe_id || null,
                              trust_fingerprint: true,
                            }),
                          });
                          await load();
                        }}
                        className="text-[10px] px-2 py-0.5 rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10">
                        ✓ Trust
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-[11px] text-foreground/50 leading-relaxed" data-testid="bench-explain">
        <b>Single-item:</b> 50% item match · 35% count · 15% portion. <b>Multi-item:</b> 30% F1 · 20% item match · 20% count · 15% portion · 15% cost.
        Grade: <b>A+</b> ≥98% · <b>A</b> ≥90% · <b>B</b> ≥80% · <b>C</b> ≥70% · <b>D</b> ≥60%.
        ✓ Trust writes a fingerprint so next capture of the same dish skips Sonnet entirely.
      </div>
    </div>
  );
}

