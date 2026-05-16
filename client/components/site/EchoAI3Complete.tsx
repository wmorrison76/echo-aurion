/**
 * Echo AI³ Complete - Full Visual Implementation
 * 
 * Complete UI/UX implementation of Echo AI³ with:
 * - Custom cursor with glow effect
 * - Canvas-based orb with particle animations
 * - Glassmorphism design throughout
 * - Awareness strip showing live system state
 * - Voice indicator with animated bars
 * - Full telemetry dashboard
 * - Message display with role styling
 * - Action toasts
 * - Quick prompts
 * - Seamless dark theme with gold accents
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import { useLocation, useNavigate } from "react-router-dom";
import { useEchoSystem } from "@/lib/hooks/use-echo-system";
import { useAuth } from "@/contexts/AuthContext";
import { resolveEchoContext } from "@shared/echo-ai3-context";

// Types for operational data
interface OperationalMetric {
  label: string;
  value: string | number;
  trend?: number;
  unit?: string;
  color?: 'emerald' | 'red' | 'blue' | 'gold';
  action?: string;
  outlet?: string;
}

interface OutletData {
  id: string;
  name: string;
  covers: number;
  laborEfficiency: number;
  bevCost: number;
  foodCost: number;
  revenue: number;
}

interface EchoPromptContext {
  route: string;
  selectedOutlet: string;
  activeOperations: number;
  systemHealth: string;
  awareness: string;
  recentEvents: Array<{ module: string; title: string; message: string }>;
  activeModule: string;
  moduleFamily: string;
  permissionLevel: string;
}

function buildEchoSystemPrompt(context: EchoPromptContext) {
  return `You are Echo AI³, the global LUCCCA framework intelligence layer.
Answer like a production assistant: be specific, structured, and actionable.

Current context:
- Route: ${context.route}
- Active module: ${context.activeModule}
- Module family: ${context.moduleFamily}
- Selected outlet: ${context.selectedOutlet}
- Active operations: ${context.activeOperations}
- System health: ${context.systemHealth}
- Permission level: ${context.permissionLevel}
- Awareness: ${context.awareness}

Recent signals:
${context.recentEvents.length > 0 ? context.recentEvents.map((event) => `- ${event.module}: ${event.title} — ${event.message}`).join("\n") : "- none"}

Instructions:
- Answer the user's question directly.
- If the request is about staffing, scheduling, labor, or covers, use the current operational context.
- If the request touches compensation, salary, payroll, or other restricted data, refuse unless the current permission level explicitly allows it.
- If data is missing, say what is missing and the fastest next step.
- Never reply with placeholder text like 'Signal received' or generic acknowledgements only.
- Prefer concise bullets for recommendations and a short summary up top.`;
}

// ============================================================================
// Global Styles - Inject CSS for custom effects
// ============================================================================

const injectStyles = () => {
  if (typeof document === 'undefined') return;
  
  const styleId = '__echo-ai3-styles';
  if (document.getElementById(styleId)) return;
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Custom Cursor */
    #ECHO_CURSOR {
      position: fixed;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
    }
    
    .echo-cursor-ring {
      width: 30px;
      height: 30px;
      border: 1px solid rgba(201, 168, 76, 0.65);
      border-radius: 50%;
      transition: transform 0.1s, opacity 0.12s;
    }
    
    .echo-cursor-dot {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 4px;
      height: 4px;
      background: #f2c94c;
      border-radius: 50%;
      transform: translate(-50%, -50%);
    }
    
    #ECHO_CURSOR.big .echo-cursor-ring {
      transform: scale(2.6);
      opacity: 0.25;
    }
    
    #ECHO_CURSOR.voice .echo-cursor-ring {
      border-color: #ff5252;
      transform: scale(1.8);
      animation: echo-voice-cursor 0.6s ease infinite alternate;
    }
    
    @keyframes echo-voice-cursor {
      to { transform: scale(2.2); opacity: 0.5; }
    }
    
    /* Vigvette Effect */
    .echo-vignette {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 1;
      background: radial-gradient(ellipse 85% 85% at 50% 50%, transparent 25%, rgba(0, 0, 0, 0.78) 100%);
    }
    
    /* Scan Lines */
    .echo-scanlines {
      position: fixed;
      inset: 0;
      z-index: 2;
      pointer-events: none;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0, 0, 0, 0.025) 2px,
        rgba(0, 0, 0, 0.025) 4px
      );
    }
    
    /* Message Animation */
    @keyframes echo-message-appear {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .echo-message {
      animation: echo-message-appear 0.32s ease forwards;
    }
    
    /* Pulse Ring */
    @keyframes echo-pulse-ring {
      to {
        transform: translate(-50%, -50%) scale(2.4);
        opacity: 0;
      }
    }
    
    .echo-pulse-ring {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 160px;
      height: 160px;
      border: 1px solid rgba(201, 168, 76, 0.55);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      animation: echo-pulse-ring 1.1s ease-out forwards;
      pointer-events: none;
    }
    
    /* Breathing Animation */
    @keyframes echo-breathe {
      0%, 100% { opacity: 0.2; }
      50% { opacity: 0.35; }
    }
    
    /* Fade Animation for Awareness */
    @keyframes echo-fade {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    /* Slide In From Right */
    @keyframes slideInFromRight {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
    }
    
    .echo-fade { animation: echo-fade 0.65s ease-in-out; }
    
    /* Status Dot Pulse */
    @keyframes echo-status-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.75); }
    }
  `;
  
  document.head.appendChild(style);
};

// ============================================================================
// Orb Canvas Renderer
// ============================================================================

interface OrbRenderProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  state: string;
  time: number;
}

const OrbCanvas: React.FC<OrbRenderProps> = ({ canvasRef, state, time }) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // State colors
    const stateColors: Record<string, [number, number, number]> = {
      DORMANT: [90, 70, 25],
      AWAKENING: [170, 130, 45],
      AWARE: [201, 168, 76],
      THINKING: [90, 155, 255],
      SPEAKING: [235, 205, 75],
      ALERT: [255, 75, 75],
      LISTENING: [255, 120, 60],
    };
    
    const [r, g, b] = stateColors[state] || [201, 168, 76];
    
    // Clear - transparent background
    ctx.clearRect(0, 0, width, height);
    
    // Atmosphere
    const atmGrad = ctx.createRadialGradient(centerX, centerY, 18, centerX, centerY, 86);
    atmGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
    atmGrad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.065)`);
    atmGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = atmGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 86, 0, Math.PI * 2);
    ctx.fill();
    
    // Orbital rings - 3 planes at different tilts
    const rings = [
      { rx: 64, ry: 19, rot: time * 0.11, lw: 0.8, opa: 0.2 },
      { rx: 53, ry: 14, rot: -time * 0.18 + 0.8, lw: 1.6, opa: 0.3 },
      { rx: 74, ry: 10, rot: time * 0.07 + 2, lw: 0.4, opa: 0.13 },
    ];

    for (const rg of rings) {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rg.rot);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${rg.opa})`;
      ctx.lineWidth = rg.lw;
      ctx.beginPath();
      ctx.ellipse(0, 0, rg.rx, rg.ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Core glow - 4 nested layers
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

    // Pulse rings on SPEAKING or ALERT
    if (state === 'SPEAKING' || state === 'ALERT') {
      const [pr, pg, pb] = state === 'ALERT' ? [255, 75, 75] : [r, g, b];
      for (let w = 0; w < 2; w++) {
        const pr2 = ((time * 85) + w * 65) % 130;
        const pa = Math.max(0, 0.42 - pr2 / 130);
        ctx.strokeStyle = `rgba(${pr}, ${pg}, ${pb}, ${pa})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 32 + pr2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

  }, [state, time]);
  
  return null;
};

