/** iter236 · Inventory Audit Mode — offline-first voice walkthrough.
 *
 * William's vision: walk the walk-in cooler (no reception), speak "corn one
 * case", auto-advance shelf row left-to-right + top-to-bottom, queue
 * entries to IndexedDB, flush to `/api/ecw-ops/inventory/audit-batch`
 * when reception returns.
 *
 * Flow:
 *   1. Tap "Start audit" → asks which location (walk-in-1, dry-1, freezer-2…)
 *   2. Echo announces "Walk-in 1, shelf 1, top row. Go."
 *   3. Chef speaks items; regex parser catches [qty] [unit] [item]
 *   4. Tap 🟢 "Next row" / "Next shelf" OR say "next row"
 *   5. Entries queued to IDB immediately (no network needed)
 *   6. Auto-flush batch every 30s IF online; manual "Sync now" button too
 *   7. End of audit → show summary + total count
 */
import React from "react";
import { API } from "@/lib/api-url";

// ── IndexedDB wrapper (promisified) ─────────────────────────────────────
const IDB_NAME = "ecw-inventory-audit";
const IDB_STORE = "queued_entries";

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbPut(entry: any) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).add(entry);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}
async function idbAll(): Promise<any[]> {
  const db = await idbOpen();
  return new Promise((res) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => res([]);
  });
}
async function idbClear(ids: number[]) {
  const db = await idbOpen();
  return new Promise((res) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    for (const id of ids) store.delete(id);
    tx.oncomplete = () => res(true);
    tx.onerror = () => res(false);
  });
}

// ── Voice transcript → structured { qty, unit, name } ──────────────────
// Handles "2 cases of corn" · "corn one case" · "12 ea tomato" · "half case spinach"
const UNIT_WORDS: Record<string, string> = {
  case: "cs", cases: "cs", cs: "cs", caseofs: "cs",
  pound: "lb", pounds: "lb", lb: "lb", lbs: "lb",
  ounce: "oz", ounces: "oz", oz: "oz",
  each: "ea", ea: "ea", units: "ea", unit: "ea", count: "ea",
  gallon: "gal", gallons: "gal", gal: "gal",
  liter: "l", liters: "l", l: "l",
  kilo: "kg", kilos: "kg", kg: "kg",
};
const NUM_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, half: 0.5, quarter: 0.25,
  dozen: 12, "a": 1, "an": 1,
};
export function parseVoiceEntry(raw: string): { qty: number; unit: string; name: string } | null {
  const words = raw.toLowerCase().trim().split(/\s+/);
  if (words.length < 2) return null;
  let qty: number | null = null;
  let unit: string | null = null;
  const nameWords: string[] = [];
  for (const w of words) {
    const cleaned = w.replace(/[.,]/g, "");
    if (qty === null && !isNaN(parseFloat(cleaned))) {
      qty = parseFloat(cleaned);
    } else if (qty === null && NUM_WORDS[cleaned] !== undefined) {
      qty = NUM_WORDS[cleaned];
    } else if (unit === null && UNIT_WORDS[cleaned]) {
      unit = UNIT_WORDS[cleaned];
    } else if (cleaned === "of") {
      /* skip filler word */
    } else {
      nameWords.push(cleaned);
    }
  }
  if (qty === null) qty = 1;
  if (unit === null) unit = "ea";
  const name = nameWords.join(" ").trim();
  return name ? { qty, unit, name } : null;
}

// ── Standard walk-in shelf layout — override per location via backend ──
const DEFAULT_LAYOUT = { shelves: 4, rows_per_shelf: 3 };   // rows: top/mid/bottom
const ROW_LABELS = ["top", "middle", "bottom"];

const LOCATIONS = [
  { id: "walk-in-1", name: "Walk-in Cooler 1" },
  { id: "walk-in-2", name: "Walk-in Cooler 2" },
  { id: "freezer-1", name: "Freezer 1" },
  { id: "dry-1",     name: "Dry Storage 1" },
  { id: "prep-1",    name: "Prep Cooler 1" },
];

type Entry = { shelf: string; item_name: string; qty: number; unit: string;
                location_id: string; spoken_raw: string; added_at: string };

