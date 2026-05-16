import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield, AlertTriangle, Lock, Eye, Activity, Radio, Siren,
  RefreshCw, ChevronDown, Database, Globe, Fingerprint,
  ShieldAlert, ShieldCheck, ShieldOff, Flame, Radar
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

const DEFCON_COLORS: Record<number, string> = { 1: RED, 2: "#f97316", 3: AMBER, 4: BLUE, 5: GREEN };
const SEVERITY_COLOR: Record<string, string> = { critical: RED, high: "#f97316", medium: AMBER, low: BLUE };

function GuardianBadge({ name, status, detail }: { name: string; status: string; detail?: string }) {
  const color = status === "active" || status === "ACTIVE" ? GREEN : status.includes("ALERT") ? RED : AMBER;
  return (
    <div className="px-3 py-2.5 rounded-sm" style={{ background: SURFACE, border: `1px solid ${color}20` }}
      data-testid={`guardian-${name.toLowerCase()}`}>
      <div className="flex items-center gap-2 mb-1">
        <motion.div className="w-2 h-2 rounded-full" style={{ background: color }}
          animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
        <span className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ ...MONO, color }}>{name}</span>
      </div>
      <div className="text-[8px]" style={{ ...MONO, color: TXT3 }}>{status}</div>
      {detail && <div className="text-[8px] mt-0.5" style={{ ...MONO, color: TXT2 }}>{detail}</div>}
    </div>
  );
}