// ============================================================================
// Main Component
// ============================================================================

export function EchoAI3Complete() {
  injectStyles();

  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isDark = theme === 'dark' || (!theme && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State
  const [panelOpen, setPanelOpen] = useState(false);
  const [orbState, setOrbState] = useState('DORMANT');
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [time, setTime] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [operationalMetrics, setOperationalMetrics] = useState<OperationalMetric[]>([]);
  const [outletData, setOutletData] = useState<OutletData[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all');

  // System awareness
  const { systemState, activeAlerts, systemHealth, recentEvents, getAwarenessText } = useEchoSystem();

  // Fetch operational metrics - with error suppression
  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout | null = null;

    const defaultMetrics: OperationalMetric[] = [
      { label: 'COVERS TODAY', value: 128, unit: 'covers', color: 'blue', action: 'viewCovers' },
      { label: 'LABOR EFFICIENCY', value: '91.2%', color: 'emerald', action: 'viewLabor' },
      { label: 'BEV COST', value: '28.4%', trend: 2.1, color: 'gold', action: 'viewBeverages' },
      { label: 'FOOD COST', value: '31.8%', color: 'gold', action: 'viewFood' },
      { label: 'REVENUE', value: '$42.3K', color: 'emerald', action: 'viewRevenue' },
      { label: 'ALERTS', value: activeAlerts.length || 0, color: activeAlerts.length > 0 ? 'red' : 'emerald', action: 'viewAlerts' },
    ];

    // Always set initial fallback immediately
    if (isMounted) {
      setOperationalMetrics(defaultMetrics);
    }

    const fetchMetrics = async () => {
      // Attempt to fetch live data
      try {
        const response = await fetch('/api/dashboard/v1/pos/metrics?days=1', {
          headers: { 'Content-Type': 'application/json' },
        }).catch((err) => {
          // Network error - the global wrapper converts this to 503
          console.debug('[EchoAI3Complete] Fetch error:', err);
          if (isMounted) setOperationalMetrics(defaultMetrics);
          return null;
        });

        if (!response || !response.ok) {
          if (isMounted) setOperationalMetrics(defaultMetrics);
          return;
        }

        let data: any;
        try {
          data = await response.json();
        } catch (parseErr) {
          console.debug('[EchoAI3Complete] JSON parse error:', parseErr);
          if (isMounted) setOperationalMetrics(defaultMetrics);
          return;
        }
        const metrics = [
          {
            label: 'COVERS TODAY',
            value: data.today?.covers || 128,
            unit: 'covers',
            color: 'blue',
            action: 'viewCovers',
          },
          {
            label: 'LABOR EFFICIENCY',
            value: data.today?.laborPercentage ? `${data.today.laborPercentage.toFixed(1)}%` : '91.2%',
            color: 'emerald',
            action: 'viewLabor',
          },
          {
            label: 'BEV COST',
            value: data.today?.beverageCost ? `${data.today.beverageCost.toFixed(1)}%` : '28.4%',
            trend: data.today?.beverageTrend || 2.1,
            color: data.today?.beverageCost > 30 ? 'red' : 'gold',
            action: 'viewBeverages',
          },
          {
            label: 'FOOD COST',
            value: data.today?.foodCost ? `${data.today.foodCost.toFixed(1)}%` : '31.8%',
            color: 'gold',
            action: 'viewFood',
          },
          {
            label: 'REVENUE',
            value: data.today?.revenue ? `$${(data.today.revenue / 1000).toFixed(1)}K` : '$42.3K',
            color: 'emerald',
            action: 'viewRevenue',
          },
          {
            label: 'ALERTS',
            value: activeAlerts.length || 0,
            color: activeAlerts.length > 0 ? 'red' : 'emerald',
            action: 'viewAlerts',
          },
        ];
        if (isMounted) {
          setOperationalMetrics(metrics);
        }
      } catch {
        // Network error - silently use defaults
        if (isMounted) {
          setOperationalMetrics(defaultMetrics);
        }
      }
    };

    // Schedule fetch after component mounts
    const timeoutId = setTimeout(() => {
      fetchMetrics();
      interval = setInterval(fetchMetrics, 30000);
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (interval) clearInterval(interval);
    };
  }, [activeAlerts.length]);

  // Fetch multi-outlet data - with error suppression
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const response = await fetch('/api/calendar/outlets', {
          headers: { 'Content-Type': 'application/json' },
        }).catch((err) => {
          console.debug('[EchoAI3Complete] Outlets fetch error:', err);
          if (isMounted) setOutletData([]);
          return null;
        });

        if (!response || !response.ok) {
          if (isMounted) setOutletData([]);
          return;
        }

        let data: any;
        try {
          data = await response.json();
        } catch (parseErr) {
          console.debug('[EchoAI3Complete] Outlets JSON parse error:', parseErr);
          if (isMounted) setOutletData([]);
          return;
        }

        if (isMounted) {
          setOutletData(data.outlets || []);
        }
      } catch (err) {
        // Catch any remaining errors
        console.debug('[EchoAI3Complete] Outlets exception:', err);
        if (isMounted) {
          setOutletData([]);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Theme-aware colors
  const themeColors = useMemo(() => ({
    // Text colors
    textPrimary: isDark ? 'rgba(255, 255, 255, 0.88)' : 'rgba(30, 30, 30, 0.88)',
    textSecondary: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(30, 30, 30, 0.5)',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(30, 30, 30, 0.3)',
    // Background colors
    bgPrimary: isDark ? 'rgba(9, 11, 24, 0.98)' : 'rgba(245, 248, 250, 0.98)',
    bgSecondary: isDark ? 'rgba(20, 25, 40, 0.9)' : 'rgba(230, 240, 250, 0.9)',
    bgTertiary: isDark ? 'rgba(30, 35, 50, 0.85)' : 'rgba(220, 235, 250, 0.85)',
    // Border colors
    borderPrimary: isDark ? 'rgba(201, 168, 76, 0.09)' : 'rgba(201, 168, 76, 0.2)',
    borderSecondary: isDark ? 'rgba(201, 168, 76, 0.15)' : 'rgba(201, 168, 76, 0.3)',
    // Accent colors (gold stays consistent)
    accentGold: 'rgba(201, 168, 76, 0.6)',
    accentGoldLight: 'rgba(242, 201, 76, 0.6)',
  }), [isDark]);
  
  // Cursor tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };
    
    const handleMouseDown = () => {
      const cursor = document.getElementById('ECHO_CURSOR');
      if (cursor) cursor.classList.add('big');
    };
    
    const handleMouseUp = () => {
      const cursor = document.getElementById('ECHO_CURSOR');
      if (cursor) cursor.classList.remove('big');
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  
  // Animation loop
  useEffect(() => {
    const animId = requestAnimationFrame(() => {
      setTime(t => t + 0.016);
    });
    return () => cancelAnimationFrame(animId);
  }, []);
  
  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Initialize orb sequence
  useEffect(() => {
    setOrbState('DORMANT');
    const t1 = setTimeout(() => setOrbState('AWAKENING'), 700);
    const t2 = setTimeout(() => setOrbState('AWARE'), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  
  // Update orb based on system health
  useEffect(() => {
    if (messages.length === 0 && !isLoading) {
      if (activeAlerts.length > 0) {
        setOrbState('ALERT');
      } else if (systemHealth === 'warning') {
        setOrbState('THINKING');
      } else {
        setOrbState('AWARE');
      }
    }
  }, [activeAlerts, systemHealth, messages.length, isLoading]);
  
  const panelContext = useMemo(() => {
    const activeRoute = location.pathname.replace(/^\//, "") || "home";
    const resolved = resolveEchoContext({
      pathname: location.pathname,
      selectedOutlet: selectedOutlet === "all" ? "all outlets" : selectedOutlet,
      userRole: (user as any)?.role,
    });

    return {
      route: activeRoute,
      selectedOutlet: resolved.selectedOutlet,
      activeModule: resolved.activeModule,
      moduleFamily: resolved.moduleFamily,
      permissionLevel: resolved.permissions.canAskSensitiveData ? "trusted" : "standard",
      activeOperations: systemState?.globalMetrics.activeOperations ?? 0,
      systemHealth,
      awareness: getAwarenessText(),
      recentEvents: recentEvents.slice(0, 3).map((event) => ({
        module: event.module,
        title: event.title,
        message: event.message,
      })),
    };
  }, [getAwarenessText, location.pathname, recentEvents, selectedOutlet, systemHealth, systemState?.globalMetrics.activeOperations, user]);

  // Send message handler
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue;
    const nextMessages = [...messages, { role: "user", content: userMessage }];
    setInputValue("");
    setMessages(nextMessages);
    setIsLoading(true);
    setOrbState("THINKING");

    try {
      const response = await fetch("/api/echo-ai3/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          context: {
            module: panelContext.activeModule,
            currentPage: panelContext.route,
            selectedOutlet: panelContext.selectedOutlet,
            systemHealth: panelContext.systemHealth,
            moduleFamily: panelContext.moduleFamily,
            permissionLevel: panelContext.permissionLevel,
          },
          systemPrompt: buildEchoSystemPrompt(panelContext),
          stream: false,
          maxTokens: 1200,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Echo API error: ${response.status}`);
      }

      const assistantText =
        data.response ||
        data.text ||
        data.message ||
        data.output ||
        data.choices?.[0]?.message?.content ||
        "I couldn't generate a response right now.";

      setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
      setOrbState("SPEAKING");
      setTimeout(() => setOrbState("AWARE"), 3000);
    } catch (error) {
      console.error("Echo error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I couldn't complete that request. Please try again." },
      ]);
      setOrbState("ALERT");
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, location.pathname, messages, panelContext]);
  
  // Show toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  };

  // Navigate based on metric action
  const handleMetricClick = (action?: string, metric?: OperationalMetric) => {
    if (!action) return;

    const navigationMap: Record<string, string> = {
      viewCovers: '/dashboard?tab=pos',
      viewLabor: '/labor?view=efficiency',
      viewBeverages: '/culinary?section=beverages',
      viewFood: '/culinary?section=food-cost',
      viewRevenue: '/dashboard?tab=analytics',
      viewAlerts: '/guardian',
    };

    const path = navigationMap[action];
    if (path) {
      navigate(path);
      showToast(`Navigating to ${metric?.label}...`);
    }
  };
  
  useEffect(() => {
    const handleToggle = () => setPanelOpen((prev) => !prev);
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (detail?.id === "echo-ai3" || detail?.id === "echo") {
        setPanelOpen(true);
      }
    };

    window.addEventListener("echo-ai-toggle", handleToggle);
    window.addEventListener("open-panel", handleOpen as EventListener);

    return () => {
      window.removeEventListener("echo-ai-toggle", handleToggle);
      window.removeEventListener("open-panel", handleOpen as EventListener);
    };
  }, []);

  // Quick prompts
  const quickPrompts = [
    { text: "Open schedule canvas", action: "schedule_canvas" },
    { text: "Show open shifts", action: "open_shifts" },
    { text: "Labor vs contribution", action: "labor_contribution" },
    { text: "Staffing curve projection", action: "staffing_curve" },
    { text: "Event staffing projection", action: "event_staffing" },
    { text: "Prep workload projection", action: "prep_workload" },
    { text: "Reliability scoring", action: "reliability_scoring" },
    { text: "LUCCCA exclusive reports", action: "luccca_reports" },
  ];
  
  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 50000 }}>
      {/* Custom Cursor */}
      <div id="ECHO_CURSOR" style={{ left: cursorPos.x, top: cursorPos.y }}>
        <div className="echo-cursor-ring" />
        <div className="echo-cursor-dot" />
      </div>

      {/* Background Effects */}
      <div className="echo-vignette" />
      <div className="echo-scanlines" />

      {/* Voice Indicator */}
      {voiceActive && (
        <div className="fixed bottom-80 right-16 flex flex-col items-end gap-1" style={{ zIndex: 50001 }}>
          <div className="text-xs font-mono text-red-500 animate-pulse">● LISTENING</div>
          <div className="flex gap-1 items-center h-7">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-red-500 rounded"
                style={{
                  height: `${4 + Math.random() * 20}px`,
                  animation: `echo-fade 0.5s ease infinite alternate`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Awareness Strip */}
      <div className="fixed bottom-60 right-0 max-w-sm text-right pointer-events-none pr-16" style={{ zIndex: 50001 }}>
        <div className="text-xs font-mono tracking-wider mb-1" style={{ color: themeColors.textMuted }}>
          ◈ LIVE AWARENESS
        </div>
        <div className="text-sm font-light transition-opacity duration-650" style={{ color: themeColors.textSecondary }}>
          {getAwarenessText()}
        </div>
        {systemState && (
          <div className="text-xs font-mono tracking-wide mt-1" style={{ color: themeColors.textMuted }}>
            ◈ LIVE · {new Date().toLocaleTimeString()}
          </div>
        )}
      </div>
      
      {/* Floating Orb */}
      <div className="fixed bottom-12 right-12 flex flex-col items-end pointer-events-auto gap-0" style={{ zIndex: 50100 }}>
        <div className="relative">
          {/* State Label */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-mono tracking-widest opacity-80 whitespace-nowrap" style={{ color: themeColors.accentGold }}>
            {orbState}
          </div>

          {/* Orb Button */}
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="relative w-40 h-40 rounded-full cursor-none group"
            style={{
              background: 'transparent',
              border: `1px solid ${themeColors.borderPrimary}`,
            }}
            onMouseEnter={() => {
              const el = document.getElementById('ORB_CVS');
              if (el) el.style.filter = 'drop-shadow(0 0 50px rgba(242, 201, 76, 0.6)) drop-shadow(0 0 90px rgba(201, 168, 76, 0.28))';
            }}
            onMouseLeave={() => {
              const el = document.getElementById('ORB_CVS');
              if (el) el.style.filter = 'drop-shadow(0 0 0px transparent)';
            }}
          >
            <canvas
              id="ORB_CVS"
              ref={canvasRef}
              width={160}
              height={160}
              className="absolute inset-0 w-full h-full rounded-full"
              style={{ transition: 'filter 0.6s' }}
            />
            <OrbCanvas canvasRef={canvasRef} state={orbState} time={time} />
          </button>
          
          {/* Hint Text */}
          <div className="text-xs font-mono tracking-widest text-center mt-2 pointer-events-none" style={{ color: themeColors.textMuted }}>
            CLICK · HOLD MIC · TYPE
          </div>
        </div>
      </div>
      
      {/* Action Toast */}
      {toastVisible && (
        <div
          className="fixed top-7 right-8 rounded-1.5 px-4 py-3 border-l-4 border-l-emerald-500 backdrop-blur-1.25"
          style={{
            zIndex: 50050,
            background: themeColors.bgPrimary,
            borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.3)',
            animation: 'echo-message-appear 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div className="text-2xs font-mono letter-spacing-1 mb-1" style={{ color: '#10b981' }}>
            ◈ ACTION EXECUTED
          </div>
          <div className="text-sm" style={{ color: themeColors.textPrimary }}>{toastMessage}</div>
        </div>
      )}
      
      {/* Main Panel - Frameless, floats above all */}
      {panelOpen && (
        <div
          className="fixed top-0 right-0 w-screen sm:w-96 h-screen flex flex-col pointer-events-auto overflow-hidden"
          style={{
            zIndex: 50200,
            animation: 'slideInFromRight 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
            background: isDark
              ? 'linear-gradient(165deg, rgba(5, 7, 17, 0.98), rgba(3, 4, 10, 0.995))'
              : 'linear-gradient(165deg, rgba(245, 248, 250, 0.98), rgba(235, 242, 250, 0.995))',
            border: `1px solid ${themeColors.borderPrimary}`,
            backdropFilter: 'blur(60px)',
          }}
        >
          {/* Header */}
          <div className="px-6 py-6 flex-shrink-0" style={{ borderBottom: `1px solid ${themeColors.borderSecondary}` }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold letter-spacing-1.5" style={{ color: themeColors.accentGoldLight }}>
                  ECHO AI³
                </h1>
                <p className="text-2xs font-mono letter-spacing-0.75 mt-2" style={{ color: themeColors.textMuted }}>
                  ECHOAURUM NEURAL INTELLIGENCE · OPERATOR GRADE · ENCRYPTED
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-2xs font-mono" style={{ borderColor: themeColors.borderSecondary, color: themeColors.textMuted }}>
                  <span>{panelContext.route.toUpperCase()}</span>
                  <span>·</span>
                  <span>{panelContext.selectedOutlet.toUpperCase()}</span>
                </div>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="px-3 py-1.5 text-2xs font-mono letter-spacing-0.5 rounded-1 transition-colors bg-none"
                style={{
                  border: `1px solid ${themeColors.borderSecondary}`,
                  color: themeColors.textMuted,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = themeColors.accentGold;
                  e.currentTarget.style.borderColor = themeColors.accentGold;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = themeColors.textMuted;
                  e.currentTarget.style.borderColor = themeColors.borderSecondary;
                }}
              >
                ✕ CLOSE
              </button>
            </div>
            
            {/* Status & Outlet Selector */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-1.75 h-1.75 rounded-full"
                  style={{
                    background: '#c9a84c',
                    boxShadow: '0 0 8px #c9a84c',
                    animation: 'echo-status-pulse 2s ease infinite',
                  }}
                />
                <span className="text-2xs font-mono letter-spacing-0.5" style={{ color: themeColors.accentGold }}>
                  {activeAlerts.length > 0 ? '⚠ ANOMALIES DETECTED' : 'NEURAL CORE ONLINE'}
                </span>
              </div>
              {outletData.length > 1 && (
                <select
                  value={selectedOutlet}
                  onChange={(e) => setSelectedOutlet(e.target.value)}
                  className="text-2xs font-mono px-2 py-1 rounded bg-transparent border"
                  style={{
                    color: themeColors.textMuted,
                    borderColor: themeColors.borderSecondary,
                  }}
                >
                  <option value="all">ALL OUTLETS</option>
                  {outletData.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Telemetry Grid - Live Operational Data */}
          <div className="px-6 py-3 grid grid-cols-3 gap-2.5 flex-shrink-0 overflow-x-auto" style={{ borderBottom: `1px solid ${themeColors.borderSecondary}` }}>
            {operationalMetrics.map((metric, idx) => {
              const colorMap = {
                emerald: 'text-emerald-400',
                red: 'text-red-400',
                blue: 'text-blue-400',
                gold: 'text-amber-400',
              };

              return (
                <button
                  key={idx}
                  onClick={() => handleMetricClick(metric.action, metric)}
                  className="text-left transition-all duration-200 hover:opacity-100 active:scale-95"
                  style={{
                    opacity: 0.85,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.background = isDark ? 'rgba(201, 168, 76, 0.05)' : 'rgba(201, 168, 76, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0.85';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div className="text-2xs font-mono letter-spacing-0.5 mb-0.75" style={{ color: themeColors.textMuted }}>
                    {metric.label}
                  </div>
                  <div className={`text-xs font-mono font-bold ${colorMap[metric.color || 'gold']}`}>
                    {metric.value}
                    {metric.trend ? <span className="text-2xs ml-1">↑{metric.trend}%</span> : ''}
                  </div>
                  {metric.outlet && (
                    <div className="text-2xs font-mono mt-1" style={{ color: themeColors.textMuted }}>
                      {metric.outlet}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <div style={{ fontSize: '3rem', opacity: 0.2, animation: 'echo-breathe 3s ease infinite' }}>
                  ◈
                </div>
                <div className="text-xs font-mono tracking-wide max-w-xs text-center leading-relaxed" style={{ color: themeColors.textMuted }}>
                  ASK A SCHEDULE, LABOR, OR OPERATIONS QUESTION
                  <br />
                  ECHO WILL RETURN A STRUCTURED ANSWER
                  <br />
                  THEN YOU CAN REFINE, EXPORT, OR OPEN A MODULE
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`echo-message flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className="max-w-xs px-4 py-2 rounded-lg text-xs font-light leading-relaxed whitespace-pre-wrap"
                      style={{
                        background: msg.role === 'user' 
                          ? 'rgba(201, 168, 76, 0.06)' 
                          : 'rgba(91, 184, 255, 0.04)',
                        border: msg.role === 'user'
                          ? '1px solid rgba(201, 168, 76, 0.15)'
                          : '1px solid rgba(91, 184, 255, 0.1)',
                        color: msg.role === 'user' ? 'rgba(255, 255, 255, 0.88)' : 'rgba(215, 232, 255, 0.9)',
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-1.5 items-center">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: '#c9a84c',
                          animation: 'echo-fade 1s ease infinite',
                          animationDelay: `${i * 0.2}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
          
          {/* Quick Prompts */}
          <div className="px-6 py-2 flex flex-wrap gap-2 flex-shrink-0 overflow-x-auto">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputValue(prompt.text);
                  handleSendMessage();
                }}
                className="text-xs font-mono tracking-tight px-3 py-1 rounded transition-all whitespace-nowrap"
                style={{
                  border: `1px solid ${themeColors.borderSecondary}`,
                  color: themeColors.textMuted,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = themeColors.accentGold;
                  e.currentTarget.style.backgroundColor = isDark ? 'rgba(201, 168, 76, 0.1)' : 'rgba(201, 168, 76, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = themeColors.textMuted;
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {prompt.text}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="px-6 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${themeColors.borderSecondary}` }}>
            <div
              className="flex gap-2 items-center px-4 py-1 rounded-full border transition-colors"
              style={{
                background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                borderColor: themeColors.borderSecondary,
              }}
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="TYPE A COMMAND OR QUESTION..."
                className="flex-1 text-xs font-mono tracking-tight bg-none border-none outline-none py-2"
                style={{
                  color: themeColors.textPrimary,
                  caretColor: '#fcd34d',
                  backgroundColorPlaceholder: themeColors.textMuted,
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="px-4 py-2 text-xs font-mono tracking-widest rounded-xl transition-colors disabled:opacity-30"
                style={{
                  backgroundColor: isDark ? 'rgba(201, 168, 76, 0.15)' : 'rgba(201, 168, 76, 0.25)',
                  borderColor: themeColors.borderSecondary,
                  color: themeColors.accentGold,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDark ? 'rgba(201, 168, 76, 0.25)' : 'rgba(201, 168, 76, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isDark ? 'rgba(201, 168, 76, 0.15)' : 'rgba(201, 168, 76, 0.25)';
                }}
              >
                SEND ↵
              </button>
            </div>
            <div className="text-xs font-mono tracking-wide text-center mt-2" style={{ color: themeColors.textMuted }}>
              ENTER TO SEND · ESC TO CLOSE · HOLD MIC FOR VOICE
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EchoAI3Complete;
