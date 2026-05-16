/**
 * Echo AI³ Enhanced - Sentient Intelligence Component
 * Complete implementation of the Echo AI³ design with:
 * - Animated canvas-based orb
 * - Gold glassmorphism theme
 * - Voice recognition & waveforms
 * - Real-time telemetry dashboard
 * - Custom cursor styling
 * - Smooth animations & transitions
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/glass";
import { Mic, X, Send, AlertCircle, Maximize2, Minimize2, Activity } from "lucide-react";
import { useEchoSystem } from "@/lib/hooks/use-echo-system";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface OrbState {
  state: "DORMANT" | "AWAKENING" | "AWARE" | "THINKING" | "SPEAKING" | "ALERT" | "LISTENING";
  label: string;
  color: [number, number, number]; // RGB
}

interface TelemetryMetric {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
}

// ============================================================================
// Constants & Configuration
// ============================================================================

const ORB_STATES: Record<OrbState["state"], OrbState> = {
  DORMANT: { state: "DORMANT", label: "SYSTEM INITIALIZING", color: [90, 70, 25] },
  AWAKENING: { state: "AWAKENING", label: "NEURAL PATHWAYS FORMING", color: [170, 130, 45] },
  AWARE: { state: "AWARE", label: "NETWORK NOMINAL · 847 NODES ACTIVE", color: [201, 168, 76] },
  THINKING: { state: "THINKING", label: "PROCESSING · CROSS-REFERENCING LIVE DATA", color: [90, 155, 255] },
  SPEAKING: { state: "SPEAKING", label: "TRANSMITTING · ENCRYPTED", color: [235, 205, 75] },
  ALERT: { state: "ALERT", label: "⚠ ANOMALY DETECTED", color: [255, 75, 75] },
  LISTENING: { state: "LISTENING", label: "◉ LISTENING — SPEAK NOW", color: [255, 120, 60] },
};

// ============================================================================
// Canvas Orb Renderer
// ============================================================================

const OrbRenderer: React.FC<{
  canvasRef: React.RefObject<HTMLCanvasElement>;
  orbState: OrbState;
  isAnimating: boolean;
}> = ({ canvasRef, orbState, isAnimating }) => {
  const animationRef = useRef<number>();
  const particlesRef = useRef<any[]>([]);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initialize particles if needed
    if (particlesRef.current.length === 0) {
      particlesRef.current = Array.from({ length: 80 }, () => ({
        angle: Math.random() * Math.PI * 2,
        baseR: 15 + Math.random() * 50,
        speed: (0.003 + Math.random() * 0.007) * (Math.random() > 0.5 ? 1 : -1),
        phase: Math.random() * Math.PI * 2,
        size: 0.55 + Math.random() * 1.5,
      }));
    }

    const animate = () => {
      const now = Date.now();
      const elapsed = (now - startTimeRef.current) / 1000;
      
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw background
      const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, width * 0.7);
      bgGradient.addColorStop(0, "rgba(9, 11, 24, 1)");
      bgGradient.addColorStop(1, "rgba(2, 3, 8, 1)");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Draw orb atmosphere
      const [r, g, b] = orbState.color;
      const atmGradient = ctx.createRadialGradient(centerX, centerY, 18, centerX, centerY, 86);
      atmGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
      atmGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.065)`);
      atmGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = atmGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 86, 0, Math.PI * 2);
      ctx.fill();

      // Draw rings
      const rings = [
        { rx: 65, ry: 20, rot: elapsed * 0.11 },
        { rx: 54, ry: 14, rot: -elapsed * 0.19 + 0.7 },
        { rx: 75, ry: 10, rot: elapsed * 0.07 + 2.1 },
      ];

      rings.forEach((ring) => {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(ring.rot);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.22)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, ring.rx, ring.ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // Draw particles
      for (const p of particlesRef.current) {
        p.angle += p.speed;
        const w = Math.sin(elapsed * 1.9 + p.phase) * 4.5;
        p.x = centerX + Math.cos(p.angle) * (p.baseR + w);
        p.y = centerY + Math.cos(p.angle + p.phase) * ((p.baseR + w) * 0.38);
      }

      // Draw particle connections
      for (let i = 0; i < particlesRef.current.length; i++) {
        const a = particlesRef.current[i];
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const b = particlesRef.current[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 27) {
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(1 - d / 27) * 0.33})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particlesRef.current) {
        const fl = 0.45 + 0.55 * Math.sin(elapsed * 3.6 + p.phase);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${fl * 0.88})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw core
      for (let l = 3; l >= 0; l--) {
        const lr = 7 + l * 8;
        const la = [0.78, 0.5, 0.23, 0.09][l];
        const cg = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, lr);
        cg.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${la})`);
        cg.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(centerX, centerY, lr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw iris
      if (orbState.state !== "DORMANT") {
        const irisR = 10 + Math.sin(elapsed * 3.5) * 1.8;
        const segs = orbState.state === "THINKING" ? 8 : 6;
        for (let s = 0; s < segs; s++) {
          const sa = (s / segs) * Math.PI * 2 + elapsed * 0.44;
          const ea = sa + (Math.PI * 2) / segs - 0.28;
          ctx.strokeStyle = "rgba(3, 4, 10, 0.93)";
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, irisR, sa, ea);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(3, 4, 10, 0.96)";
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.92)`;
        ctx.beginPath();
        ctx.arc(centerX - 1.5, centerY - 1.5, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [orbState, canvasRef]);

  return null;
};

// ============================================================================
// Main Component
// ============================================================================

export function EchoAI3Enhanced() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [orbState, setOrbState] = useState<OrbState>(ORB_STATES.DORMANT);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [inputValue, setInputValue] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // iter263.3 · expand-to-large state and WS-driven live activity stream
  const [expanded, setExpanded] = useState(false);
  const [wsEvents, setWsEvents] = useState<Array<{ type: string; data: any; ts: number }>>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to system-wide awareness
  const {
    systemState,
    recentEvents,
    activeAlerts,
    systemHealth,
    getAwarenessText,
    shouldAlertUser,
  } = useEchoSystem();

  // Initialize orb animation sequence
  useEffect(() => {
    setOrbState(ORB_STATES.DORMANT);
    const timer1 = setTimeout(() => setOrbState(ORB_STATES.AWAKENING), 700);
    const timer2 = setTimeout(() => setOrbState(ORB_STATES.AWARE), 2200);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Update orb state based on system health
  useEffect(() => {
    if (!panelOpen && systemHealth) {
      if (shouldAlertUser()) {
        setOrbState(ORB_STATES.ALERT);
      } else if (systemHealth === 'critical') {
        setOrbState(ORB_STATES.ALERT);
      } else if (systemHealth === 'warning') {
        setOrbState(ORB_STATES.THINKING);
      } else {
        setOrbState(ORB_STATES.AWARE);
      }
    }
  }, [systemHealth, shouldAlertUser, panelOpen]);

  // iter263.4 · Hide the Echo AI³ orb on PUBLIC guest pages (/ird/* /spa/*)
  // so it doesn't overlap the cart submit button on mobile.
  // (placed AFTER all hooks above to respect rules-of-hooks)

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  // iter263.3 · WebSocket subscription for live activity events.
  // Consumes the same /ws stream as Enterprise Command Center so any
  // event_bus.publish (BEO planner, vendor scorecard, purchrec, admin) shows
  // up here without overwriting the existing system-awareness panel.
  useEffect(() => {
    if (!panelOpen) return;  // only connect when drawer is open
    let alive = true;
    let ws: WebSocket | null = null;
    let reconnect: any = null;

    const connect = () => {
      try {
        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        ws = new WebSocket(`${proto}//${window.location.host}/ws`);
        ws.onopen = () => alive && setWsConnected(true);
        ws.onclose = () => {
          if (!alive) return;
          setWsConnected(false);
          reconnect = setTimeout(connect, 4000);
        };
        ws.onerror = () => alive && setWsConnected(false);
        ws.onmessage = (e) => {
          if (!alive) return;
          try {
            const msg = JSON.parse(e.data);
            if (msg && msg.type) {
              setWsEvents(prev => [{ type: msg.type, data: msg.data || msg.payload || {}, ts: Date.now() }, ...prev].slice(0, 40));
            }
          } catch { /* ignore */ }
        };
      } catch { /* ignore */ }
    };
    connect();
    return () => { alive = false; if (reconnect) clearTimeout(reconnect); try { ws?.close(); } catch { /* */ } };
  }, [panelOpen]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setOrbState(ORB_STATES.THINKING);
    setIsLoading(true);

    try {
      // Send to Echo AI³ backend
      const response = await fetch("/api/echo-ai3/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data.text || "..." }]);
        setOrbState(ORB_STATES.SPEAKING);
        setTimeout(() => setOrbState(ORB_STATES.AWARE), 3000);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Error processing request" }]);
      }
    } catch (error) {
      console.error("[Echo AI³] Error:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Network error" }]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, messages]);

  // iter263.4 · Hide on public guest pages (/ird, /spa, /g/) — placed AFTER
  // all hooks to obey rules-of-hooks.
  const _path = typeof window !== "undefined" ? window.location.pathname : "";
  if (_path.startsWith("/ird") || _path.startsWith("/spa") || _path.startsWith("/g/")) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Floating Orb */}
      <div className="fixed bottom-12 right-12 pointer-events-auto">
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="group relative w-40 h-40 rounded-full bg-gradient-to-b from-gray-900 to-black shadow-2xl hover:shadow-[0_0_40px_rgba(201,168,76,0.4)] transition-all duration-300 border border-amber-900/30"
        >
          <canvas
            ref={canvasRef}
            width={160}
            height={160}
            className="absolute inset-0 w-full h-full rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-amber-700/60 group-hover:text-amber-600/80 transition-colors">
            {panelOpen ? "CLOSE" : "CLICK"}
          </div>
        </button>

        {/* Hint below orb */}
        <div className="text-center mt-4 text-xs font-mono text-amber-700/40 pointer-events-none">
          CLICK · HOLD MIC · TYPE
        </div>
      </div>

      {/* State Label */}
      {panelOpen && (
        <div className="fixed bottom-52 right-12 text-xs font-mono text-amber-600 animate-pulse">
          {orbState.label}
        </div>
      )}

      {/* Main Panel */}
      {panelOpen && (
        <div
          data-testid="echo-ai-drawer"
          className={cn(
            "fixed bottom-0 right-0 h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black border-l border-amber-900/20 flex flex-col backdrop-blur-2xl shadow-2xl pointer-events-auto transition-[width] duration-300",
            expanded ? "w-[80vw]" : "w-[520px]",
          )}
          style={{ maxWidth: "100vw" }}
        >
          {/* Header */}
          <div className="px-6 py-6 border-b border-amber-900/10 flex-shrink-0">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-amber-400 tracking-wider">ECHO AI³</h1>
                <p className="text-xs font-mono text-amber-700/60 mt-2">
                  ECHOAURUM NEURAL INTELLIGENCE
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  data-testid="echo-ai-drawer-expand"
                  onClick={() => setExpanded(v => !v)}
                  title={expanded ? "Compact view" : "Expand to wide view"}
                  className="p-2 hover:bg-amber-900/20 rounded-lg transition-colors text-amber-700/60 hover:text-amber-400"
                >
                  {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="p-2 hover:bg-amber-900/20 rounded-lg transition-colors text-amber-700/60 hover:text-amber-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                activeAlerts.length > 0 ? 'bg-red-500' : 'bg-emerald-500'
              )} />
              <span className={cn(
                activeAlerts.length > 0 ? 'text-red-500' : 'text-emerald-500'
              )}>
                {activeAlerts.length > 0
                  ? `⚠ ${activeAlerts.length} ALERT${activeAlerts.length > 1 ? 'S' : ''} · CRITICAL`
                  : 'ONLINE · ALL SYSTEMS NOMINAL'}
              </span>
            </div>
          </div>

          {/* Telemetry Grid - System-Aware Metrics */}
          <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-amber-900/10 text-center">
            <div>
              <div className="text-xs font-mono text-amber-700/60 mb-1">SYSTEM HEALTH</div>
              <div className={cn(
                "text-sm font-mono font-bold",
                systemHealth === 'healthy' ? 'text-emerald-400' :
                systemHealth === 'warning' ? 'text-amber-400' :
                'text-red-400'
              )}>
                {systemHealth?.toUpperCase() || 'INITIALIZING'}
              </div>
            </div>
            <div>
              <div className="text-xs font-mono text-amber-700/60 mb-1">ACTIVE MODULES</div>
              <div className="text-sm font-mono text-blue-400 font-bold">
                {systemState?.globalMetrics.activeOperations || 0}/11
              </div>
            </div>
            <div>
              <div className="text-xs font-mono text-amber-700/60 mb-1">CRITICAL ALERTS</div>
              <div className={cn(
                "text-sm font-mono font-bold",
                activeAlerts.length > 0 ? 'text-red-400' : 'text-emerald-400'
              )}>
                {activeAlerts.length > 0 ? activeAlerts.length : '0'}
              </div>
            </div>
          </div>

          {/* iter263.3 · Live Activity Stream — pulls from /ws (event_bus) so
              every BEO planned, vendor violation, PO cut, admin rollout, support
              ticket lights up here in real time. Adds, never replaces, the
              existing System Awareness panel below. */}
          <div data-testid="echo-ai-live-activity" className="px-6 py-3 border-b border-amber-900/10">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-mono text-amber-700/70 flex items-center gap-2">
                <Activity className="w-3 h-3" />
                LIVE ACTIVITY STREAM
              </div>
              <span className={cn(
                "text-[10px] font-mono",
                wsConnected ? "text-emerald-400" : "text-amber-700/40"
              )}>
                {wsConnected ? "● CONNECTED" : "○ RECONNECTING"}
              </span>
            </div>
            <div className={cn(
              "space-y-1 overflow-y-auto pr-1",
              expanded ? "max-h-[28vh]" : "max-h-40",
            )}>
              {wsEvents.length === 0 ? (
                <div className="text-[11px] font-mono text-amber-700/40 py-2">
                  Waiting for live events from BEO Planner, Vendor Scorecard, PurchRec, Admin…
                </div>
              ) : (
                wsEvents.slice(0, expanded ? 30 : 8).map((ev, i) => {
                  const ago = Math.max(0, Math.round((Date.now() - ev.ts) / 1000));
                  const agoStr = ago < 60 ? `${ago}s` : `${Math.floor(ago / 60)}m`;
                  const c = ev.type.startsWith("beo.") ? "text-purple-300"
                          : ev.type.startsWith("vendor.") ? "text-blue-300"
                          : ev.type.startsWith("purchrec.") ? "text-emerald-300"
                          : ev.type.startsWith("admin.") ? "text-amber-300"
                          : "text-gray-300";
                  return (
                    <div key={i} className={cn("text-[11px] font-mono flex items-center gap-2 py-1 px-2 rounded", i === 0 ? "bg-amber-900/10" : "")}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", i === 0 ? "bg-amber-400 animate-pulse" : "bg-gray-700")} />
                      <span className={c}>{ev.type}</span>
                      <span className="text-amber-700/50 truncate flex-1">
                        {(() => {
                          const d = ev.data || {};
                          if (ev.type === "beo.planned") return `${d.event_name || d.beo_id} · ${d.guest_count || "?"}g · ${(d.elapsed_ms / 1000).toFixed(1)}s`;
                          if (ev.type === "beo.day_planned") return `${d.date} · ${d.beo_count} BEOs · ${d.collisions} collisions · load ${(d.load_score * 100 || 0).toFixed(0)}%`;
                          if (ev.type === "vendor.contract_violation") return `${d.violations} violations · $${d.estimated_overcharge_usd}`;
                          if (ev.type === "purchrec.match_resolved") return `${d.po_id} resolved`;
                          if (ev.type === "purchrec.auto_po_created") return `${d.count} POs · $${d.total_amount}`;
                          if (ev.type === "admin.support_ticket") return `${d.subject} · ${d.severity}`;
                          if (ev.type === "admin.rollout") return `v${d.target_version} · ${d.percent}%`;
                          if (ev.type === "admin.flag_update") return `${d.flag} → ${d.enabled ? "ON" : "OFF"}`;
                          return JSON.stringify(d).slice(0, 80);
                        })()}
                      </span>
                      <span className="text-amber-700/40 whitespace-nowrap">{agoStr}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* System Status - Live Module Awareness */}
          {systemState && (
            <div className="px-6 py-3 border-b border-amber-900/10 max-h-64 overflow-y-auto">
              <div className="text-xs font-mono text-amber-700/70 mb-3">◈ SYSTEM AWARENESS</div>
              <div className="space-y-2">
                {/* Show recent system events */}
                {recentEvents.slice(0, 4).map((event, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "text-xs p-2 rounded border",
                      event.severity === 'critical'
                        ? 'bg-red-900/20 border-red-900/40 text-red-300'
                        : event.severity === 'warning'
                        ? 'bg-amber-900/20 border-amber-900/40 text-amber-300'
                        : 'bg-blue-900/20 border-blue-900/40 text-blue-300'
                    )}
                  >
                    <div className="font-mono">
                      {event.module.toUpperCase()}: {event.title}
                    </div>
                    <div className="text-xs opacity-75 mt-1">{event.message}</div>
                  </div>
                ))}

                {/* Show active module status */}
                <div className="mt-4 pt-4 border-t border-amber-900/10">
                  <div className="text-xs font-mono text-amber-700/70 mb-2">MODULES ACTIVE</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(systemState.modules)
                      .filter(([_, m]) => m.active)
                      .slice(0, 6)
                      .map(([name, module]) => (
                        <div
                          key={name}
                          className="text-xs p-2 rounded bg-gray-900/40 border border-gray-800/40 text-emerald-300 font-mono"
                        >
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            {name.toUpperCase()}
                          </div>
                          {Object.entries(module.metrics)
                            .slice(0, 2)
                            .map(([key, val]) => (
                              <div key={key} className="text-xs opacity-75 ml-4">
                                {key}: {typeof val === 'number' ? val.toFixed(1) : val}
                              </div>
                            ))}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Show active alerts if any */}
                {activeAlerts.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-red-900/30">
                    <div className="text-xs font-mono text-red-400 mb-2">⚠ CRITICAL ISSUES</div>
                    {activeAlerts.map((alert, idx) => (
                      <div key={idx} className="text-xs text-red-300 mb-1.5 p-2 bg-red-900/10 rounded border border-red-900/20">
                        <div className="font-mono">{alert.title}</div>
                        <div className="opacity-75 mt-1">{alert.message}</div>
                        {alert.suggestedAction && (
                          <div className="text-red-200 mt-1.5 italic text-xs">
                            → {alert.suggestedAction}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-8">
                <div className="text-4xl opacity-30 animate-pulse">◈</div>

                {/* System Awareness Summary */}
                <div className="space-y-3 max-w-sm">
                  <div className="text-sm font-mono text-amber-400 font-bold">
                    {getAwarenessText()}
                  </div>

                  {/* Module Status Summary */}
                  {systemState && (
                    <div className="text-xs font-mono text-blue-300/70">
                      {systemState.globalMetrics.activeOperations > 0 && (
                        <div>
                          {systemState.globalMetrics.activeOperations} modules actively reporting
                        </div>
                      )}
                      {systemState.modules.culinary.active && (
                        <div className="mt-1">
                          <span className="text-amber-300">Culinary:</span> {systemState.modules.culinary.metrics.foodCostPercent?.toFixed(1)}% food cost
                        </div>
                      )}
                      {systemState.modules.labor.active && (
                        <div className="mt-1">
                          <span className="text-emerald-300">Labor:</span> {systemState.modules.labor.metrics.efficiency?.toFixed(0)}% efficiency
                        </div>
                      )}
                      {systemState.modules.pos.active && (
                        <div className="mt-1">
                          <span className="text-blue-300">POS:</span> {systemState.modules.pos.metrics.covers} covers today
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Prompt for User */}
                <div className="text-xs font-mono text-amber-700/60 leading-relaxed">
                  SPEAK, TYPE, OR USE A QUICK COMMAND
                </div>

                {/* Critical Alerts Display */}
                {activeAlerts.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-red-900/30 text-left w-full">
                    <div className="text-xs text-red-400 font-mono font-bold mb-3">⚠ {activeAlerts.length} CRITICAL ALERT{activeAlerts.length > 1 ? 'S' : ''}</div>
                    {activeAlerts.slice(0, 3).map((alert, idx) => (
                      <div key={idx} className="text-xs text-red-300/80 mb-2 p-2 bg-red-900/10 rounded border border-red-900/20">
                        <div className="font-bold text-red-400">{alert.title}</div>
                        <div className="mt-1">{alert.message}</div>
                        {alert.suggestedAction && (
                          <div className="text-red-200 mt-2 italic text-xs">
                            → {alert.suggestedAction}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-2",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-xs px-4 py-2 rounded-2xl text-sm font-mono",
                        msg.role === "user"
                          ? "bg-amber-900/30 text-amber-100 border border-amber-700/30"
                          : "bg-blue-900/20 text-blue-100 border border-blue-700/30"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="px-4 py-2 text-xs font-mono text-amber-600/60">
                      ◈ PROCESSING...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Quick Module Access */}
          {systemState && (
            <div className="px-6 py-3 border-t border-amber-900/10 flex-shrink-0">
              <div className="text-xs font-mono text-amber-700/60 mb-2">QUICK ACCESS</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(systemState.modules)
                  .filter(([_, m]) => m.active)
                  .map(([name]) => (
                    <button
                      key={name}
                      onClick={() => setInputValue(`Show me ${name} status`)}
                      className="text-xs font-mono px-3 py-1.5 rounded bg-amber-900/20 border border-amber-700/30 text-amber-300 hover:bg-amber-900/40 hover:border-amber-500/40 transition-colors"
                    >
                      {name.toUpperCase()}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-6 py-4 border-t border-amber-900/10 flex-shrink-0 flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="TYPE A COMMAND..."
              className="flex-1 bg-amber-900/10 border border-amber-700/20 rounded-full px-4 py-2 text-sm font-mono text-amber-100 placeholder:text-amber-700/40 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="px-4 py-2 bg-amber-900/30 hover:bg-amber-900/50 border border-amber-700/30 hover:border-amber-500/40 rounded-full text-xs font-mono text-amber-400 disabled:opacity-50 transition-colors"
            >
              SEND ↵
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EchoAI3Enhanced;
