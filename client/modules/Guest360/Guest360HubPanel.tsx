/**
 * Guest360HubPanel — deep guest profile browser
 */
import React, { useEffect, useState } from "react";
import { Users, Star, AlertTriangle, RefreshCw, Crown, Home } from "lucide-react";

const ACCENT = "#c8a97e";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const BORDER = "rgba(255,255,255,0.08)";
const SURFACE = "rgba(255,255,255,0.025)";
const API = typeof window !== "undefined" ? window.location.origin : "";
const tierColor: Record<string, string> = { black: "#000", platinum: "#e5e7eb", gold: "#fbbf24", standard: "#94a3b8" };

export default function Guest360HubPanel() {
  const [profiles, setProfiles] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "vip" | "in_house">("all");

  const load = async () => {
    const q = filter === "vip" ? "?vip=true" : filter === "in_house" ? "?in_house=true" : "";
    const r = await fetch(`${API}/api/guest360-hub/profiles${q}`).then(r => r.json());
    setProfiles(r);
  };

  useEffect(() => {
    fetch(`${API}/api/guest360-hub/seed`, { method: "POST" }).then(() => load());
  }, []);
  useEffect(() => { load(); /* eslint-disable-line */ }, [filter]);

  const openProfile = async (gid: string) => {
    const r = await fetch(`${API}/api/guest360-hub/profiles/${gid}`).then(r => r.json());
    setSelected(r);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#04060d", color: "#e2e8f0" }} data-testid="guest360-hub">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b flex-wrap gap-2" style={{ borderColor: BORDER, background: "#0b1020" }}>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: `${ACCENT}99` }}>Guest 360</div>
          <div className="text-[22px] font-semibold text-white mt-0.5 tracking-tight">Deep Profile Hub</div>
          <div className="text-[10px] text-white/40 mt-0.5">Unified profile · preferences · history · notes</div>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            {(["all", "vip", "in_house"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 text-[10px] uppercase"
                style={{ background: filter === f ? `${ACCENT}22` : "transparent", color: filter === f ? ACCENT : "#94a3b8" }}
                data-testid={`filter-${f}`}>
                {f.replace("_", " ")}
              </button>
            ))}
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px]"
            style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
            data-testid="guest360-refresh">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden p-4 sm:p-6">
        {/* List */}
        <div className="rounded-lg overflow-y-auto" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="guest360-list">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] p-3 border-b" style={{ color: ACCENT, borderColor: BORDER }}>
            Guests ({profiles?.count || 0})
          </div>
          {(profiles?.items || []).map((p: any) => (
            <button key={p.guest_id} onClick={() => openProfile(p.guest_id)}
              className="w-full text-left px-3 py-2 border-b hover:bg-white/5 transition"
              style={{ borderColor: BORDER }}
              data-testid={`guest-${p.guest_id}`}>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white">{p.name}</span>
                {p.vip && <Crown size={10} style={{ color: AMBER }} />}
                {p.in_house && <Home size={10} style={{ color: GREEN }} />}
              </div>
              <div className="text-[9px]" style={{ color: "#94a3b8" }}>
                {p.loyalty_tier} · {p.loyalty_points?.toLocaleString()} pts · {p.total_stays} stays · ${p.lifetime_revenue?.toLocaleString()}
                {p.current_room && ` · Rm ${p.current_room}`}
              </div>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="rounded-lg overflow-y-auto p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="guest360-detail">
          {!selected ? (
            <div className="text-[10px] text-center py-12" style={{ color: "#64748b" }}>Select a guest to view full 360 profile</div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[18px] font-semibold text-white">{selected.profile.name}</span>
                {selected.profile.vip && <Crown size={14} style={{ color: AMBER }} />}
                <span className="ml-auto text-[9px] px-2 py-0.5 rounded" style={{ background: `${tierColor[selected.profile.loyalty_tier]}20`, color: tierColor[selected.profile.loyalty_tier] }}>
                  {selected.profile.loyalty_tier}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4 text-[10px]">
                <div><span style={{ color: "#94a3b8" }}>Points:</span> <span className="text-white">{selected.profile.loyalty_points?.toLocaleString()}</span></div>
                <div><span style={{ color: "#94a3b8" }}>Lifetime:</span> <span className="text-white">${selected.profile.lifetime_revenue?.toLocaleString()}</span></div>
                <div><span style={{ color: "#94a3b8" }}>Stays:</span> <span className="text-white">{selected.profile.total_stays}</span></div>
                <div><span style={{ color: "#94a3b8" }}>Room:</span> <span className="text-white">{selected.profile.current_room || "—"}</span></div>
                <div><span style={{ color: "#94a3b8" }}>Allergies:</span> <span style={{ color: AMBER }}>{(selected.profile.allergy_flags || []).join(", ") || "—"}</span></div>
                <div><span style={{ color: "#94a3b8" }}>Diet:</span> <span className="text-white">{(selected.profile.dietary_prefs || []).join(", ") || "—"}</span></div>
                <div><span style={{ color: "#94a3b8" }}>Wine:</span> <span className="text-white">{selected.profile.wine_preference || "—"}</span></div>
                <div><span style={{ color: "#94a3b8" }}>Table:</span> <span className="text-white">{selected.profile.preferred_table || "—"}</span></div>
              </div>

              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-1" style={{ color: ACCENT }}>Concierge History ({selected.concierge_history.length})</div>
              {selected.concierge_history.slice(0, 5).map((c: any) => (
                <div key={c.id} className="py-1 border-b border-white/5 text-[10px]">
                  <div style={{ color: "#94a3b8" }}>{c.domain} · {c.title}</div>
                </div>
              ))}

              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] mt-3 mb-1" style={{ color: ACCENT }}>Reservations ({selected.reservations.length})</div>
              {selected.reservations.slice(0, 5).map((r: any) => (
                <div key={r.id} className="py-1 border-b border-white/5 text-[10px]">
                  <div style={{ color: "#94a3b8" }}>{r.outlet_slug} · party {r.party_size} · {new Date(r.eta).toLocaleString()}</div>
                </div>
              ))}

              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] mt-3 mb-1" style={{ color: ACCENT }}>Notes ({selected.notes.length})</div>
              {selected.notes.slice(0, 5).map((n: any) => (
                <div key={n.id} className="py-1 border-b border-white/5 text-[10px]">
                  <div className="text-white">{n.body}</div>
                  <div style={{ color: "#64748b" }}>{n.author} · {new Date(n.created_at).toLocaleString()}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
