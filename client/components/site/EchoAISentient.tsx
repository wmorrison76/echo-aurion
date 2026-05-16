import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { cn } from "@/lib/glass";
import { MessageCircle, Mic, MicOff, Send, X, Pin, Zap } from "lucide-react";
import { initializeEchoAi3System } from "@/core/ai3/index";
import { useEchoAi3ChatWithSuggestions } from "@/lib/echo-ai3/chat-integration";
import { osBus } from "@/lib/os-bus";

// ============================================================================
// Glass Panel Styling (shared with AvatarDisplay)
// ============================================================================
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const computePanelStyle = (density: number): React.CSSProperties => {
  const d = clamp01(density);
  const surface = 0.28 + d * 0.65;
  const gradientA = 0.18 + d * 0.5;
  const gradientB = 0.15 + d * 0.35;
  const outline = 0.07 + d * 0.34;
  const blur = 14 + (1 - d) * 20;
  const saturation = 1.05 + d * 0.5;
  const brightness = 0.9 + d * 0.25;
  return {
    background: `linear-gradient(150deg, hsl(var(--background) / ${surface.toFixed(2)}) 0%, hsl(var(--background) / ${gradientA.toFixed(2)}) 46%, hsl(var(--background) / ${gradientB.toFixed(2)}) 100%)`,
    boxShadow: `0 32px 70px rgba(8, 14, 27, ${(0.26 + d * 0.5).toFixed(2)}), inset 0 0 72px hsl(var(--primary) / ${(0.18 + d * 0.48).toFixed(2)})`,
    border: "none",
    borderRadius: "24px",
    outline: `1px solid hsl(var(--primary) / ${outline.toFixed(2)})`,
    backdropFilter: `blur(${blur.toFixed(1)}px) saturate(${saturation.toFixed(2)}) brightness(${brightness.toFixed(2)})`,
    WebkitBackdropFilter: `blur(${blur.toFixed(1)}px) saturate(${saturation.toFixed(2)}) brightness(${brightness.toFixed(2)})`,
    opacity: 0.85 + d * 0.15,
    transition:
      "backdrop-filter 180ms ease, box-shadow 180ms ease, outline-color 180ms ease, opacity 180ms ease",
  };
};

const computeOverlayStyle = (density: number): React.CSSProperties => {
  const d = clamp01(density);
  return {
    opacity: 0.14 + d * 0.6,
    filter: `brightness(${(0.9 + d * 0.4).toFixed(2)}) saturate(${(1 + d * 0.25).toFixed(2)})`,
    transform: `scale(${(1.01 + (1 - d) * 0.06).toFixed(3)})`,
    transition: "opacity 160ms ease, transform 160ms ease, filter 160ms ease",
  };
};

const glassPanelClass =
  "relative flex h-[50vh] w-[360px] flex-col gap-3 overflow-hidden rounded-3xl px-4 py-4 backdrop-blur-[30px] transition-[transform,opacity] duration-300";
const glassOverlayClass =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.4),transparent_70%)] mix-blend-screen";
const messageScrollClass =
  "relative flex min-h-0 max-h-[58vh] flex-1 flex-col gap-3 overflow-y-auto pr-3 text-[12px] leading-relaxed";
const messageBubbleBaseClass =
  "max-w-[86%] rounded-3xl px-4 py-2.5 text-[12px] leading-relaxed shadow-[0_22px_38px_rgba(8,14,27,0.55)] transition duration-200 ease-out backdrop-blur-sm";
const aiMessageBubbleClass =
  "bg-[linear-gradient(135deg,hsl(var(--primary)/0.28),hsl(var(--primary)/0.14))] text-[hsl(var(--primary-foreground)/0.95)] shadow-[0_0_36px_hsl(var(--primary)/0.42)]";
const userMessageBubbleClass =
  "self-end bg-[linear-gradient(135deg,hsl(var(--foreground)/0.26),hsl(var(--foreground)/0.12))] text-[hsl(var(--foreground)/0.92)] shadow-[0_0_28px_rgba(11,19,36,0.42)]";
const controlChipBaseClass =
  "rounded-full bg-[hsl(var(--background)/0.52)] px-3 py-1 text-[11px] font-medium text-[hsl(var(--foreground)/0.82)] shadow-[inset_0_0_12px_rgba(8,14,27,0.45)] transition hover:bg-[hsl(var(--background)/0.68)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45";
const inputFieldClass =
  "flex-1 rounded-full bg-[hsl(var(--background)/0.62)] px-4 py-2 text-[13px] text-[hsl(var(--foreground)/0.9)] placeholder:text-[hsl(var(--foreground)/0.55)] shadow-[inset_0_0_30px_rgba(8,14,27,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/45";
const activeControlClass =
  "bg-primary/80 text-primary-foreground shadow-[0_0_36px_hsl(var(--primary)/0.45)]";
const statusIndicatorClass =
  "relative inline-flex h-2.5 w-2.5 items-center justify-center";

// Safe localStorage access
const safeGet = (key: string) => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {}
};

