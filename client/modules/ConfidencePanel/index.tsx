import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield, AlertTriangle, BarChart3, Users, Package, Briefcase,
  UtensilsCrossed, Wine, FileText, Settings, Eye, TrendingUp,
  Database, RefreshCw, ChevronDown, Lightbulb, Activity
} from "lucide-react";

const API = window.location.origin;

const BG = "#04060d";
const SURFACE = "#0a0d17";
const SURFACE_EL = "#121624";
const GOLD = "#c8a97e";
const GOLD_M = "rgba(200,169,126,0.2)";
const GREEN = "#34d399";
const RED = "#ef4444";
const AMBER = "#fbbf24";
const BLUE = "#60a5fa";
const BORDER = "rgba(200,169,126,0.15)";
const TXT = "#ffffff";
const TXT2 = "#a1a1aa";
const TXT3 = "#71717a";
const MONO: React.CSSProperties = { fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace" };

const DOMAIN_ICON: Record<string, any> = {
  finance: BarChart3, events: Users, inventory: Package, labor: Briefcase,
  culinary: UtensilsCrossed, vendor: FileText, guest: Users, beverage: Wine,
  operations: Settings,
};
const STATUS_COLOR: Record<string, string> = {
  high: GREEN, moderate: AMBER, low: RED, blind_spot: "#ef4444",
};

function getConfidenceColor(value: number) {
  if (value >= 80) return GREEN;
  if (value >= 60) return AMBER;
  if (value >= 40) return "#fb923c";
  return RED;
}

/* ─── Domain Card ─── */
function DomainCard({ domain }: { domain: any }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = DOMAIN_ICON[domain.domain] || Settings;
  const color = getConfidenceColor(domain.confidence);

  return (
    <div className="rounded-sm overflow-hidden" style={{ background: SURFACE, border: `1px solid ${color}20` }}
      data-testid={`domain-${domain.domain}`}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="w-8 h-8 rounded-sm flex items-center justify-center" style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold" style={{ color: TXT }}>{domain.label}</div>
          <div className="text-[8px] uppercase tracking-[0.15em]" style={{ ...MONO, color: TXT3 }}>
            {domain.total_records} records | {domain.collections?.length || 0} collections
          </div>
        </div>
        {/* Confidence Ring */}
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg className="absolute inset-0" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
            <motion.circle cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="3"
              strokeDasharray={`${domain.confidence * 1.256} 125.6`}
              strokeLinecap="round"
              initial={{ strokeDasharray: "0 125.6" }}
              animate={{ strokeDasharray: `${domain.confidence * 1.256} 125.6` }}
              transition={{ duration: 1, ease: "easeOut" }}
              transform="rotate(-90 24 24)" />
          </svg>
          <span className="text-[11px] font-bold" style={{ ...MONO, color }}>{domain.confidence}%</span>
        </div>
        {/* Status Badge */}
        <div className="px-2 py-0.5 rounded-sm" style={{ background: `${STATUS_COLOR[domain.status]}10`, border: `1px solid ${STATUS_COLOR[domain.status]}25` }}>
          <span className="text-[8px] uppercase tracking-[0.15em] font-semibold" style={{ ...MONO, color: STATUS_COLOR[domain.status] }}>
            {domain.status}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "" : "-rotate-90"}`} style={{ color: TXT3 }} />
      </div>

      {expanded && (
        <div className="px-4 pb-3" style={{ borderTop: `1px solid ${BORDER}` }}>
          {/* Score Bars */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            {[
              { label: "Coverage", value: domain.coverage_score, color: getConfidenceColor(domain.coverage_score) },
              { label: "Freshness", value: domain.freshness_score, color: getConfidenceColor(domain.freshness_score) },
              { label: "Completeness", value: domain.completeness_score, color: getConfidenceColor(domain.completeness_score) },
            ].map(m => (
              <div key={m.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] uppercase tracking-[0.15em]" style={{ ...MONO, color: TXT3 }}>{m.label}</span>
                  <span className="text-[9px] font-semibold" style={{ ...MONO, color: m.color }}>{m.value}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background: m.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${m.value}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }} />
                </div>
              </div>
            ))}
          </div>

          {/* Collections */}
          <div className="mt-3 space-y-1">
            <span className="text-[8px] uppercase tracking-[0.2em]" style={{ ...MONO, color: TXT3 }}>Collections</span>
            {domain.collections?.map((c: any) => (
              <div key={c.collection} className="flex items-center gap-2 px-2 py-1" style={{ background: "rgba(255,255,255,0.02)" }}>
                <Database className="w-2.5 h-2.5" style={{ color: TXT3 }} />
                <span className="text-[9px] flex-1" style={{ ...MONO, color: TXT2 }}>{c.collection.replace(/_/g, " ")}</span>
                <span className="text-[9px]" style={{ ...MONO, color: TXT }}>{c.record_count}</span>
                <span className={`text-[7px] uppercase px-1.5 py-0.5 rounded-sm`} style={{
                  ...MONO,
                  color: c.freshness === "fresh" ? GREEN : c.freshness === "recent" ? BLUE : c.freshness === "aging" ? AMBER : c.freshness === "stale" ? RED : TXT3,
                  background: `${c.freshness === "fresh" ? GREEN : c.freshness === "recent" ? BLUE : c.freshness === "aging" ? AMBER : c.freshness === "stale" ? RED : TXT3}10`,
                }}>{c.freshness}</span>
              </div>
            ))}
          </div>

          {/* Blind Spots */}
          {domain.blind_spots?.length > 0 && (
            <div className="mt-2 space-y-1">
              <span className="text-[8px] uppercase tracking-[0.2em]" style={{ ...MONO, color: RED }}>Blind Spots</span>
              {domain.blind_spots.map((bs: string, i: number) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)" }}>
                  <AlertTriangle className="w-2.5 h-2.5 shrink-0" style={{ color: RED }} />
                  <span className="text-[9px]" style={{ color: TXT2 }}>{bs}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Panel ─── */
export default function ConfidencePanel() {
  const [heatmap, setHeatmap] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const [hm, rec, us] = await Promise.all([
        fetch(`${API}/api/echoai3/confidence/heatmap`).then(r => r.json()),
        fetch(`${API}/api/echoai3/confidence/recommendations`).then(r => r.json()),
        fetch(`${API}/api/echoai3/confidence/usage`).then(r => r.json()),
      ]);
      setHeatmap(hm);
      setRecommendations(rec.recommendations || []);
      setUsage(us);
    } catch { /* noop */ }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  if (loading || !heatmap) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: BG }}>
        <motion.div className="w-3 h-3 rounded-full" style={{ background: GOLD }}
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }} />
      </div>
    );
  }

  const platformColor = getConfidenceColor(heatmap.platform_confidence);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: BG, color: TXT }}
      data-testid="confidence-panel">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <Eye className="w-4 h-4" style={{ color: GOLD }} />
        <div className="flex-1">
          <div className="text-[12px] font-semibold tracking-tight">Confidence Visualization</div>
          <div className="text-[8px] uppercase tracking-[0.2em]" style={{ ...MONO, color: TXT3 }}>
            Domain Intelligence Coverage Map
          </div>
        </div>
        {/* Platform Score */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[8px] uppercase tracking-[0.15em]" style={{ ...MONO, color: TXT3 }}>Platform Confidence</div>
            <div className="text-[20px] font-bold" style={{ ...MONO, color: platformColor }}>{heatmap.platform_confidence}%</div>
          </div>
          <div className="px-2.5 py-1 rounded-sm" style={{ background: `${platformColor}10`, border: `1px solid ${platformColor}25` }}>
            <span className="text-[9px] uppercase font-semibold" style={{ ...MONO, color: platformColor }}>
              {heatmap.platform_status}
            </span>
          </div>
          <button onClick={refresh} className="p-1.5 hover:bg-white/5 transition-colors rounded-sm" data-testid="refresh-btn">
            <RefreshCw className="w-3.5 h-3.5" style={{ color: TXT3 }} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `${BORDER} transparent` }}>
        {/* Summary Bar */}
        <div className="px-5 py-3 grid grid-cols-5 gap-2" data-testid="summary-bar">
          {[
            { label: "High Confidence", value: heatmap.summary.high_confidence, color: GREEN, icon: Shield },
            { label: "Moderate", value: heatmap.summary.moderate_confidence, color: AMBER, icon: Activity },
            { label: "Low Confidence", value: heatmap.summary.low_confidence, color: RED, icon: AlertTriangle },
            { label: "Blind Spots", value: heatmap.summary.blind_spots, color: "#ef4444", icon: Eye },
            { label: "Total Data Points", value: heatmap.total_data_points.toLocaleString(), color: BLUE, icon: Database },
          ].map(m => (
            <div key={m.label} className="px-3 py-2 rounded-sm" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-1.5 mb-1">
                <m.icon className="w-3 h-3" style={{ color: m.color }} />
                <span className="text-[7px] uppercase tracking-[0.2em]" style={{ ...MONO, color: TXT3 }}>{m.label}</span>
              </div>
              <div className="text-[16px] font-bold" style={{ ...MONO, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Heatmap Grid */}
        <div className="px-5 pb-2">
          <div className="text-[8px] uppercase tracking-[0.25em] mb-2" style={{ ...MONO, color: TXT3 }}>Domain Confidence Heatmap</div>
          <div className="grid grid-cols-3 gap-2" data-testid="heatmap-grid">
            {heatmap.domains?.map((d: any) => (
              <DomainCard key={d.domain} domain={d} />
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="px-5 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-3.5 h-3.5" style={{ color: GOLD }} />
              <span className="text-[8px] uppercase tracking-[0.25em]" style={{ ...MONO, color: GOLD }}>Recommendations to Improve Confidence</span>
            </div>
            <div className="space-y-1.5" data-testid="recommendations">
              {recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-sm" style={{
                  background: SURFACE,
                  border: `1px solid ${r.priority === "critical" ? RED : r.priority === "high" ? AMBER : BORDER}20`,
                }}>
                  <span className="text-[8px] uppercase font-bold px-1.5 py-0.5 rounded-sm shrink-0 mt-0.5" style={{
                    ...MONO,
                    color: r.priority === "critical" ? RED : r.priority === "high" ? AMBER : GREEN,
                    background: `${r.priority === "critical" ? RED : r.priority === "high" ? AMBER : GREEN}10`,
                  }}>{r.priority}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold" style={{ color: TXT }}>{r.label} — {r.confidence}%</div>
                    <div className="text-[9px] mt-0.5" style={{ color: TXT2 }}>{r.action}</div>
                    <div className="text-[8px] mt-0.5" style={{ ...MONO, color: TXT3 }}>{r.impact}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Stats */}
        {usage && (
          <div className="px-5 py-3" data-testid="usage-stats">
            <div className="text-[8px] uppercase tracking-[0.25em] mb-2" style={{ ...MONO, color: TXT3 }}>AI Usage Intelligence</div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Sessions", value: usage.total_sessions, color: BLUE },
                { label: "Feedback", value: usage.feedback_count, color: GOLD },
                { label: "Avg Rating", value: usage.avg_rating ? `${usage.avg_rating}/5` : "N/A", color: usage.avg_rating >= 4 ? GREEN : AMBER },
                { label: "Satisfaction", value: `${usage.satisfaction_score}%`, color: usage.satisfaction_score >= 80 ? GREEN : AMBER },
              ].map(m => (
                <div key={m.label} className="px-3 py-2 rounded-sm text-center" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div className="text-[7px] uppercase tracking-[0.2em]" style={{ ...MONO, color: TXT3 }}>{m.label}</div>
                  <div className="text-[14px] font-bold mt-0.5" style={{ ...MONO, color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