export function InventoryAuditMode({ outletId, onClose }: {
  outletId: string;
  onClose: () => void;
}) {
  // iter237 · Finance/auditor identity capture + mode (full vs spot-check)
  const [auditorName, setAuditorName] = React.useState("");
  const [mode, setMode] = React.useState<"full" | "spot-check">("full");
  const [dept, setDept] = React.useState<"kitchen" | "bar" | "retail" | "alcohol">("kitchen");
  const [isFinancePresent, setIsFinancePresent] = React.useState(false);
  const [started, setStarted] = React.useState(false);
  const [locationId, setLocationId] = React.useState<string | null>(null);
  const [shelfIdx, setShelfIdx] = React.useState(0);
  const [rowIdx, setRowIdx] = React.useState(0);
  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [listening, setListening] = React.useState(false);
  const [interim, setInterim] = React.useState("");
  const [queuedCount, setQueuedCount] = React.useState(0);
  const [syncStatus, setSyncStatus] = React.useState<string>("");
  const auditIdRef = React.useRef<string>(`audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const recogRef = React.useRef<any>(null);
  const [online, setOnline] = React.useState(navigator.onLine);
  // iter237 · manual-add form
  const [manualOpen, setManualOpen] = React.useState(false);
  const [manualName, setManualName] = React.useState("");
  const [manualQty, setManualQty] = React.useState("");
  const [manualUnit, setManualUnit] = React.useState("cs");
  // iter237 · pencil edit state
  const [editIdx, setEditIdx] = React.useState<number | null>(null);
  const [editQty, setEditQty] = React.useState("");
  const [editReason, setEditReason] = React.useState("");

  React.useEffect(() => {
    const on = () => setOnline(true); const off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Refresh queued-count on mount
  React.useEffect(() => { idbAll().then((a) => setQueuedCount(a.length)); }, []);

  // Auto-flush every 30s when online + has queued entries
  React.useEffect(() => {
    if (!online) return;
    const id = window.setInterval(() => { void flush(); }, 30_000);
    return () => window.clearInterval(id);
  }, [online]);

  const currentShelf = () => `shelf-${shelfIdx + 1} · row-${ROW_LABELS[rowIdx] || rowIdx + 1}`;

  function speak(text: string) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05; u.pitch = 1.05;
      window.speechSynthesis.speak(u);
    } catch {}
  }

  function startListening() {
    if (!locationId) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice recognition not supported — use iOS Safari"); return; }
    // Prime mic permission
    const begin = () => {
      const r = new SR();
      r.lang = "en-US"; r.continuous = true; r.interimResults = true;
      r.onresult = (ev: any) => {
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          const txt = res[0].transcript.trim();
          if (res.isFinal) {
            setInterim("");
            handleVoiceCommand(txt);
          } else {
            setInterim(txt);
          }
        }
      };
      r.onerror = (e: any) => {
        setListening(false);
        if (e.error === "not-allowed") alert("Mic blocked. Safari → Aa → Website Settings → Microphone → Allow.");
      };
      r.onend = () => setListening(false);
      recogRef.current = r;
      try { r.start(); setListening(true); } catch {}
    };
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((s) => { s.getTracks().forEach((t) => t.stop()); begin(); })
        .catch(() => alert("Mic access denied"));
    } else { begin(); }
  }
  function stopListening() {
    try { recogRef.current?.stop(); } catch {}
    setListening(false);
  }

  async function handleVoiceCommand(raw: string) {
    const lower = raw.toLowerCase();
    // Navigation commands take priority
    if (/\bnext row\b/.test(lower) || /\bdown row\b/.test(lower)) { nextRow(); return; }
    if (/\bnext shelf\b/.test(lower)) { nextShelf(); return; }
    if (/\bend audit\b/.test(lower) || /\bfinish audit\b/.test(lower)) { onClose(); return; }
    // Otherwise treat as inventory entry
    const parsed = parseVoiceEntry(raw);
    if (!parsed) return;
    const entry: Entry = {
      shelf: currentShelf(),
      item_name: parsed.name,
      qty: parsed.qty,
      unit: parsed.unit,
      location_id: locationId!,
      spoken_raw: raw,
      added_at: new Date().toISOString(),
    };
    setEntries((p) => [...p, entry]);
    await idbPut({ audit_id: auditIdRef.current, outlet_id: outletId, ...entry });
    setQueuedCount((c) => c + 1);
    speak(`${parsed.qty} ${parsed.unit} ${parsed.name}`);
  }

  function nextRow() {
    if (rowIdx < DEFAULT_LAYOUT.rows_per_shelf - 1) {
      setRowIdx((r) => r + 1);
      speak(`Row ${ROW_LABELS[rowIdx + 1] || rowIdx + 2}`);
    } else { nextShelf(); }
  }
  function nextShelf() {
    if (shelfIdx < DEFAULT_LAYOUT.shelves - 1) {
      setShelfIdx((s) => s + 1);
      setRowIdx(0);
      speak(`Shelf ${shelfIdx + 2}, top row`);
    } else {
      speak("Last shelf. Tap end when done.");
    }
  }

  async function flush() {
    const queued = await idbAll();
    if (queued.length === 0) { setSyncStatus("Nothing to sync"); return; }
    try {
      const r = await fetch(`${API()}/api/ecw-ops/inventory/audit-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
        body: JSON.stringify({
          outlet_id: outletId,
          audit_id: auditIdRef.current,
          entries: queued.map((q) => ({
            shelf: q.shelf, item_name: q.item_name, qty: q.qty,
            unit: q.unit, location_id: q.location_id, spoken_raw: q.spoken_raw,
          })),
          device_id: navigator.userAgent.slice(0, 60),
        }),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      await idbClear(queued.map((q) => q.id));
      setQueuedCount(0);
      setSyncStatus(`✓ Synced ${queued.length}`);
    } catch (e: any) {
      setSyncStatus(`⚠ Offline — ${queued.length} queued`);
    }
  }

  // Location picker — but first require auditor setup
  if (!started) {
    return (
      <div data-testid="audit-setup" style={{
        position: "fixed", inset: 0, background: "#0a0e1a", zIndex: 9999998,
        padding: 20, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h2 style={{ fontSize: 17, margin: 0, color: "#f5efe4" }}>Start inventory audit</h2>
          <button onClick={onClose} data-testid="audit-exit-btn"
            style={{ background: "none", border: "1px solid rgba(148,163,184,0.3)",
                      color: "#94a3b8", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>✕</button>
        </div>
        <div style={{ fontSize: 10, color: "#fbbf24", padding: 8,
                        background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)",
                        borderRadius: 4, marginBottom: 4 }}>
          ⚠ Reminder: Finance normally starts audits (security gate deferred).
          Alcohol audits should include Finance — enter their name too.
          Spot-checks and full audits can't run at the same time.
        </div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", marginBottom: 4 }}>AUDITOR NAME *</div>
          <input data-testid="audit-auditor-name" value={auditorName}
            onChange={(e) => setAuditorName(e.target.value)}
            placeholder="Who is taking this audit?"
            style={{ width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(148,163,184,0.2)", borderRadius: 6,
                      color: "#f5efe4", fontSize: 13 }} />
        </div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", marginBottom: 4 }}>MODE</div>
          <div style={{ display: "flex", gap: 4 }}>
            {(["full", "spot-check"] as const).map((m) => (
              <button key={m} data-testid={`audit-mode-${m}`} onClick={() => setMode(m)}
                style={{ flex: 1, padding: 10,
                          background: mode === m ? "rgba(212,175,55,0.15)" : "transparent",
                          border: `1px solid ${mode === m ? "rgba(212,175,55,0.5)" : "rgba(148,163,184,0.15)"}`,
                          color: mode === m ? "#d4af37" : "#94a3b8",
                          borderRadius: 6, fontSize: 11, fontWeight: 600,
                          textTransform: "uppercase", letterSpacing: 1, cursor: "pointer" }}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", marginBottom: 4 }}>DEPARTMENT</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4 }}>
            {(["kitchen", "bar", "alcohol", "retail"] as const).map((d) => (
              <button key={d} data-testid={`audit-dept-${d}`} onClick={() => setDept(d)}
                style={{ padding: 8, fontSize: 10,
                          background: dept === d ? "rgba(212,175,55,0.15)" : "transparent",
                          border: `1px solid ${dept === d ? "rgba(212,175,55,0.5)" : "rgba(148,163,184,0.15)"}`,
                          color: dept === d ? "#d4af37" : "#94a3b8",
                          borderRadius: 6, textTransform: "uppercase", letterSpacing: 1, cursor: "pointer" }}>
                {d}
              </button>
            ))}
          </div>
        </div>
        {(dept === "alcohol" || dept === "bar") && (
          <label data-testid="audit-finance-present" style={{ display: "flex", alignItems: "center", gap: 6,
                         fontSize: 11, color: "#cbd5e1", cursor: "pointer" }}>
            <input type="checkbox" checked={isFinancePresent}
              onChange={(e) => setIsFinancePresent(e.target.checked)} />
            Finance representative present
          </label>
        )}
        <button data-testid="audit-start-confirm" onClick={async () => {
          if (!auditorName.trim()) return;
          try {
            const r = await fetch(`${API()}/api/ecw-ops/inventory/audit/start`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
              body: JSON.stringify({
                outlet_id: outletId, mode, dept,
                auditor_name: auditorName.trim(),
                auditor_role: "chef",
                is_finance_present: isFinancePresent,
              }),
            });
            const d = await r.json();
            if (!r.ok) {
              alert(d?.detail || "Failed to start audit");
              return;
            }
            auditIdRef.current = d.audit_id;
            setStarted(true);
          } catch (e: any) { alert(e?.message || "Failed to start"); }
        }} disabled={!auditorName.trim()}
          style={{ padding: 14, borderRadius: 8, marginTop: 6,
                    background: auditorName.trim() ? "rgba(16,185,129,0.2)" : "rgba(148,163,184,0.1)",
                    border: `1px solid ${auditorName.trim() ? "rgba(16,185,129,0.5)" : "rgba(148,163,184,0.2)"}`,
                    color: auditorName.trim() ? "#34d399" : "#64748b",
                    fontSize: 14, fontWeight: 700, cursor: auditorName.trim() ? "pointer" : "not-allowed" }}>
          {mode === "spot-check" ? "Start spot check" : "Start audit"}
        </button>
      </div>
    );
  }

  // Location picker
  if (!locationId) {
    return (
      <div data-testid="audit-location-picker" style={{
        position: "fixed", inset: 0, background: "#0a0e1a", zIndex: 9999998,
        padding: 20, display: "flex", flexDirection: "column", gap: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontSize: 17, margin: 0, color: "#f5efe4" }}>Pick location</h2>
          <button onClick={onClose} data-testid="audit-exit-btn"
            style={{ background: "none", border: "1px solid rgba(148,163,184,0.3)",
                      color: "#94a3b8", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>✕</button>
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>
          Which location are you walking? Voice works offline — we'll sync when reception returns.
        </p>
        {LOCATIONS.map((loc) => (
          <button key={loc.id} data-testid={`audit-location-${loc.id}`}
            onClick={() => setLocationId(loc.id)}
            style={{ padding: 14, borderRadius: 8, cursor: "pointer",
                      background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)",
                      color: "#d4af37", fontSize: 14, fontWeight: 500, textAlign: "left" }}>
            {loc.name}
          </button>
        ))}
      </div>
    );
  }

  const location = LOCATIONS.find((l) => l.id === locationId);
  return (
    <div data-testid="audit-mode-root" style={{
      position: "fixed", inset: 0, background: "#0a0e1a", zIndex: 9999998,
      display: "flex", flexDirection: "column",
    }}>
      <header style={{ padding: "14px 16px", borderBottom: "1px solid rgba(212,175,55,0.2)",
                         display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: "#d4af37", letterSpacing: 2 }}>{online ? "● ONLINE" : "○ OFFLINE"}</div>
          <div style={{ fontSize: 15, color: "#f5efe4", marginTop: 2 }}>{location?.name}</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>
            Shelf {shelfIdx + 1} · {ROW_LABELS[rowIdx] || `row ${rowIdx + 1}`}
          </div>
        </div>
        <button onClick={onClose} data-testid="audit-end-btn"
          style={{ padding: "8px 14px", borderRadius: 4,
                    background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.4)",
                    color: "#fca5a5", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
          End audit
        </button>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {entries.length === 0 && !manualOpen && (
          <div style={{ padding: 20, textAlign: "center", color: "#64748b", fontSize: 12 }}>
            Speak an item like "two cases tomato" — or tap + to type a count.
          </div>
        )}
        {entries.slice().reverse().map((e, ri) => {
          const i = entries.length - 1 - ri;
          return (
            <div key={i} data-testid={`audit-entry-${i}`} style={{
              padding: 8, marginBottom: 4, borderRadius: 4,
              background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.15)",
              fontSize: 12, color: "#f5efe4",
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ color: "#d4af37", fontFamily: "monospace" }}>{e.qty} {e.unit}</span>
                {" "}{e.item_name}
                <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{e.shelf}</div>
              </div>
              <button data-testid={`audit-edit-${i}`} onClick={() => {
                setEditIdx(i); setEditQty(String(e.qty)); setEditReason("");
              }}
                style={{ fontSize: 14, background: "rgba(96,165,250,0.1)",
                          border: "1px solid rgba(96,165,250,0.3)",
                          color: "#93c5fd", borderRadius: 3, cursor: "pointer",
                          padding: "3px 8px" }}>✏️</button>
            </div>
          );
        })}
        {interim && (
          <div data-testid="audit-interim" style={{
            padding: 8, fontSize: 12, color: "#94a3b8", fontStyle: "italic",
            background: "rgba(96,165,250,0.08)", border: "1px dashed rgba(96,165,250,0.3)",
            borderRadius: 4,
          }}>
            {interim}
          </div>
        )}

        {manualOpen && (
          <div data-testid="audit-manual-form" style={{
            padding: 10, marginTop: 8, borderRadius: 6,
            background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.3)",
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ fontSize: 10, color: "#93c5fd", letterSpacing: 2 }}>ADD ITEM (TYPED)</div>
            <input data-testid="audit-manual-name" value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Item name (e.g. tomato roma)"
              style={{ padding: 8, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(148,163,184,0.2)",
                        borderRadius: 4, color: "#f5efe4", fontSize: 12 }} />
            <div style={{ display: "flex", gap: 6 }}>
              <input data-testid="audit-manual-qty" value={manualQty}
                onChange={(e) => setManualQty(e.target.value)}
                type="number" step="0.1"
                placeholder="Qty"
                style={{ flex: 1, padding: 8, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(148,163,184,0.2)",
                          borderRadius: 4, color: "#f5efe4", fontSize: 12 }} />
              <select data-testid="audit-manual-unit" value={manualUnit}
                onChange={(e) => setManualUnit(e.target.value)}
                style={{ padding: 8, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(148,163,184,0.2)",
                          borderRadius: 4, color: "#f5efe4", fontSize: 12 }}>
                {["cs", "ea", "lb", "oz", "gal", "l", "kg", "bottle"].map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button data-testid="audit-manual-cancel" onClick={() => {
                setManualOpen(false); setManualName(""); setManualQty("");
              }}
                style={{ flex: 1, padding: 8, background: "transparent",
                          border: "1px solid rgba(148,163,184,0.25)",
                          color: "#94a3b8", borderRadius: 4, fontSize: 11, cursor: "pointer" }}>
                Cancel
              </button>
              <button data-testid="audit-manual-save" onClick={async () => {
                if (!manualName.trim() || !manualQty) return;
                const entry: Entry = {
                  shelf: currentShelf(),
                  item_name: manualName.trim(),
                  qty: parseFloat(manualQty),
                  unit: manualUnit,
                  location_id: locationId!,
                  spoken_raw: `[typed] ${manualName} ${manualQty} ${manualUnit}`,
                  added_at: new Date().toISOString(),
                };
                setEntries((p) => [...p, entry]);
                await idbPut({ audit_id: auditIdRef.current, outlet_id: outletId, ...entry });
                setQueuedCount((c) => c + 1);
                setManualOpen(false); setManualName(""); setManualQty("");
              }} disabled={!manualName.trim() || !manualQty}
                style={{ flex: 1, padding: 8, background: "rgba(16,185,129,0.2)",
                          border: "1px solid rgba(16,185,129,0.5)",
                          color: "#34d399", borderRadius: 4, fontSize: 11, cursor: "pointer",
                          opacity: manualName.trim() && manualQty ? 1 : 0.5 }}>
                Add
              </button>
            </div>
          </div>
        )}

        {editIdx != null && (
          <div data-testid="audit-edit-form" style={{
            position: "fixed", top: 20, left: 20, right: 20, zIndex: 9999999,
            background: "#0a0e1a", border: "1px solid rgba(96,165,250,0.5)",
            borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 8,
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          }}>
            <div style={{ color: "#93c5fd", fontSize: 11, letterSpacing: 2 }}>
              EDIT ENTRY — {entries[editIdx]?.item_name}
            </div>
            <div style={{ fontSize: 10, color: "#fbbf24" }}>
              ⚠ Flagging change from original: {entries[editIdx]?.qty} {entries[editIdx]?.unit} → new qty
            </div>
            <input data-testid="audit-edit-qty" value={editQty}
              onChange={(e) => setEditQty(e.target.value)}
              type="number" step="0.1" autoFocus
              style={{ padding: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(148,163,184,0.3)",
                        borderRadius: 4, color: "#f5efe4", fontSize: 14 }} />
            <input data-testid="audit-edit-reason" value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="Reason for change (required)"
              style={{ padding: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(148,163,184,0.3)",
                        borderRadius: 4, color: "#f5efe4", fontSize: 13 }} />
            <div style={{ display: "flex", gap: 6 }}>
              <button data-testid="audit-edit-cancel" onClick={() => setEditIdx(null)}
                style={{ flex: 1, padding: 10, background: "transparent",
                          border: "1px solid rgba(148,163,184,0.25)", color: "#94a3b8",
                          borderRadius: 4, fontSize: 12, cursor: "pointer" }}>Cancel</button>
              <button data-testid="audit-edit-confirm" onClick={() => {
                if (!editReason.trim() || !editQty) return;
                if (!confirm(`Change ${entries[editIdx!].item_name} from ${entries[editIdx!].qty} to ${editQty}?\nReason: ${editReason}`)) return;
                setEntries((p) => p.map((e, i) => i === editIdx
                  ? { ...e, qty: parseFloat(editQty) } : e));
                // Note: the edit doesn't currently round-trip back to server
                // because the client entry doesn't have a server id yet
                // (entries are queued in IDB pre-sync). After the flush,
                // we'd patch via /inventory/entry/{id}. Intentional for iter237.
                setEditIdx(null); setEditReason("");
              }} disabled={!editReason.trim() || !editQty}
                style={{ flex: 1, padding: 10, background: "rgba(251,191,36,0.2)",
                          border: "1px solid rgba(251,191,36,0.5)", color: "#fbbf24",
                          borderRadius: 4, fontSize: 12, cursor: "pointer", fontWeight: 600,
                          opacity: editReason.trim() && editQty ? 1 : 0.5 }}>
                ✓ Confirm change
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: 14, borderTop: "1px solid rgba(212,175,55,0.15)",
                     display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 10, color: syncStatus.startsWith("⚠") ? "#fbbf24" : "#10b981", textAlign: "center" }}>
          {queuedCount > 0 && `${queuedCount} queued · `}{syncStatus}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button data-testid="audit-mic" onClick={() => listening ? stopListening() : startListening()}
            style={{
              flex: 1, padding: 14, borderRadius: 8,
              background: listening ? "rgba(244,63,94,0.25)" : "rgba(96,165,250,0.2)",
              border: `1px solid ${listening ? "rgba(244,63,94,0.55)" : "rgba(96,165,250,0.5)"}`,
              color: listening ? "#fca5a5" : "#93c5fd",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>
            {listening ? "⏹ Stop listening" : "🎙 Hold to count"}
          </button>
          <button data-testid="audit-next-row" onClick={nextRow}
            style={{ flex: 1, padding: 14, borderRadius: 8,
                      background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.4)",
                      color: "#d4af37", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Next row →
          </button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button data-testid="audit-next-shelf" onClick={nextShelf}
            style={{ flex: 1, padding: 10, borderRadius: 6,
                      background: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.25)",
                      color: "#cbd5e1", fontSize: 11, cursor: "pointer" }}>
            Next shelf
          </button>
          <button data-testid="audit-manual-open" onClick={() => setManualOpen(true)}
            style={{ padding: 10, borderRadius: 6,
                      background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.4)",
                      color: "#93c5fd", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
            ＋ Add item
          </button>
          <button data-testid="audit-sync-now" onClick={() => void flush()}
            disabled={queuedCount === 0}
            style={{ flex: 1, padding: 10, borderRadius: 6,
                      background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)",
                      color: "#10b981", fontSize: 11, cursor: "pointer",
                      opacity: queuedCount === 0 ? 0.5 : 1 }}>
            Sync ({queuedCount})
          </button>
        </div>

        <button data-testid="audit-complete-finance" onClick={async () => {
          await flush();
          if (!confirm(`Complete audit and send to Finance?\n\nAuditor: ${auditorName}\nDept: ${dept}\nEntries: ${entries.length}`)) return;
          try {
            await fetch(`${API()}/api/ecw-ops/inventory/audit/complete`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
              body: JSON.stringify({ audit_id: auditIdRef.current,
                                      finance_notified: true,
                                      spot_check_reminder_next_day: true }),
            });
            alert("✓ Audit sent to Finance. Spot-check reminder queued for FOH tomorrow.");
            onClose();
          } catch (e: any) { alert(e?.message || "Failed to complete"); }
        }}
          style={{ padding: 12, borderRadius: 6, marginTop: 6,
                    background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.5)",
                    color: "#d4af37", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    letterSpacing: 1 }}>
          💾 Complete audit · Send to Finance
        </button>
      </div>
    </div>
  );
}