/**
 * EchoAI-Sentient: Global AI assistant that:
 * - Understands all modules and can open them
 * - Provides real-time telemetry (KPIs)
 * - Supports voice and text input
 * - Acts as a sentient being (not just a chatbot)
 * - Separate from EchoCoder (which remains secret)
 */
export default function EchoAISentient() {
  // Panel state
  const [mounted, setMounted] = useState(false);
  const [panelOpen, setPanelOpen] = useState(() => safeGet("echo-ai.panel.open") === "1");
  const [panelPinned, setPanelPinned] = useState(() => safeGet("echo-ai.panel.pinned") === "1");
  const [panelHovering, setPanelHovering] = useState(false);
  const [panelOpacity, setPanelOpacity] = useState<number>(() => {
    try {
      const stored = parseFloat(safeGet("echo-ai.panel.opacity") || "0.82");
      if (Number.isNaN(stored)) return 0.82;
      return clamp01(stored);
    } catch {
      return 0.82;
    }
  });

  // Voice state
  const [micEnabled, setMicEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // AI Integration
  const ai3 = useMemo(() => initializeEchoAi3System(), []);
  const [persona, setPersona] = useState(() => ai3.personas.getPersona());
  const chatHook = useEchoAi3ChatWithSuggestions();
  
  const history = (chatHook?.messages || []) as Array<{ role: "user" | "ai"; text: string }>;
  const value = chatHook?.input || "";
  const setValue = chatHook?.setInput || (() => {});
  const sendMessage = chatHook?.sendMessage || (async () => {});
  const pendingReply = chatHook?.isLoading || false;

  // Telemetry: Real-time KPIs (if available)
  const [telemetry, setTelemetry] = useState<Record<string, any>>({});

  // Initialize on mount
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Persist panel state
  useEffect(() => {
    safeSet("echo-ai.panel.open", panelOpen ? "1" : "0");
    safeSet("echo-ai.panel.pinned", panelPinned ? "1" : "0");
    safeSet("echo-ai.panel.opacity", String(panelOpacity));
  }, [panelOpen, panelPinned, panelOpacity]);

  // Listen for panel open requests
  useEffect(() => {
    const handleAskEvent = (e: any) => {
      const prompt = (e?.detail?.prompt || "").toString();
      if (!prompt) return;
      setPanelPinned(true);
      setPanelHovering(true);
      setPanelOpen(true);
      setValue(prompt);
      sendMessage(prompt);
    };

    window.addEventListener("echo:ask", handleAskEvent as any);
    return () => window.removeEventListener("echo:ask", handleAskEvent as any);
  }, [sendMessage, setValue]);

  // Handle AI action execution (e.g., "open Culinary module")
  const handleAIAction = useCallback(
    async (action: string, params: Record<string, any> = {}) => {
      console.log("[EchoAI-Sentient] Executing action:", action, params);
      
      try {
        switch (action) {
          case "open_panel":
            osBus.emit("ui:open_panel", {
              panelId: params.panelId,
              tabId: params.tabId,
            });
            break;
          case "open_module":
            osBus.emit("ui:open_panel", {
              panelId: params.module,
            });
            break;
          case "show_telemetry":
            // Already displayed in UI
            break;
          case "fetch_recipe":
            osBus.emit("culinary:search_recipe", {
              query: params.query,
            });
            break;
          default:
            console.warn("[EchoAI-Sentient] Unknown action:", action);
        }
      } catch (err) {
        console.error("[EchoAI-Sentient] Action execution error:", err);
      }
    },
    []
  );

  // Voice input handler
  const handleVoiceInput = useCallback(async () => {
    if (!micEnabled) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        setMicEnabled(true);
        setIsRecording(true);
        console.log("[EchoAI-Sentient] Microphone enabled");
      } catch (err) {
        console.error("[EchoAI-Sentient] Microphone access denied:", err);
        alert("Microphone access required. Please enable it in browser settings.");
      }
    } else {
      setIsRecording(!isRecording);
      if (isRecording) {
        // TODO: Implement voice transcription
        console.log("[EchoAI-Sentient] Stopping recording");
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        setMicEnabled(false);
      }
    }
  }, [micEnabled, isRecording]);

  // Send message handler
  const handleSendMessage = useCallback(async () => {
    if (!value.trim() || pendingReply) return;
    const msg = value.trim();
    setValue("");
    await sendMessage(msg);
  }, [value, pendingReply, setValue, sendMessage]);

  if (!mounted) return null;

  return (
    <div
      key="echo-ai-sentient"
      className="fixed right-6 bottom-6 z-[10001]"
      data-echo-ai-sentient
    >
      {/* Avatar Button (Compact) */}
      <button
        type="button"
        onClick={() => {
          if (!panelPinned) {
            setPanelOpen(!panelOpen);
            setPanelHovering(true);
          }
        }}
        onMouseEnter={() => {
          if (!panelPinned) {
            setPanelOpen(true);
            setPanelHovering(true);
          }
        }}
        onMouseLeave={() => {
          if (!panelPinned) {
            setTimeout(() => {
              if (!panelHovering) {
                setPanelOpen(false);
              }
            }, 200);
          }
        }}
        className={cn(
          "group flex flex-col items-center gap-2 transition-all cursor-pointer",
          !mounted && "opacity-0 pointer-events-none",
          "hover:scale-110"
        )}
        title="EchoAI - Your Sentient Assistant"
      >
        {/* Status text - ABOVE icon */}
        <div className="text-center text-xs">
          <p className="font-medium text-foreground/80 text-[11px]">EchoAI<sup>3</sup></p>
          <p className="text-[10px] text-blue-400 font-semibold">
            {pendingReply ? "Thinking..." : "Ready"}
          </p>
        </div>

        {/* Avatar with pulse indicator */}
        <div className="relative w-14 h-14 rounded-full overflow-hidden shadow-lg flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 ring-2 ring-blue-500 ring-offset-2 ring-offset-background/80">
          <Zap className="w-6 h-6 text-white" />
          {pendingReply && (
            <span className="absolute inset-0 animate-pulse bg-blue-500/20" />
          )}
        </div>
      </button>

      {/* Chat Panel */}
      {panelOpen && (
        <div
          className="absolute right-0 bottom-[calc(100%+16px)] z-[10002] pointer-events-auto"
          style={{
            maxWidth: "min(360px, calc(100vw - 48px))",
            maxHeight: "calc(100vh - 180px)",
          }}
          onMouseEnter={() => {
            setPanelHovering(true);
            setPanelOpen(true);
          }}
          onMouseLeave={(e) => {
            const relatedTarget = e.relatedTarget;
            const isMovingToButton = (relatedTarget instanceof Element) && (
              relatedTarget.closest('button[title="EchoAI - Your Sentient Assistant"]') ||
              relatedTarget.closest('[data-echo-ai-sentient]')
            );

            setPanelHovering(false);
            if (!panelPinned && !isMovingToButton) {
              setTimeout(() => {
                if (!panelHovering && !panelPinned) {
                  setPanelOpen(false);
                }
              }, 200);
            }
          }}
        >
          <div
            style={{
              ...computePanelStyle(panelOpacity),
              width: "min(360px, calc(100vw - 48px))",
              height: "min(35vh, calc(100vh - 180px))",
            }}
            className={glassPanelClass
              .replace("w-[360px]", "")
              .replace("h-[50vh]", "")}
          >
            {/* Glass overlay */}
            <div
              className={glassOverlayClass}
              style={computeOverlayStyle(panelOpacity)}
              aria-hidden="true"
            />

            {/* Header */}
            <header className="relative z-[1] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={statusIndicatorClass}>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/30" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_14px_hsl(var(--primary)/0.75)]" />
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-primary/80">
                      EchoAI
                    </span>
                    <span className="text-[12px] font-medium text-primary/80">
                      {speaking
                        ? "Speaking"
                        : pendingReply
                          ? "Analyzing"
                          : "Listening"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPanelPinned(!panelPinned)}
                    className={`${controlChipBaseClass} ${
                      panelPinned ? activeControlClass : ""
                    }`}
                    title={panelPinned ? "Unpin" : "Pin"}
                  >
                    <Pin className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPanelOpen(false);
                      setPanelHovering(false);
                    }}
                    className={controlChipBaseClass}
                    title="Close"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Real-time Telemetry (if available) */}
              {Object.keys(telemetry).length > 0 && (
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {Object.entries(telemetry).slice(0, 4).map(([key, val]) => (
                    <div
                      key={key}
                      className="rounded-lg bg-[hsl(var(--background)/0.38)] px-2 py-1"
                    >
                      <p className="text-[hsl(var(--foreground)/0.6)]">{key}</p>
                      <p className="font-semibold text-primary">{val}</p>
                    </div>
                  ))}
                </div>
              )}
            </header>

            {/* Messages */}
            <div className={messageScrollClass}>
              {history.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center text-[12px] text-[hsl(var(--foreground)/0.55)]">
                  <p>
                    I'm here to help. Ask me to open modules,<br />
                    find recipes, or understand your data.
                  </p>
                </div>
              ) : (
                history.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      messageBubbleBaseClass,
                      msg.role === "ai"
                        ? aiMessageBubbleClass
                        : userMessageBubbleClass
                    )}
                  >
                    {msg.text}
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="relative z-[1] flex items-center gap-2">
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSendMessage();
                  }
                }}
                placeholder="Tell me something..."
                className={inputFieldClass}
                disabled={pendingReply || isRecording}
                autoFocus={panelOpen}
              />
              <button
                type="button"
                onClick={handleVoiceInput}
                className={cn(
                  controlChipBaseClass,
                  isRecording && "bg-red-500/80 text-white"
                )}
                title="Voice input"
              >
                {isRecording ? (
                  <MicOff className="w-3 h-3" />
                ) : (
                  <Mic className="w-3 h-3" />
                )}
              </button>
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={pendingReply || !value.trim()}
                className={cn(controlChipBaseClass, "disabled:opacity-50")}
                title="Send message"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
