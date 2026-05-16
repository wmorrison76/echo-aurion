/**
 * PatternInlineWidget
 * --------------------
 * Compact read-only digest of cross-module pattern intelligence,
 * embedded inside EchoAurium GM + EchoStratus Forecast panels.
 * Surfaces top recurring issues, asset hotspots, outlet drift, and
 * repeat guests with a one-click path into the full Pattern
 * Intelligence command center.
 */
import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Crown,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import { useLiveEvents } from "@/hooks/useLiveEvents";

const ACCENT = "#c8a97e";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const RED = "#ef4444";
const BLUE = "#60a5fa";
const PURPLE = "#a855f7";
const BORDER = "rgba(255,255,255,0.08)";
const SURFACE = "rgba(255,255,255,0.025)";
const API = typeof window !== "undefined" ? window.location.origin : "";

const fmt = (n: any, d = 0) =>
  typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : n ?? "—";

interface Props {
  days?: number;
  variant?: "compact" | "full";
}

export default function PatternInlineWidget({ days = 30, variant = "compact" }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      const r = await fetch(`${API}/api/patterns/inline-summary?days=${days}`).then((r) => r.json());
      setData(r);
    } catch {
      /* silent */
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const r = await fetch(`${API}/api/patterns/inline-summary?days=${days}`).then((r) => r.json());
        if (!cancelled) setData(r);
      } catch {
        /* silent */
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  useLiveEvents(["stratus.", "patterns.", "concierge.", "eng."], () => fetchSummary());

  const openPatterns = () => {
    window.dispatchEvent(
      new CustomEvent("open-panel", { detail: { id: "pattern-intelligence" } })
    );
  };

  if (loading && !data) {
    return (
      <div
        className="rounded-lg p-3 text-[10px]"
        style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "#94a3b8" }}
        data-testid="pattern-inline-loading"
      >
        Loading pattern intelligence…
      </div>
    );
  }
  if (!data) return null;

  const risk = data.risk_score ?? 0;
  const riskColor = risk > 60 ? RED : risk > 35 ? AMBER : GREEN;
  const t = data.totals || {};

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
      data-testid="pattern-inline-widget"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} style={{ color: ACCENT }} />
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
            Pattern Intelligence · {data.window_days}d
          </div>
          <div
            className="text-[10px] font-mono px-2 py-0.5 rounded"
            style={{ background: `${riskColor}22`, color: riskColor }}
            data-testid="pattern-inline-risk"
          >
            risk {risk}
          </div>
        </div>
        <button
          onClick={openPatterns}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
          style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
          data-testid="open-pattern-intelligence"
        >
          Open Panel <ChevronRight size={11} />
        </button>
      </div>

      {/* Totals row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div className="text-center" data-testid="pi-total-recurring">
          <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Recurring</div>
          <div className="text-[18px] font-bold" style={{ color: t.recurring_issues > 5 ? AMBER : "#e2e8f0" }}>
            {t.recurring_issues ?? 0}
          </div>
        </div>
        <div className="text-center" data-testid="pi-total-assets">
          <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Asset Hotspots</div>
          <div className="text-[18px] font-bold" style={{ color: t.asset_hotspots > 2 ? AMBER : "#e2e8f0" }}>
            {t.asset_hotspots ?? 0}
          </div>
        </div>
        <div className="text-center" data-testid="pi-total-drift">
          <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Outlet Drift</div>
          <div className="text-[18px] font-bold" style={{ color: t.outlet_drift_outlets > 0 ? RED : GREEN }}>
            {t.outlet_drift_outlets ?? 0}
          </div>
        </div>
        <div className="text-center" data-testid="pi-total-guests">
          <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Repeat Guests</div>
          <div className="text-[18px] font-bold" style={{ color: t.repeat_guests > 3 ? AMBER : "#e2e8f0" }}>
            {t.repeat_guests ?? 0}
          </div>
        </div>
      </div>

      {variant === "full" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Top recurring */}
          <div>
            <div className="text-[9px] uppercase mb-1" style={{ color: "#94a3b8" }}>Top recurring</div>
            {(data.top_recurring || []).length === 0 ? (
              <div className="text-[10px]" style={{ color: "#64748b" }}>—</div>
            ) : (
              (data.top_recurring || []).map((r: any) => (
                <div
                  key={`${r.room_no}-${r.category}`}
                  className="flex items-center justify-between text-[10px] py-0.5"
                >
                  <span className="text-white">Rm {r.room_no} · {r.category}</span>
                  <span style={{ color: r.count >= 4 ? RED : AMBER }} className="font-semibold">
                    {r.count}×
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Top assets */}
          <div>
            <div className="text-[9px] uppercase mb-1 flex items-center gap-1" style={{ color: "#94a3b8" }}>
              <Wrench size={9} /> Asset hotspots
            </div>
            {(data.top_assets || []).length === 0 ? (
              <div className="text-[10px]" style={{ color: "#64748b" }}>—</div>
            ) : (
              (data.top_assets || []).map((a: any) => (
                <div key={a.category} className="flex items-center justify-between text-[10px] py-0.5">
                  <span className="text-white capitalize">{a.category.replace(/_/g, " ")}</span>
                  <span style={{ color: AMBER }} className="font-semibold">
                    {a.count}× · ${fmt(a.avg_revenue_at_risk, 0)} avg
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Outlet drift */}
          <div>
            <div className="text-[9px] uppercase mb-1 flex items-center gap-1" style={{ color: "#94a3b8" }}>
              <TrendingUp size={9} /> Outlet drift
            </div>
            {(data.top_drift || []).length === 0 ? (
              <div className="text-[10px]" style={{ color: GREEN }}>✓ No drift</div>
            ) : (
              (data.top_drift || []).map((d: any) => (
                <div key={d.outlet_slug} className="flex items-center justify-between text-[10px] py-0.5">
                  <span className="text-white">{d.outlet_name || d.outlet_slug}</span>
                  <span style={{ color: RED }} className="font-semibold">+{d.drift_minutes}m</span>
                </div>
              ))
            )}
          </div>

          {/* Top repeat guests */}
          <div>
            <div className="text-[9px] uppercase mb-1 flex items-center gap-1" style={{ color: "#94a3b8" }}>
              <Users size={9} /> Repeat guests
            </div>
            {(data.top_repeat_guests || []).length === 0 ? (
              <div className="text-[10px]" style={{ color: "#64748b" }}>—</div>
            ) : (
              (data.top_repeat_guests || []).map((g: any) => (
                <div key={g.guest_name} className="flex items-center justify-between text-[10px] py-0.5">
                  <span className="text-white flex items-center gap-1">
                    {g.guest_name}
                    {g.vip && <Crown size={9} style={{ color: PURPLE }} />}
                  </span>
                  <span style={{ color: g.count >= 4 ? RED : AMBER }} className="font-semibold">
                    {g.count}×
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {variant === "compact" && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]" style={{ color: "#94a3b8" }}>
          {(data.top_recurring || []).slice(0, 2).map((r: any) => (
            <span key={`${r.room_no}-${r.category}`}>
              <span className="text-white">Rm {r.room_no}</span> · {r.category}{" "}
              <span style={{ color: AMBER }}>{r.count}×</span>
            </span>
          ))}
          {(data.top_drift || []).slice(0, 1).map((d: any) => (
            <span key={d.outlet_slug}>
              <span className="text-white">{d.outlet_name || d.outlet_slug}</span>{" "}
              <span style={{ color: RED }}>+{d.drift_minutes}m</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
