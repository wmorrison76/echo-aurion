// iter203a · BEO Builder — 3-panel "library ↔ selected" authoring per William spec.
// Left rail: sections from the source menu (Food · Beverage · AV · Dance Floor · …)
// Middle-left: library items for the selected section
// Arrows: ← → move items into/out of the BEO
// Middle-right: items selected FOR this BEO
// Right rail: BEO-facing notes + internal justification + totals + actions
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { CenterDialog } from "@/lib/side-panel";
import { getCurrentUser } from "@/stores/genesisAuthStore";

// Roles allowed to apply the ±5% planner adjustment. All other roles can still
// build BEOs but the adjustment slider is read-only (their 'view' shows the
// base price locked).
const ADJUST_ROLES = new Set(["SYSTEM_ADMIN", "DIRECTOR_OPERATIONS", "DIRECTOR_EVENTS", "GM", "OWNER", "OUTLET_MANAGER"]);

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || window.location.origin;
};

type MenuSummary = { menu_id: string; name: string; property?: string; season?: string };
type MenuItem = {
  id: string;
  name: string;
  description?: string;
  section: string;
  subsection?: string;
  price?: string;
  price_numeric?: number;
  base_package_price?: number;
  dietary_info?: string;
};
type Selection = {
  item_id: string;
  name: string;
  section: string;
  subsection?: string;
  base_price: number;
  qty: number;
  adjustment_pct: number;
  show_on_beo: boolean;
  note?: string;
  pricing_mode?: "per_guest" | "fixed";
};
type Draft = {
  draft_id: string;
  menu_id: string;
  menu_name?: string;
  name: string;
  client?: string;
  guest_count: number;
  selections: Selection[];
  beo_notes: string;
  internal_justification: string;
  show_prices_on_beo: boolean;
  totals?: { per_guest_subtotal: number; fixed_subtotal: number; total: number; guest_count: number };
  last_audit_issues?: Array<any>;
};