export default function ZAROGuardianPanel() {
  const [status, setStatus] = useState<any>(null);
  const [scan, setScan] = useState<any>(null);
  const [posture, setPosture] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIncidents, setShowIncidents] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [st, sc, po, inc] = await Promise.all([
        fetch(`${API}/api/zaro/status`).then(r => r.json()),
        fetch(`${API}/api/zaro/scan`).then(r => r.json()),
        fetch(`${API}/api/zaro/security-posture`).then(r => r.json()),
        fetch(`${API}/api/zaro/incidents?limit=10`).then(r => r.json()),
      ]);
      setStatus(st);
      setScan(sc);
      setPosture(po);
      setIncidents(inc.incidents || []);
    } catch { /* noop */ }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  if (loading || !status) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: BG }}>
        <motion.div className="w-3 h-3 rounded-full" style={{ background: RED }}
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }} />
      </div>
    );
  }

  const defconColor = DEFCON_COLORS[scan?.defcon_level || 5] || GREEN;
  const scoreColor = (posture?.security_score || 0) >= 90 ? GREEN : (posture?.security_score || 0) >= 70 ? AMBER : RED;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: BG, color: TXT }} data-testid="zaro-panel">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="relative">
          <motion.div className="w-8 h-8 rounded-sm flex items-center justify-center"
            style={{ background: `${RED}10`, border: `1px solid ${RED}25` }}
            animate={{ boxShadow: [`0 0 0px rgba(239,68,68,0)`, `0 0 15px rgba(239,68,68,0.15)`, `0 0 0px rgba(239,68,68,0)`] }}
            transition={{ duration: 3, repeat: Infinity }}>
            <Shield className="w-4 h-4" style={{ color: RED }} />
          </motion.div>
        </div>
        <div className="flex-1">
          <div className="text-[12px] font-semibold tracking-tight">ZARO Guardian — Red Phoenix</div>
          <div className="text-[8px] uppercase tracking-[0.2em]" style={{ ...MONO, color: TXT3 }}>
            Military-Grade Operational Safety Layer
          </div>
        </div>

        {/* DEFCON Badge */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-sm" style={{ background: `${defconColor}10`, border: `1px solid ${defconColor}30` }}>
            <div className="text-[7px] uppercase tracking-[0.2em]" style={{ ...MONO, color: TXT3 }}>DEFCON</div>
            <div className="text-[18px] font-black text-center" style={{ ...MONO, color: defconColor }}>{scan?.defcon_level || 5}</div>
            <div className="text-[7px] uppercase text-center" style={{ ...MONO, color: defconColor }}>{scan?.defcon_label}</div>
          </div>

          {/* Security Score */}
          <div className="text-right">
            <div className="text-[7px] uppercase tracking-[0.2em]" style={{ ...MONO, color: TXT3 }}>Security Score</div>
            <div className="text-[22px] font-bold" style={{ ...MONO, color: scoreColor }}>{posture?.security_score || 0}</div>
            <div className="text-[9px] font-bold" style={{ ...MONO, color: scoreColor }}>Grade {posture?.grade || "?"}</div>
          </div>

          <button onClick={refresh} className="p-1.5 hover:bg-white/5 transition-colors rounded-sm" data-testid="refresh-zaro">
            <RefreshCw className="w-3.5 h-3.5" style={{ color: TXT3 }} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3" style={{ scrollbarWidth: "thin", scrollbarColor: `${BORDER} transparent` }}>
        {/* Guardian Subsystems Grid */}
        <div>
          <div className="text-[8px] uppercase tracking-[0.25em] mb-2" style={{ ...MONO, color: TXT3 }}>Guardian Subsystems</div>
          <div className="grid grid-cols-5 gap-2" data-testid="guardian-grid">
            <GuardianBadge name="SENTINEL" status={status.guardians.sentinel.status}
              detail={`${status.guardians.sentinel.blocked_ips} blocked IPs | ${status.guardians.sentinel.total_strikes} strikes`} />
            <GuardianBadge name="AEGIS" status={status.guardians.aegis.status}
              detail={`${status.guardians.aegis.pii_patterns} PII patterns | ${status.guardians.aegis.sensitive_fields} fields`} />
            <GuardianBadge name="CERBERUS" status={status.guardians.cerberus.status}
              detail={`${status.guardians.cerberus.active_lockouts} lockouts | ${status.guardians.cerberus.recent_failed_logins} failures`} />
            <GuardianBadge name="HEIMDALL" status={status.guardians.heimdall.status}
              detail={`${status.guardians.heimdall.requests_tracked} tracked | ${status.guardians.heimdall.anomalies} anomalies`} />
            <GuardianBadge name="VALKYRIE" status={status.guardians.valkyrie.status}
              detail={`${status.guardians.valkyrie.open_incidents} open incidents`} />
          </div>
        </div>

        {/* Security Posture Components */}
        <div>
          <div className="text-[8px] uppercase tracking-[0.25em] mb-2" style={{ ...MONO, color: TXT3 }}>Security Posture</div>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(posture?.components || {}).map(([key, val]) => {
              const v = val as string;
              const isGood = v === "ACTIVE" || v === "CLEAR" || v === "NOMINAL";
              return (
                <div key={key} className="px-3 py-2 rounded-sm" style={{ background: SURFACE, border: `1px solid ${isGood ? GREEN : RED}15` }}>
                  <div className="text-[8px] uppercase tracking-[0.15em]" style={{ ...MONO, color: TXT3 }}>{key.replace(/_/g, " ")}</div>
                  <div className="text-[9px] font-semibold mt-0.5" style={{ ...MONO, color: isGood ? GREEN : RED }}>{v}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Red Phoenix Alerts */}
        {scan && scan.alerts && scan.alerts.length > 0 && (
          <div data-testid="phoenix-alerts">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-3.5 h-3.5" style={{ color: RED }} />
              <span className="text-[8px] uppercase tracking-[0.25em] font-bold" style={{ ...MONO, color: RED }}>
                Red Phoenix Alerts ({scan.total_alerts})
              </span>
              <span className="text-[8px] px-2 py-0.5 rounded-sm" style={{
                ...MONO,
                color: defconColor,
                background: `${defconColor}10`,
                border: `1px solid ${defconColor}25`,
              }}>DEFCON {scan.defcon_level}: {scan.defcon_label}</span>
            </div>
            <div className="space-y-1.5">
              {scan.alerts.map((alert: any, i: number) => (
                <div key={i} className="rounded-sm overflow-hidden" style={{
                  background: SURFACE,
                  border: `1px solid ${SEVERITY_COLOR[alert.severity] || BORDER}20`,
                }}>
                  <div className="flex items-start gap-3 px-3 py-2.5">
                    <div className="shrink-0 mt-0.5">
                      {alert.severity === "critical" ? <Siren className="w-3.5 h-3.5" style={{ color: RED }} /> :
                       alert.severity === "high" ? <AlertTriangle className="w-3.5 h-3.5" style={{ color: AMBER }} /> :
                       <Activity className="w-3.5 h-3.5" style={{ color: BLUE }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[8px] uppercase font-bold px-1.5 py-0.5 rounded-sm" style={{
                          ...MONO,
                          color: SEVERITY_COLOR[alert.severity] || TXT3,
                          background: `${SEVERITY_COLOR[alert.severity] || TXT3}10`,
                        }}>{alert.severity}</span>
                        <span className="text-[8px] uppercase tracking-[0.15em]" style={{ ...MONO, color: TXT3 }}>{alert.category}</span>
                      </div>
                      <div className="text-[10px] font-semibold" style={{ color: TXT }}>{alert.signal}</div>
                      <div className="text-[9px] mt-1 px-2 py-1.5 rounded-sm" style={{
                        background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.04)`,
                        color: TXT2,
                      }}>{alert.corrective_action}</div>
                      {alert.escalate_to && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[7px] uppercase" style={{ ...MONO, color: TXT3 }}>Escalate to:</span>
                          {alert.escalate_to.map((r: string) => (
                            <span key={r} className="text-[7px] px-1.5 py-0.5 rounded-sm" style={{
                              ...MONO, color: GOLD, background: GOLD_M,
                            }}>{r}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {scan && scan.alerts && scan.alerts.length === 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-sm" style={{ background: `${GREEN}05`, border: `1px solid ${GREEN}15` }}
            data-testid="all-clear">
            <ShieldCheck className="w-5 h-5" style={{ color: GREEN }} />
            <div>
              <div className="text-[11px] font-semibold" style={{ color: GREEN }}>All Clear — No Active Threats</div>
              <div className="text-[9px]" style={{ ...MONO, color: TXT3 }}>All operational systems within normal parameters</div>
            </div>
          </div>
        )}

        {/* Incidents */}
        <div>
          <button onClick={() => setShowIncidents(!showIncidents)}
            className="flex items-center gap-2 w-full text-left" data-testid="toggle-incidents">
            <span className="text-[8px] uppercase tracking-[0.25em]" style={{ ...MONO, color: TXT3 }}>
              Security Incidents ({incidents.length})
            </span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showIncidents ? "" : "-rotate-90"}`} style={{ color: TXT3 }} />
          </button>
          {showIncidents && (
            <div className="space-y-1 mt-2">
              {incidents.length === 0 ? (
                <div className="text-[9px] px-3 py-2" style={{ ...MONO, color: TXT3 }}>No security incidents recorded</div>
              ) : (
                incidents.map((inc, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-sm" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                    <span className="text-[8px] font-bold px-1.5 py-0.5" style={{
                      ...MONO,
                      color: inc.severity === "P1" ? RED : inc.severity === "P2" ? AMBER : GREEN,
                      background: `${inc.severity === "P1" ? RED : inc.severity === "P2" ? AMBER : GREEN}10`,
                    }}>{inc.severity}</span>
                    <span className="text-[9px] flex-1 truncate" style={{ color: TXT2 }}>{inc.source}: {inc.threat_level}</span>
                    <span className="text-[8px]" style={{ ...MONO, color: TXT3 }}>{inc.status}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