export default function BeoBuilder() {
  const [menus, setMenus] = useState<MenuSummary[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [sections, setSections] = useState<string[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  // iter207c/e · Track the last finalized BEO (for Maestro re-push + GL badge)
  const [lastBeo, setLastBeo] = useState<{ beo_id: string; gl_code?: string; maestro_pushed?: boolean } | null>(null);
  // iter206 · Offline-capable cache. When the browser is offline or the PATCH
  // fails, selections/notes are held in localStorage under `beo_offline_queue`
  // and replayed against the server on next successful save.
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);

  const OFFLINE_KEY = "beo_offline_queue_v1";
  const OFFLINE_CACHE_KEY = "beo_offline_cache_v1";

  function readOfflineQueue(): Array<{ draft_id: string; updates: any; ts: string }> {
    try { return JSON.parse(localStorage.getItem(OFFLINE_KEY) || "[]"); } catch { return []; }
  }
  function writeOfflineQueue(q: Array<{ draft_id: string; updates: any; ts: string }>) {
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(q));
    setPendingOfflineCount(q.length);
  }
  function cacheDraftLocally(d: Draft | null) {
    if (!d) return;
    try {
      const existing = JSON.parse(localStorage.getItem(OFFLINE_CACHE_KEY) || "{}");
      existing[d.draft_id] = { ...d, _cached_at: new Date().toISOString() };
      localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(existing));
    } catch { /* quota — ignore */ }
  }
  function loadDraftFromCache(id: string): Draft | null {
    try {
      const cache = JSON.parse(localStorage.getItem(OFFLINE_CACHE_KEY) || "{}");
      return cache[id] || null;
    } catch { return null; }
  }
  // iter203d · role gate
  const currentUser = useMemo(() => getCurrentUser(), []);
  const canAdjust = useMemo(() => {
    if (!currentUser) return false;
    return ADJUST_ROLES.has(currentUser.role);
  }, [currentUser]);

  // Load menus + drafts
  useEffect(() => {
    (async () => {
      const [mR, dR] = await Promise.all([
        fetch(`${API()}/api/banquet-menus`).then(r => r.ok ? r.json() : { menus: [] }),
        fetch(`${API()}/api/beo-builder/drafts`).then(r => r.ok ? r.json() : { drafts: [] }),
      ]);
      setMenus(mR.menus || []);
      setDrafts(dR.drafts || []);
    })();
  }, []);

  // When we pick a draft, load its detail + its menu's items/categories.
  // iter206 · Falls back to local cache if the fetch fails (offline mode).
  useEffect(() => {
    if (!draftId) { setDraft(null); return; }
    (async () => {
      let d: Draft | null = null;
      try {
        const r = await fetch(`${API()}/api/beo-builder/drafts/${draftId}`);
        if (r.ok) d = await r.json();
      } catch { /* offline */ }
      if (!d) {
        d = loadDraftFromCache(draftId);
        if (d) showFlash("Loaded from offline cache");
      }
      if (!d) return;
      setDraft(d);
      try {
        const [cats, its] = await Promise.all([
          fetch(`${API()}/api/banquet-menus/${d.menu_id}/categories`).then(r => r.json()),
          fetch(`${API()}/api/banquet-menus/${d.menu_id}/items?limit=500`).then(r => r.json()),
        ]);
        const secNames = (cats.categories || []).map((c: any) => c.name);
        setSections(secNames);
        setActiveSection(secNames[0] || null);
        setItems(its.items || []);
      } catch { /* offline — keep what we have */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  const selectedIds = useMemo(() => new Set((draft?.selections || []).map(s => s.item_id)), [draft]);
  const libraryForSection = useMemo(
    () => items.filter(i => i.section === activeSection && !selectedIds.has(i.id)),
    [items, activeSection, selectedIds]
  );
  const selectedInSection = useMemo(
    () => (draft?.selections || []).filter(s => s.section === activeSection),
    [draft, activeSection]
  );

  const showFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(null), 2500); };

  // iter206 · Online/offline listeners
  useEffect(() => {
    const onOnline = () => { setOnline(true); void flushOfflineQueue(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    setPendingOfflineCount(readOfflineQueue().length);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // iter206 · Cache draft locally every time it changes (survives tab refresh)
  useEffect(() => { cacheDraftLocally(draft); }, [draft]);

  async function patchDraft(updates: Partial<Draft & { selections: Selection[] }>) {
    if (!draft) return;
    // Optimistic local apply first (instant UI) + cache
    const optimistic: Draft = { ...draft, ...(updates as any) };
    setDraft(optimistic);
    cacheDraftLocally(optimistic);

    // If offline, queue + short-circuit
    if (!online) {
      const q = readOfflineQueue();
      q.push({ draft_id: draft.draft_id, updates, ts: new Date().toISOString() });
      writeOfflineQueue(q);
      return;
    }

    try {
      const r = await fetch(`${API()}/api/beo-builder/drafts/${draft.draft_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (r.ok) {
        const fresh = await r.json();
        setDraft(fresh);
        cacheDraftLocally(fresh);
      } else {
        // Server rejected — queue for retry so the user's edit isn't lost
        const q = readOfflineQueue();
        q.push({ draft_id: draft.draft_id, updates, ts: new Date().toISOString() });
        writeOfflineQueue(q);
        showFlash("Saved offline · will sync when server is reachable");
      }
    } catch {
      // Network error — queue
      const q = readOfflineQueue();
      q.push({ draft_id: draft.draft_id, updates, ts: new Date().toISOString() });
      writeOfflineQueue(q);
      setOnline(false);
      showFlash("Offline · edits queued locally");
    }
  }

  // iter206 · Replay queued edits once connectivity comes back
  async function flushOfflineQueue() {
    const q = readOfflineQueue();
    if (q.length === 0) return;
    const remaining: typeof q = [];
    let flushed = 0;
    for (const item of q) {
      try {
        const r = await fetch(`${API()}/api/beo-builder/drafts/${item.draft_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.updates),
        });
        if (r.ok) flushed += 1;
        else remaining.push(item);
      } catch { remaining.push(item); }
    }
    writeOfflineQueue(remaining);
    if (flushed > 0) {
      showFlash(`Synced ${flushed} offline edit${flushed === 1 ? "" : "s"}`);
      if (draft?.draft_id) {
        try {
          const fresh = await fetch(`${API()}/api/beo-builder/drafts/${draft.draft_id}`).then(r => r.json());
          setDraft(fresh);
        } catch { /* ignore */ }
      }
    }
  }

  function addItem(it: MenuItem) {
    if (!draft) return;
    const price = Number(it.base_package_price || it.price_numeric || 0);
    const mode: "per_guest" | "fixed" = it.base_package_price ? "per_guest" : "fixed";
    const sel: Selection = {
      item_id: it.id, name: it.name, section: it.section, subsection: it.subsection,
      base_price: price, qty: 1, adjustment_pct: 0, show_on_beo: true,
      pricing_mode: mode, note: "",
    };
    patchDraft({ selections: [...(draft.selections || []), sel] });
  }
  function removeItem(itemId: string) {
    if (!draft) return;
    patchDraft({ selections: (draft.selections || []).filter(s => s.item_id !== itemId) });
  }
  function updateSelection(itemId: string, patch: Partial<Selection>) {
    if (!draft) return;
    patchDraft({
      selections: (draft.selections || []).map(s => s.item_id === itemId ? { ...s, ...patch } : s),
    });
  }

  async function createDraft(menuId: string, name: string, guestCount: number, client: string) {
    const r = await fetch(`${API()}/api/beo-builder/drafts`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menu_id: menuId, name, guest_count: guestCount, client }),
    });
    if (r.ok) {
      const d = await r.json();
      setDrafts(prev => [d, ...prev]);
      setDraftId(d.draft_id);
      setCreating(false);
      showFlash("Draft created");
    } else showFlash("Create failed");
  }

  async function runAudit() {
    if (!draft) return;
    const r = await fetch(`${API()}/api/beo-builder/drafts/${draft.draft_id}/audit`, { method: "POST" });
    if (r.ok) {
      const res = await r.json();
      setAuditResult(res);
      const fresh = await fetch(`${API()}/api/beo-builder/drafts/${draft.draft_id}`).then(r => r.json());
      setDraft(fresh);
      showFlash(res.issues_found === 0 ? "Audit clean · no issues" : `Audit · ${res.issues_found} issues auto-fixed`);
    }
  }

  async function finalizeDraft() {
    if (!draft) return;
    if (!confirm("Finalize this BEO? It will snapshot into the live BEO registry and freeze the draft.")) return;
    const r = await fetch(`${API()}/api/beo-builder/drafts/${draft.draft_id}/finalize`, { method: "POST" });
    if (r.ok) {
      const beo = await r.json();
      setLastBeo({ beo_id: beo.beo_id, gl_code: beo.gl_code, maestro_pushed: !!beo.maestro_pushed });
      showFlash(`BEO ${beo.beo_id} issued · GL ${beo.gl_code || "—"} · Maestro ${beo.maestro_pushed ? "✓" : "—"}`);
    }
    else showFlash("Finalize failed");
  }

  // iter207c · Manual re-push to MaestroBQT
  async function pushToMaestro() {
    if (!lastBeo?.beo_id) return;
    const r = await fetch(`${API()}/api/beo-builder/beos/${lastBeo.beo_id}/push-maestro`, { method: "POST" });
    if (r.ok) {
      setLastBeo({ ...lastBeo, maestro_pushed: true });
      showFlash(`BEO ${lastBeo.beo_id} → MaestroBQT pushed`);
    } else showFlash("Push failed");
  }

  // ── render ────────────────────────────────────────────────────────────
  return (
    <div data-testid="beo-builder" className="flex flex-col h-full" style={{ background: "#0a0e17", color: "#e2e8f0" }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div>
          <div className="text-sm font-semibold text-white">BEO Builder</div>
          <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">
            3-panel authoring · self-audit · ±5% planner adjustment
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div data-testid="beo-online-pill" className="text-[10px] font-mono px-2 py-1 rounded" style={{
            background: online ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.12)",
            color: online ? "#6ee7b7" : "#fcd34d",
            border: `1px solid ${online ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.35)"}`,
          }}>
            {online ? "● ONLINE" : "○ OFFLINE"}
            {pendingOfflineCount > 0 && (
              <span className="ml-1 text-[10px]" data-testid="beo-pending-count"> · {pendingOfflineCount} queued</span>
            )}
          </div>
          {pendingOfflineCount > 0 && online && (
            <button data-testid="beo-sync-now" onClick={() => { void flushOfflineQueue(); }}
              className="px-2 py-1 rounded text-[10px] text-amber-300 border"
              style={{ borderColor: "rgba(245,158,11,0.35)" }}>
              Sync ↻
            </button>
          )}
          <select data-testid="beo-draft-picker" value={draftId || ""} onChange={(e) => setDraftId(e.target.value || null)}
            className="px-2 py-1 rounded bg-slate-900 text-white text-[11px] border" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
            <option value="">— Open draft —</option>
            {drafts.map(d => <option key={d.draft_id} value={d.draft_id}>{d.name || d.draft_id}</option>)}
          </select>
          <button data-testid="beo-new-draft" onClick={() => setCreating(true)}
            className="px-3 py-1 rounded text-[11px] text-white"
            style={{ background: "linear-gradient(135deg,#3b82f6,#a855f7)" }}>+ New BEO</button>
        </div>
      </div>

      {creating && <NewDraftModal menus={menus} onClose={() => setCreating(false)} onCreate={createDraft} />}
      {flash && <div data-testid="beo-flash" className="fixed bottom-5 right-5 z-[99955] px-3 py-2 rounded text-[11px] text-white" style={{ background: "rgba(16,185,129,0.85)" }}>{flash}</div>}

      {!draft && (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
          {drafts.length === 0 ? "No BEO drafts yet — click + New BEO." : "Pick a draft above to start building."}
        </div>
      )}

      {draft && (
        <div className="flex-1 flex overflow-hidden">
          {/* Far-left: sections */}
          <aside data-testid="beo-sections" className="w-48 border-r overflow-y-auto" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#070b12" }}>
            <div className="px-3 py-2 text-[9px] font-mono text-slate-500 uppercase tracking-widest border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              Sections · {sections.length}
            </div>
            {sections.map(sec => {
              const count = (draft.selections || []).filter(s => s.section === sec).length;
              return (
                <button key={sec} data-testid={`beo-section-${sec}`} onClick={() => setActiveSection(sec)}
                  className={`w-full text-left px-3 py-2 text-[11px] border-b flex items-center justify-between hover:bg-white/[0.03]`}
                  style={{
                    borderColor: "rgba(255,255,255,0.03)",
                    background: activeSection === sec ? "rgba(59,130,246,0.08)" : "transparent",
                    color: activeSection === sec ? "#3b82f6" : "#cbd5e1",
                  }}>
                  <span className="truncate">{sec}</span>
                  {count > 0 && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>{count}</span>}
                </button>
              );
            })}
          </aside>

          {/* Library ↔ Selected 2-panel */}
          <section className="flex-1 flex min-w-0">
            {/* Library */}
            <div data-testid="beo-library-panel" className="flex-1 flex flex-col border-r min-w-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="px-3 py-2 text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                Library · {activeSection || "—"} · {libraryForSection.length} available
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {libraryForSection.length === 0 && <div className="text-center text-xs text-slate-600 py-8">Nothing available in this section.</div>}
                {libraryForSection.map(it => (
                  <div key={it.id} data-testid={`beo-lib-${it.id}`}
                    className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-white/[0.03]"
                    style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" }}
                    onClick={() => addItem(it)}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-white truncate">{it.name}</div>
                      <div className="text-[9px] text-slate-500 truncate">{it.subsection || "—"} · ${(it.base_package_price ?? it.price_numeric ?? 0).toFixed(2)}{it.base_package_price ? "/guest" : ""}</div>
                    </div>
                    <button data-testid={`beo-add-${it.id}`} className="flex-shrink-0 px-2 py-1 rounded text-[10px] text-emerald-300 border" style={{ borderColor: "rgba(16,185,129,0.35)" }}
                      onClick={(e) => { e.stopPropagation(); addItem(it); }}>→</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected */}
            <div data-testid="beo-selected-panel" className="flex-1 flex flex-col min-w-0">
              <div className="px-3 py-2 text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                Selected · {activeSection || "—"} · {selectedInSection.length}
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {selectedInSection.length === 0 && <div className="text-center text-xs text-slate-600 py-8">Nothing selected yet for this section. Click an item to the left to add.</div>}
                {selectedInSection.map(sel => (
                  <div key={sel.item_id} data-testid={`beo-sel-${sel.item_id}`} className="p-2 rounded border" style={{ background: "rgba(59,130,246,0.04)", borderColor: "rgba(59,130,246,0.18)" }}>
                    <div className="flex items-center gap-2">
                      <button data-testid={`beo-remove-${sel.item_id}`} onClick={() => removeItem(sel.item_id)} className="flex-shrink-0 px-2 py-1 rounded text-[10px] text-red-300 border" style={{ borderColor: "rgba(239,68,68,0.3)" }}>←</button>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-white truncate">{sel.name}</div>
                        <div className="text-[9px] text-slate-500 truncate">
                          Base ${sel.base_price.toFixed(2)}{sel.pricing_mode === "per_guest" ? "/guest" : ""}
                          {sel.adjustment_pct !== 0 && <span> · adj {sel.adjustment_pct > 0 ? "+" : ""}{sel.adjustment_pct}%</span>}
                        </div>
                      </div>
                      <label className="flex-shrink-0 flex items-center gap-1 text-[9px] text-slate-400 cursor-pointer">
                        <input type="checkbox" checked={sel.show_on_beo} onChange={(e) => updateSelection(sel.item_id, { show_on_beo: e.target.checked })} className="w-3 h-3" />
                        <span>on BEO</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <label className="text-[9px] text-slate-500">Qty
                        <input type="number" min={1} value={sel.qty} onChange={(e) => updateSelection(sel.item_id, { qty: Math.max(1, Number(e.target.value)) })}
                          className="w-full px-1 py-0.5 bg-black text-white text-[11px] rounded border" style={{ borderColor: "rgba(255,255,255,0.1)" }} />
                      </label>
                      <label className="text-[9px] text-slate-500" title={canAdjust ? "±5% max" : "Read-only — requires Director+ role"}>Adj %
                        <input type="number" step="0.5" min={-5} max={5} value={sel.adjustment_pct}
                          disabled={!canAdjust}
                          data-testid={`beo-adj-${sel.item_id}`}
                          onChange={(e) => {
                            const v = Math.max(-5, Math.min(5, Number(e.target.value)));
                            updateSelection(sel.item_id, { adjustment_pct: v });
                          }}
                          className="w-full px-1 py-0.5 bg-black text-white text-[11px] rounded border disabled:opacity-50 disabled:cursor-not-allowed" style={{ borderColor: canAdjust ? "rgba(255,255,255,0.1)" : "rgba(100,116,139,0.3)" }} />
                      </label>
                      <div className="text-[9px] text-slate-500">Line
                        <div className="text-[11px] font-mono text-emerald-300 pt-0.5">
                          ${(sel.base_price * (1 + sel.adjustment_pct / 100) * sel.qty * (sel.pricing_mode === "per_guest" ? Math.max(1, draft.guest_count) : 1)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <input type="text" placeholder="BEO-facing note for this item (optional)"
                      value={sel.note || ""}
                      data-testid={`beo-note-${sel.item_id}`}
                      onChange={(e) => updateSelection(sel.item_id, { note: e.target.value })}
                      className="mt-2 w-full px-2 py-1 text-[10px] bg-black text-white rounded border"
                      style={{ borderColor: "rgba(255,255,255,0.08)" }} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Right: summary + notes + actions */}
          <aside data-testid="beo-summary" className="w-[300px] border-l overflow-y-auto p-4 space-y-3" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#070b12" }}>
            <div className="rounded p-2" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <div className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Totals · preview</div>
              <div className="text-[10px] mt-1 text-slate-300">Guests: <span className="text-white font-mono">{draft.guest_count}</span></div>
              <div className="text-[10px] text-slate-300">Per-guest: <span className="font-mono text-white">${(draft.totals?.per_guest_subtotal ?? 0).toFixed(2)}</span></div>
              <div className="text-[10px] text-slate-300">Fixed: <span className="font-mono text-white">${(draft.totals?.fixed_subtotal ?? 0).toFixed(2)}</span></div>
              <div className="text-[13px] mt-1 font-mono text-emerald-300">Total: ${(draft.totals?.total ?? 0).toFixed(2)}</div>
            </div>

            <label className="flex items-center gap-2 text-[10px] text-slate-300 cursor-pointer">
              <input type="checkbox" data-testid="beo-show-prices" checked={draft.show_prices_on_beo} onChange={(e) => patchDraft({ show_prices_on_beo: e.target.checked } as any)} />
              <span>Show prices on printed BEO</span>
            </label>

            <div>
              <div className="text-[9px] font-mono text-slate-400 uppercase tracking-widest mb-1">BEO Notes (prints)</div>
              <textarea data-testid="beo-notes" rows={4} value={draft.beo_notes} onChange={(e) => setDraft({ ...draft, beo_notes: e.target.value })}
                onBlur={(e) => patchDraft({ beo_notes: e.target.value } as any)}
                className="w-full p-2 text-[10px] bg-black text-white rounded border" style={{ borderColor: "rgba(255,255,255,0.1)" }} />
            </div>

            <div>
              <div className="text-[9px] font-mono text-amber-400 uppercase tracking-widest mb-1">Internal Justification · staff-only</div>
              <textarea data-testid="beo-justification" rows={3} value={draft.internal_justification} onChange={(e) => setDraft({ ...draft, internal_justification: e.target.value })}
                onBlur={(e) => patchDraft({ internal_justification: e.target.value } as any)}
                className="w-full p-2 text-[10px] bg-black text-white rounded border" style={{ borderColor: "rgba(245,158,11,0.3)" }} />
              <div className="text-[9px] text-slate-500 mt-0.5">NOT printed on client-facing BEO</div>
            </div>

            {auditResult && (
              <div className="rounded p-2 text-[10px]" style={{ background: auditResult.issues_found === 0 ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)", border: `1px solid ${auditResult.issues_found === 0 ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}` }} data-testid="beo-audit-result">
                <div className="font-semibold" style={{ color: auditResult.issues_found === 0 ? "#10b981" : "#f59e0b" }}>
                  Audit · {auditResult.issues_found} issue{auditResult.issues_found === 1 ? "" : "s"} · {auditResult.auto_fixes} auto-fix{auditResult.auto_fixes === 1 ? "" : "es"}
                </div>
                {(auditResult.issues || []).slice(0, 4).map((iss: any, i: number) => (
                  <div key={i} className="text-[9px] text-slate-400 mt-0.5">· {iss.type}: {iss.name || iss.item_id}</div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button data-testid="beo-audit" onClick={runAudit} className="flex-1 px-3 py-1.5 rounded text-[11px] text-amber-300 border" style={{ borderColor: "rgba(245,158,11,0.35)" }}>Self-Audit</button>
              <button data-testid="beo-finalize" onClick={finalizeDraft} className="flex-1 px-3 py-1.5 rounded text-[11px] text-white" style={{ background: "linear-gradient(135deg,#10b981,#3b82f6)" }}>Finalize → BEO</button>
            </div>

            {lastBeo && (
              <div data-testid="beo-lastfinalized" className="rounded p-2 space-y-1.5" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.25)" }}>
                <div className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest">Last finalized</div>
                <div className="flex items-center flex-wrap gap-1.5 text-[10px]">
                  <span className="font-mono text-white">{lastBeo.beo_id}</span>
                  {lastBeo.gl_code && (
                    <span data-testid="beo-gl-badge" className="px-1.5 py-0.5 rounded text-[9px] font-mono" style={{ background: "rgba(99,102,241,0.18)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }}>
                      GL {lastBeo.gl_code}
                    </span>
                  )}
                  <span data-testid="beo-maestro-badge" className="px-1.5 py-0.5 rounded text-[9px] font-mono" style={{ background: lastBeo.maestro_pushed ? "rgba(16,185,129,0.18)" : "rgba(148,163,184,0.12)", color: lastBeo.maestro_pushed ? "#6ee7b7" : "#94a3b8", border: `1px solid ${lastBeo.maestro_pushed ? "rgba(16,185,129,0.3)" : "rgba(148,163,184,0.25)"}` }}>
                    Maestro {lastBeo.maestro_pushed ? "✓" : "—"}
                  </span>
                </div>
                <button data-testid="beo-push-maestro" onClick={pushToMaestro}
                  className="w-full px-2 py-1 rounded text-[10px] text-white"
                  style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
                  {lastBeo.maestro_pushed ? "Re-push → MaestroBQT" : "Push BEO → MaestroBQT"}
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function NewDraftModal({ menus, onClose, onCreate }: {
  menus: MenuSummary[];
  onClose: () => void;
  onCreate: (menuId: string, name: string, guestCount: number, client: string) => Promise<void>;
}) {
  const [menuId, setMenuId] = useState<string>(menus[0]?.menu_id || "");
  const [name, setName] = useState("");
  const [gc, setGc] = useState(0);
  const [client, setClient] = useState("");
  const canCreate = menuId && name.trim().length > 0;
  return (
    <CenterDialog
      open
      onClose={onClose}
      testId="beo-new-modal"
      maxWidth="30rem"
      title="New BEO Draft"
    >
        <div className="space-y-3">
          <div>
            <div className="text-[9px] font-mono text-slate-500 uppercase mb-1">Source Menu / Packet</div>
            <select data-testid="beo-new-menu" value={menuId} onChange={(e) => setMenuId(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-900 text-white text-sm rounded border" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
              {menus.length === 0 && <option value="">(no menus available)</option>}
              {menus.map(m => <option key={m.menu_id} value={m.menu_id}>{m.name} ({m.menu_id})</option>)}
            </select>
          </div>
          <div>
            <div className="text-[9px] font-mono text-slate-500 uppercase mb-1">Event / BEO Name</div>
            <input data-testid="beo-new-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Smith Wedding — Reception"
              className="w-full px-2 py-1.5 bg-slate-900 text-white text-sm rounded border" style={{ borderColor: "rgba(255,255,255,0.1)" }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] font-mono text-slate-500 uppercase mb-1">Guest Count</div>
              <input data-testid="beo-new-gc" type="number" min={0} value={gc} onChange={(e) => setGc(Number(e.target.value))}
                className="w-full px-2 py-1.5 bg-slate-900 text-white text-sm rounded border" style={{ borderColor: "rgba(255,255,255,0.1)" }} />
            </div>
            <div>
              <div className="text-[9px] font-mono text-slate-500 uppercase mb-1">Client</div>
              <input data-testid="beo-new-client" value={client} onChange={(e) => setClient(e.target.value)} placeholder="optional"
                className="w-full px-2 py-1.5 bg-slate-900 text-white text-sm rounded border" style={{ borderColor: "rgba(255,255,255,0.1)" }} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 rounded text-[11px] text-slate-400 border" style={{ borderColor: "rgba(255,255,255,0.12)" }}>Cancel</button>
          <button data-testid="beo-new-create" disabled={!canCreate} onClick={() => onCreate(menuId, name, gc, client)}
            className="px-3 py-1.5 rounded text-[11px] text-white disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#3b82f6,#a855f7)" }}>Create</button>
        </div>
    </CenterDialog>
  );
}
