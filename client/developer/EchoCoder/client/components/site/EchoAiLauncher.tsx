import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "@/i18n";
import EchoOrb, { orbHostClass } from "@/components/echo/EchoOrb";
import { createOrbPalette } from "@/components/echo/orb-palette";
import {
  mergeOrbConfig,
  readOrbControlConfigFromStorage,
  type OrbControlConfig,
} from "@/components/echo/orb-config";
import { initializeEchoAi3System } from "@/core/ai3/index";
import type { PersonaProfile } from "@/core/ai3/EchoPersonas";
import { getSystemKnowledgeScanner } from "@/services/systemKnowledgeScanner";
import { getWeatherService } from "@/services/weatherService";

const ICON_URL =
  "https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2F0493b5d4c32e408ebbf385e22ac90106?format=webp&width=64";
const AUTOSUBMIT_DELAY = 1700;
const glassPanelClass =
  "relative flex max-h-[78vh] min-h-0 w-[min(320px,92vw)] flex-col gap-4 overflow-hidden rounded-3xl px-4 py-5 backdrop-blur-[30px] transition-[transform,opacity] duration-300";
const glassOverlayClass =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.4),transparent_70%)] mix-blend-screen";
const statusIndicatorClass =
  "relative inline-flex h-2.5 w-2.5 items-center justify-center";
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const computePanelStyle = (density: number): React.CSSProperties => {
  const d = clamp01(density);
  const surface = 0.18 + d * 0.62;
  const gradientA = 0.1 + d * 0.48;
  const gradientB = 0.08 + d * 0.32;
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
    opacity: 0.72 + d * 0.24,
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
const HEX_COLOR_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
function normalizeHexColor(value: string, fallback = "#ffffff") {
  const raw = (value || "").trim();
  if (!HEX_COLOR_PATTERN.test(raw)) {
    return fallback;
  }
  const hex = raw.startsWith("#") ? raw.slice(1) : raw;
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : hex;
  return `#${expanded.toLowerCase()}`;
}
function mixHexColor(a: string, b: string, weight = 0.5) {
  const ratio = Math.max(
    0,
    Math.min(1, Number.isFinite(weight) ? weight : 0.5),
  );
  const first = normalizeHexColor(a);
  const second = normalizeHexColor(b);
  const toRgb = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });
  const colorA = toRgb(first);
  const colorB = toRgb(second);
  const mix = (componentA: number, componentB: number) =>
    Math.max(
      0,
      Math.min(255, Math.round(componentA * (1 - ratio) + componentB * ratio)),
    );
  const toHex = (component: number) => component.toString(16).padStart(2, "0");
  return `#${toHex(mix(colorA.r, colorB.r))}${toHex(mix(colorA.g, colorB.g))}${toHex(mix(colorA.b, colorB.b))}`;
}
function lightenHexColor(color: string, amount = 0.25) {
  return mixHexColor(color, "#ffffff", amount);
}
const POSITIVE_HINTS = [
  "great",
  "thanks",
  "awesome",
  "perfect",
  "love",
  "yes",
  "good",
  "glad",
];
const NEGATIVE_HINTS = [
  "issue",
  "error",
  "problem",
  "no",
  "not",
  "fail",
  "broken",
  "bad",
];
const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true,
    channelCount: 1,
  },
};
const BASE_TRANSCRIPT_CONFIDENCE = 0.42;
const TRANSCRIPT_CONFIDENCE_FLOOR = 0.18;
const TRANSCRIPT_CONFIDENCE_STEP_DOWN = 0.12;
const TRANSCRIPT_CONFIDENCE_STEP_UP = 0.05;
const TRANSCRIPT_LOW_CONFIDENCE_NOTICE_THRESHOLD = 4;
function estimateSentiment(text: string) {
  const sample = text.toLowerCase();
  let score = 0;
  POSITIVE_HINTS.forEach((hint) => {
    if (sample.includes(hint)) score += 1;
  });
  NEGATIVE_HINTS.forEach((hint) => {
    if (sample.includes(hint)) score -= 1;
  });
  return clamp01(0.5 + score * 0.12);
}
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
const controlButtonClass =
  "rounded-full bg-[hsl(var(--background)/0.48)] px-3 py-1.5 text-[12px] text-[hsl(var(--foreground)/0.85)] shadow-[inset_0_0_18px_rgba(8,14,27,0.45)] transition hover:bg-[hsl(var(--background)/0.68)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45";
const controlSelectClass =
  "rounded-full bg-[hsl(var(--background)/0.58)] px-3 py-1 text-[11px] text-[hsl(var(--foreground)/0.82)] shadow-[inset_0_0_20px_rgba(9,17,34,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45";
const inputFieldClass =
  "flex-1 rounded-full bg-[hsl(var(--background)/0.62)] px-4 py-2 text-[13px] text-[hsl(var(--foreground)/0.9)] placeholder:text-[hsl(var(--foreground)/0.55)] shadow-[inset_0_0_30px_rgba(8,14,27,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/45";
const launcherButtonBaseClass =
  "group/echo-launcher relative rounded-full border-0 p-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/45 transition-transform hover:scale-110";
const fixedLauncherChromeClass =
  "bg-[hsl(var(--background)/0.32)] backdrop-blur-xl shadow-[0_24px_36px_rgba(8,14,27,0.55)]";
const activeControlClass =
  "bg-primary/80 text-primary-foreground shadow-[0_0_36px_hsl(var(--primary)/0.45)]";
const subtleLabelClass =
  "text-[10px] uppercase tracking-[0.28em] text-[hsl(var(--foreground)/0.6)]";
export default function EchoAiLauncher({
  variant = "fixed" as "fixed" | "header",
}) {
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

  const [open, setOpen] = React.useState(false);
  const [fallback, setFallback] = React.useState(false);
  const [hovering, setHovering] = React.useState(false);
  const [pinned, setPinned] = React.useState(() => {
    try {
      return safeGet("echo.popup.pinned") === "1";
    } catch {
      return false;
    }
  });
  const [panelOpacity, setPanelOpacity] = React.useState<number>(() => {
    try {
      const stored = parseFloat(safeGet("echo.popup.opacity") || "0.80");
      if (Number.isNaN(stored)) return 0.8;
      return clamp01(stored);
    } catch {
      return 0.8;
    }
  });
  const panelOpacityRef = React.useRef(panelOpacity);
  const lastAuraAnnounceRef = React.useRef(Math.round(panelOpacity * 100));
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [value, setValue] = React.useState("");
  const [history, setHistory] = React.useState<
    { role: "user" | "ai"; text: string }[]
  >([]);
  const [pendingReply, setPendingReply] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const [iconSize, setIconSize] = React.useState<number>(() =>
    parseInt(safeGet("orb.size") || "30", 10),
  );
  const [pattern, setPattern] = React.useState<
    "classic" | "waves" | "galaxy" | "fractal" | "tessellation"
  >(() => (safeGet("orb.pattern") as any) || "classic");
  const [colorA, setColorA] = React.useState<string>(
    () => safeGet("orb.colorA") || "#14e0ff",
  );
  const [colorB, setColorB] = React.useState<string>(
    () => safeGet("orb.colorB") || "#ffe95c",
  );
  const [showRings, setShowRings] = React.useState<boolean>(
    () => (safeGet("orb.showRings") || "1") === "1",
  );
  const [ringSpeed, setRingSpeed] = React.useState<number>(() =>
    parseFloat(safeGet("orb.ring.speed") || "0.6"),
  );
  const [ringCount, setRingCount] = React.useState<number>(() =>
    parseInt(safeGet("orb.ring.count") || "8", 10),
  );
  const [ringParticles, setRingParticles] = React.useState<number>(() =>
    parseInt(safeGet("orb.ring.particles") || "900", 10),
  );
  const [ringRandomness, setRingRandomness] = React.useState<number>(() =>
    parseFloat(safeGet("orb.ring.rand") || "0.35"),
  );
  const [glowParticles, setGlowParticles] = React.useState<number>(() =>
    parseInt(safeGet("orb.glow.count") || "1200", 10),
  );
  const [glowColor, setGlowColor] = React.useState<string>(
    () => safeGet("orb.glow.color") || "#ffe95c",
  );
  const palette = React.useMemo(
    () => createOrbPalette({ colorA, colorB, glowColor }),
    [colorA, colorB, glowColor],
  );
  const [glowSpeed, setGlowSpeed] = React.useState<number>(() =>
    parseFloat(safeGet("orb.glow.speed") || "1.4"),
  );
  const [glowSize, setGlowSize] = React.useState<number>(() =>
    parseFloat(safeGet("orb.glow.size") || "0.035"),
  );
  const [omniGlow, setOmniGlow] = React.useState<boolean>(
    () => (safeGet("orb.omni") || "1") === "1",
  );
  const [helix, setHelix] = React.useState<boolean>(
    () => (safeGet("orb.helix") || "1") === "1",
  );
  const [helixParticles, setHelixParticles] = React.useState<number>(() =>
    parseInt(safeGet("orb.helix.particles") || "1200", 10),
  );
  const [helixRadius, setHelixRadius] = React.useState<number>(() =>
    parseFloat(safeGet("orb.helix.radius") || "0.9"),
  );
  const [helixPitch, setHelixPitch] = React.useState<number>(() =>
    parseFloat(safeGet("orb.helix.pitch") || "0.5"),
  );
  const [helixSpeed, setHelixSpeed] = React.useState<number>(() =>
    parseFloat(safeGet("orb.helix.speed") || "1.0"),
  );
  const [radius, setRadius] = React.useState<number>(() =>
    parseFloat(safeGet("orb.radius") || "2.2"),
  );
  const [dirAz, setDirAz] = React.useState<number>(() =>
    parseFloat(safeGet("orb.dir.az") || "0"),
  );
  const [dirEl, setDirEl] = React.useState<number>(() =>
    parseFloat(safeGet("orb.dir.el") || "0"),
  );
  const [speed, setSpeed] = React.useState<number>(() =>
    parseFloat(safeGet("orb.speed") || "0.35"),
  );
  const [wobble, setWobble] = React.useState<number>(() =>
    parseFloat(safeGet("orb.wobble") || "0.25"),
  );
  const [compactness, setCompactness] = React.useState<number>(() =>
    parseFloat(safeGet("orb.compactness") || "0.9"),
  );
  const [waveCols, setWaveCols] = React.useState<number>(() =>
    parseInt(safeGet("orb.wave.cols") || "120", 10),
  );
  const [waveRows, setWaveRows] = React.useState<number>(() =>
    parseInt(safeGet("orb.wave.rows") || "80", 10),
  );
  const [waveAmp, setWaveAmp] = React.useState<number>(() =>
    parseFloat(safeGet("orb.wave.amp") || "0.5"),
  );
  const [waveSpeed, setWaveSpeed] = React.useState<number>(() =>
    parseFloat(safeGet("orb.wave.speed") || "0.8"),
  );
  const [waveSpacing, setWaveSpacing] = React.useState<number>(() =>
    parseFloat(safeGet("orb.wave.spacing") || "0.08"),
  );
  const [waveColor, setWaveColor] = React.useState<string>(
    () => safeGet("orb.wave.color") || "#39f3ff",
  );
  const [chaosMode, setChaosMode] = React.useState<"lorenz" | "rossler">(() =>
    safeGet("orb.chaos.mode") === "rossler" ? "rossler" : "lorenz",
  );
  const [chaosPoints, setChaosPoints] = React.useState<number>(() =>
    parseInt(safeGet("orb.chaos.points") || "18000", 10),
  );
  const [chaosDt, setChaosDt] = React.useState<number>(() =>
    parseFloat(safeGet("orb.chaos.dt") || "0.008"),
  );
  const [chaosSigma, setChaosSigma] = React.useState<number>(() =>
    parseFloat(safeGet("orb.chaos.sigma") || "10"),
  );
  const [chaosRho, setChaosRho] = React.useState<number>(() =>
    parseFloat(safeGet("orb.chaos.rho") || "28"),
  );
  const [chaosBeta, setChaosBeta] = React.useState<number>(() =>
    parseFloat(safeGet("orb.chaos.beta") || (8 / 3).toString()),
  );
  const [chaosScale, setChaosScale] = React.useState<number>(() =>
    parseFloat(safeGet("orb.chaos.scale") || "0.085"),
  );
  const [chaosSpeed, setChaosSpeed] = React.useState<number>(() =>
    parseFloat(safeGet("orb.chaos.speed") || "0.7"),
  );
  const [chaosIntensity, setChaosIntensity] = React.useState<number>(() =>
    parseFloat(safeGet("orb.chaos.intensity") || "0.3"),
  );
  const [chaosA, setChaosA] = React.useState<number>(() =>
    parseFloat(safeGet("orb.chaos.a") || "0.2"),
  );
  const [chaosB, setChaosB] = React.useState<number>(() =>
    parseFloat(safeGet("orb.chaos.b") || "0.2"),
  );
  const [chaosC, setChaosC] = React.useState<number>(() =>
    parseFloat(safeGet("orb.chaos.c") || "5.7"),
  );
  const [chaosColor, setChaosColor] = React.useState<string>(
    () => safeGet("orb.chaos.color") || "#f7c8ff",
  );
  const [tessellationType, setTessellationType] = React.useState<"hex" | "tri">(
    () => (safeGet("orb.tess.pattern") === "tri" ? "tri" : "hex"),
  );
  const [tessellationCols, setTessellationCols] = React.useState<number>(() =>
    parseInt(safeGet("orb.tess.cols") || "72", 10),
  );
  const [tessellationRows, setTessellationRows] = React.useState<number>(() =>
    parseInt(safeGet("orb.tess.rows") || "48", 10),
  );
  const [tessellationScale, setTessellationScale] = React.useState<number>(() =>
    parseFloat(safeGet("orb.tess.scale") || "0.24"),
  );
  const [tessellationDepth, setTessellationDepth] = React.useState<number>(() =>
    parseFloat(safeGet("orb.tess.depth") || "0.45"),
  );
  const [tessellationSpeed, setTessellationSpeed] = React.useState<number>(() =>
    parseFloat(safeGet("orb.tess.speed") || "0.85"),
  );
  const [systemAwareness, setSystemAwareness] = React.useState(0);
  const [tessellationWarp, setTessellationWarp] = React.useState<number>(() =>
    parseFloat(safeGet("orb.tess.warp") || "0.55"),
  );
  const [tessellationColorA, setTessellationColorA] = React.useState<string>(
    () => safeGet("orb.tess.colorA") || "#14e0ff",
  );
  const [tessellationColorB, setTessellationColorB] = React.useState<string>(
    () => safeGet("orb.tess.colorB") || "#ffe95c",
  );
  const ai3 = React.useMemo(() => initializeEchoAi3System(), []);
  const [persona, setPersona] = React.useState<PersonaProfile>(() =>
    ai3.personas.getPersona(),
  );

  React.useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = (event && (event as any).reason) || (event as any);
      if (isAbortError(reason)) {
        try {
          event.preventDefault?.();
        } catch {}
        // capture for telemetry without treating as error
        try {
          ai3?.telemetry?.capture?.({
            module: "EchoChat",
            error: "AbortError suppressed",
            message:
              typeof reason === "object" && reason !== null
                ? (reason as any).message || String(reason)
                : String(reason),
            timestamp: Date.now(),
          });
        } catch {}
        // avoid noisy console.error
        console.debug("suppressed AbortError unhandled rejection", reason);
      }
    };
    window.addEventListener("unhandledrejection", onUnhandledRejection as any);
    return () =>
      window.removeEventListener(
        "unhandledrejection",
        onUnhandledRejection as any,
      );
  }, [ai3]);

  const [avgSentiment, setAvgSentiment] = React.useState(() =>
    ai3.telemetry?.getAverageSentiment?.() ?? 0.5,
  );
  const [contextSummary, setContextSummary] = React.useState<
    Record<string, number>
  >({});
  const personaOptions = React.useMemo(() => ai3.personas.list(), [ai3]);
  React.useEffect(() => {
    const updateState = <T,>(
      setter: React.Dispatch<React.SetStateAction<T>>,
      value: T,
    ) => {
      setter((current) => (Object.is(current, value) ? current : value));
    };

    const applyConfig = (override?: Partial<OrbControlConfig>) => {
      const base = readOrbControlConfigFromStorage();
      const snapshot = override ? mergeOrbConfig(override, base) : base;
      updateState(setIconSize, snapshot.iconSize);
      updateState(setPattern, snapshot.pattern);
      updateState(setColorA, snapshot.colorA);
      updateState(setColorB, snapshot.colorB);
      updateState(setShowRings, snapshot.showRings);
      updateState(setRingSpeed, snapshot.ringSpeed);
      updateState(setRingCount, snapshot.ringCount);
      updateState(setRingParticles, snapshot.ringParticles);
      updateState(setRingRandomness, snapshot.ringRandomness);
      updateState(setGlowParticles, snapshot.glowParticles);
      updateState(setGlowColor, snapshot.glowColor);
      updateState(setGlowSpeed, snapshot.glowSpeed);
      updateState(setGlowSize, snapshot.glowSize);
      updateState(setOmniGlow, snapshot.omniGlow);
      updateState(setHelix, snapshot.helix);
      updateState(setHelixParticles, snapshot.helixParticles);
      updateState(setHelixRadius, snapshot.helixRadius);
      updateState(setHelixPitch, snapshot.helixPitch);
      updateState(setHelixSpeed, snapshot.helixSpeed);
      updateState(setRadius, snapshot.radius);
      updateState(setDirAz, snapshot.dirAz);
      updateState(setDirEl, snapshot.dirEl);
      updateState(setSpeed, snapshot.speed);
      updateState(setWobble, snapshot.wobble);
      updateState(setCompactness, snapshot.compactness);
      updateState(setWaveCols, snapshot.waveCols);
      updateState(setWaveRows, snapshot.waveRows);
      updateState(setWaveAmp, snapshot.waveAmp);
      updateState(setWaveSpeed, snapshot.waveSpeed);
      updateState(setWaveSpacing, snapshot.waveSpacing);
      updateState(setWaveColor, snapshot.waveColor);
      updateState(setChaosMode, snapshot.chaosAttractor);
      updateState(setChaosPoints, snapshot.chaosPoints);
      updateState(setChaosDt, snapshot.chaosDt);
      updateState(setChaosSigma, snapshot.chaosSigma);
      updateState(setChaosRho, snapshot.chaosRho);
      updateState(setChaosBeta, snapshot.chaosBeta);
      updateState(setChaosScale, snapshot.chaosScale);
      updateState(setChaosSpeed, snapshot.chaosSpeed);
      updateState(setChaosIntensity, snapshot.chaosIntensity);
      updateState(setChaosA, snapshot.chaosA);
      updateState(setChaosB, snapshot.chaosB);
      updateState(setChaosC, snapshot.chaosC);
      updateState(setChaosColor, snapshot.chaosColor);
      updateState(setTessellationType, snapshot.tessellationType);
      updateState(setTessellationCols, snapshot.tessellationCols);
      updateState(setTessellationRows, snapshot.tessellationRows);
      updateState(setTessellationScale, snapshot.tessellationScale);
      updateState(setTessellationDepth, snapshot.tessellationDepth);
      updateState(setTessellationSpeed, snapshot.tessellationSpeed);
      updateState(setTessellationWarp, snapshot.tessellationWarp);
      updateState(setTessellationColorA, snapshot.tessellationColorA);
      updateState(setTessellationColorB, snapshot.tessellationColorB);
    };

    applyConfig();

    const handleStorage = () => applyConfig();
    const handleOrbChanged = (event: Event) => {
      const detail = (event as CustomEvent<Partial<OrbControlConfig>>).detail;
      applyConfig(detail);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("orb:changed", handleOrbChanged as EventListener);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        "orb:changed",
        handleOrbChanged as EventListener,
      );
    };
  }, []);
  React.useEffect(() => {
    safeSet("echo.popup.pinned", pinned ? "1" : "0");
    if (pinned) {
      setOpen(true);
    }
  }, [pinned]);
  React.useEffect(() => {
    safeSet("echo.popup.opacity", panelOpacity.toString());
  }, [panelOpacity]);
  const timer = React.useRef<number | undefined>();
  React.useEffect(() => {
    panelOpacityRef.current = panelOpacity;
  }, [panelOpacity]);
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const density = clamp01(panelOpacity).toFixed(2);
    const transparency = (1 - clamp01(panelOpacity)).toFixed(2);
    root.style.setProperty("--echo-aura-density", density);
    root.style.setProperty("--echo-aura-transparency", transparency);
    return () => {
      root.style.removeProperty("--echo-aura-density");
      root.style.removeProperty("--echo-aura-transparency");
    };
  }, [panelOpacity]);
  React.useEffect(() => {
    const offPersona = ai3.core.on("personaChange", (signal) => {
      if (signal.data) {
        setPersona(signal.data as PersonaProfile);
      }
    });
    setPersona(ai3.personas.getPersona());
    return () => {
      if (typeof offPersona === "function") offPersona();
    };
  }, [ai3]);
  const refreshContextSummary = React.useCallback(() => {
    setContextSummary(ai3.cluster?.summarizeModules?.() ?? {});
  }, [ai3]);
  React.useEffect(() => {
    refreshContextSummary();
  }, [refreshContextSummary]);
  React.useEffect(() => {
    const offTelemetry = ai3.core?.on?.("telemetryUpdate", () => {
      setAvgSentiment(ai3.telemetry?.getAverageSentiment?.() ?? 0.5);
    });
    return () => {
      if (typeof offTelemetry === "function") offTelemetry();
    };
  }, [ai3]);
  const requestMicrophoneAccess = React.useCallback(async () => {
    if (typeof navigator === "undefined") return false;
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.getUserMedia) {
      return true;
    }
    if (micRequestPendingRef.current) {
      return true;
    }
    micRequestPendingRef.current = true;
    try {
      let stream: MediaStream;
      try {
        stream = await mediaDevices.getUserMedia(MIC_CONSTRAINTS);
      } catch (primaryError) {
        try {
          stream = await mediaDevices.getUserMedia({ audio: true });
        } catch {
          throw primaryError;
        }
      }
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      micRequestPendingRef.current = false;
      return true;
    } catch (error: any) {
      micRequestPendingRef.current = false;
      const reason = error?.name || "permission-denied";
      if (micErrorRef.current !== reason) {
        micErrorRef.current = reason;
        setHistory((h) => [
          ...h,
          {
            role: "ai",
            text: "I need permission to use your microphone. Please click Allow in your browser bar, then toggle the mic button again.",
          },
        ]);
      }
      return false;
    }
  }, []);
  React.useEffect(() => {
    const id = window.setTimeout(() => {
      const hasCanvas = !!containerRef.current?.querySelector("canvas");
      if (!hasCanvas) setFallback(true);
    }, 500);
    return () => window.clearTimeout(id);
  }, []);
  React.useEffect(() => {
    if (!fallback) return;
    const retry = window.setInterval(() => {
      const hasCanvas = !!containerRef.current?.querySelector("canvas");
      if (hasCanvas) {
        setFallback(false);
        window.clearInterval(retry);
      }
    }, 1000);
    return () => window.clearInterval(retry);
  }, [fallback]);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isStudio = pathname.startsWith("/studio");
  const { lang } = useI18n();
  const speechLocale = React.useMemo(
    () =>
      (
        ({
          en: "en-US",
          es: "es-ES",
          fr: "fr-FR",
          pt: "pt-BR",
          it: "it-IT",
        }) as const
      )[lang] || "en-US",
    [lang],
  );
  const [shouldListen, setShouldListen] = React.useState(() => {
    try {
      const saved = safeGet("echo.mic");
      if (saved === "1") return true;
      return false;
    } catch {
      return false;
    }
  });
  const [listening, setListening] = React.useState(false);
  const shouldListenRef = React.useRef(shouldListen);
  const micErrorRef = React.useRef<string | null>(null);
  const micNudgeRef = React.useRef(false);
  const recognitionRestartRef = React.useRef<number | null>(null);
  const recogRef = React.useRef<any>(null);
  const speechAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const speechUtteranceRef = React.useRef<SpeechSynthesisUtterance | null>(
    null,
  );
  const micRequestPendingRef = React.useRef(false);
  const plannerAbortRef = React.useRef<AbortController | null>(null);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR && micErrorRef.current !== "unsupported") {
      micErrorRef.current = "unsupported";
      setHistory((h) => [
        ...h,
        {
          role: "ai",
          text: "Voice capture is not supported in this browser. Please use the chat input or switch to Chrome / Edge for microphone features.",
        },
      ]);
    }
  }, []);
  const [voiceOn, setVoiceOn] = React.useState(() => {
    const saved = safeGet("echo.tts");
    return saved === null ? true : saved === "1";
  });
  const [voiceName, setVoiceName] = React.useState(
    () => safeGet("echo.voice") || "",
  );
  const voicesRef = React.useRef<SpeechSynthesisVoice[]>([]);
  const [ttsRate] = React.useState<number>(() =>
    parseFloat(safeGet("echo.tts.rate") || "0.95"),
  );
  const [ttsPitch] = React.useState<number>(() =>
    parseFloat(safeGet("echo.tts.pitch") || "1.02"),
  );
  React.useEffect(() => {
    shouldListenRef.current = shouldListen;
  }, [shouldListen]);
  React.useEffect(() => {
    if (!shouldListen) {
      micNudgeRef.current = false;
      return;
    }
    const timerId = window.setTimeout(() => {
      if (!listening && shouldListenRef.current && !micNudgeRef.current) {
        micNudgeRef.current = true;
        setHistory((h) => [
          ...h,
          {
            role: "ai",
            text: "I'm still waiting for microphone input. If you already allowed access, please try speaking again or toggle the mic off and on.",
          },
        ]);
      }
    }, 4000);
    return () => window.clearTimeout(timerId);
  }, [shouldListen, listening]);
  React.useEffect(() => {
    safeSet("echo.mic", shouldListen ? "1" : "0");
    if (!shouldListen) {
      if (recognitionRestartRef.current !== null) {
        window.clearTimeout(recognitionRestartRef.current);
        recognitionRestartRef.current = null;
      }
      const recog = recogRef.current;
      if (recog) {
        try {
          recog.stop();
        } catch {}
      }
      setListening(false);
      return;
    }
    let cancelled = false;
    const activate = async () => {
      const granted = await requestMicrophoneAccess();
      if (!granted) {
        if (!cancelled) {
          setShouldListen(false);
        }
        return;
      }
      const recog = ensureRecog();
      if (!recog) {
        if (micErrorRef.current !== "unsupported") {
          micErrorRef.current = "unsupported";
          setHistory((h) => [
            ...h,
            {
              role: "ai",
              text: "Microphone is not supported in this browser. Please enable it or switch to a compatible browser.",
            },
          ]);
        }
        if (!cancelled) {
          setShouldListen(false);
        }
        return;
      }
      try {
        recog.start();
      } catch (error: any) {
        if (error?.name !== "InvalidStateError") {
          if (micErrorRef.current !== "start-error") {
            micErrorRef.current = "start-error";
            setHistory((h) => [
              ...h,
              {
                role: "ai",
                text: "I couldn’t access the microphone. Please allow microphone permissions and try again.",
              },
            ]);
          }
        }
      }
    };
    activate();
    return () => {
      cancelled = true;
    };
  }, [shouldListen, speechLocale, requestMicrophoneAccess]);
  React.useEffect(() => {
    const onAsk = (e: any) => {
      const p = (e?.detail?.prompt || "").toString();
      if (!p) return;
      setPinned(true);
      setHovering(true);
      setOpen(true);
      setHistory((h) => [...h, { role: "user", text: p }]);
      callPlanner(p)
        .then((reply) => {
          if (!reply) {
            return;
          }
          setHistory((h) => [...h, { role: "ai", text: reply }]);
          speak(reply);
        })
        .catch((error) => {
          if (isAbortError(error)) {
            return;
          }
          console.error("planner_echo_ask_error", error);
          setHistory((h) => [
            ...h,
            {
              role: "ai",
              text: "I tried to respond but ran into an issue. Please try again.",
            },
          ]);
        });
    };
    window.addEventListener("echo:ask", onAsk as any);
    return () => window.removeEventListener("echo:ask", onAsk as any);
  }, []);
  React.useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
      const primary = (speechLocale || "en").split("-")[0].toLowerCase();
      if (!voiceName && voicesRef.current.length) {
        const preferred =
          voicesRef.current.find(
            (v) => (v.lang || "").toLowerCase() === speechLocale.toLowerCase(),
          ) ||
          voicesRef.current.find((v) =>
            (v.lang || "").toLowerCase().startsWith(primary),
          ) ||
          voicesRef.current.find((v) => /en/i.test(v.lang || "")) ||
          voicesRef.current[0];
        setVoiceName(preferred?.name || "");
      }
    };
    load();
    (window.speechSynthesis as any).onvoiceschanged = load;
  }, [speechLocale, voiceName]);
  function smallTalk(text: string) {
    const m = text.toLowerCase();
    const hi: Record<string, string> = {
      en: "Hi! I'm Echo. Tell me what to build and I'll draft a plan.",
      es: "¡Hola! Soy Echo. Dime qué construir y haré un plan.",
      fr: "Salut ! Je suis Echo. Dis-moi quoi construire et je ferai un plan.",
      pt: "Oi! Eu sou a Echo. Diga o que devo construir e eu faço um plano.",
      it: "Ciao! Sono Echo. Dimmi cosa costruire e preparo un piano.",
    };
    const status: Record<string, string> = {
      en: "Doing great and ready to code. What module should we create?",
      es: "Muy bien y lista para codificar. ¿Qué m����dulo creamos?",
      fr: "Tout va bien, prête à coder. Quel module créons-nous ?",
      pt: "Tudo ótimo e pronta para codar. Qual módulo criamos?",
      it: "Tutto bene e pronta a codificare. Quale modulo creiamo?",
    };
    const yw: Record<string, string> = {
      en: "You're welcome! Want me to apply changes to /generated?",
      es: "¡De nada! ¿Quieres que aplique cambios en /generated?",
      fr: "Avec plaisir ! Voulez-vous que j'applique les changements dans /generated ?",
      pt: "De nada! Quer que eu aplique as mudanças em /generated?",
      it: "Prego! Vuoi che applichi le modifiche in /generated?",
    };
    if (/\b(hi|hello|hey|ol[aá]|hola|salut|ciao)\b/.test(m))
      return hi[lang] || hi.en;
    if (
      /how are you|como (vai|est[aá])|como t[a��]|como va|comment ca va|come stai/.test(
        m,
      )
    )
      return status[lang] || status.en;
    if (/thank|obrigad|gracias|merci|grazie/.test(m)) return yw[lang] || yw.en;
    if (/(what can you do|capab|skills|how can you help)/.test(m))
      return "I can draft order guides, surface inventory gaps, and prep purchase orders—tell me the recipes and covers.";
    return null;
  }
  function parseLang(s: string): null | import("@/i18n").Lang {
    const m = s.toLowerCase();
    if (/brazilian\s*portuguese|portugu[êe]s\s*(br|brasileir)/.test(m))
      return "pt";
    if (/portuguese|portugu[êe]s/.test(m)) return "pt";
    if (/spanish|espa[����n]ol/.test(m)) return "es";
    if (/french|fran[çc]ais/.test(m)) return "fr";
    if (/italian|italiano/.test(m)) return "it";
    if (/english|ingl[eê]s|en-us|en\b/.test(m)) return "en";
    return null;
  }
  async function handleCommand(prompt: string) {
    const m = prompt.trim();
    // language change
    const to = parseLang(m);
    if (/\b(lang|language|idioma)\b/i.test(m) && to) {
      safeSet("lang", to);
      try {
        setTimeout(() => window.dispatchEvent(new Event("storage")), 0);
      } catch {}
      try {
        (await import("@/i18n")).useI18n;
      } catch {}
      try {
        (window as any)._setLang ? (window as any)._setLang(to) : null;
      } catch {}
      try {
        (window as any).document?.dispatchEvent(
          new CustomEvent("i18n:lang", { detail: to }),
        );
      } catch {}
      try {
        /* if provider present */
      } catch {}
      return `Language set to ${to.toUpperCase()}`;
    }
    // navigation
    if (/\b(go to|open|navigate|mostrar|abrir)\b/i.test(m)) {
      if (/\borb\b/i.test(m)) {
        navigate("/echo-controls");
        return "Opening Orb controls";
      }
      if (/\bstudio\b/i.test(m)) {
        navigate("/studio");
        return "Opening Studio";
      }
      if (/\bblueprint\b/i.test(m)) {
        navigate("/");
        return "Opening Blueprint";
      }
      if (/scorecard/i.test(m)) {
        navigate("/studio?task=Scorecard&tab=interact");
        return "Opening Scorecard";
      }
      if (/coder|code/i.test(m)) {
        navigate("/studio?task=Coder&tab=code");
        return "Opening Coder";
      }
      if (/planner/i.test(m)) {
        navigate("/studio?task=Planner&tab=seed");
        return "Opening Planner";
      }
      if (/interact/i.test(m)) {
        navigate("/studio?task=Interact&tab=interact");
        return "Opening Interact";
      }
    }
    if (
      /(chat|panel|window|interface|ui|ux)/i.test(m) &&
      /(transparent|opacity|aura|glass|dense|opaque|see\s*through)/i.test(m)
    ) {
      if (/reset|default/i.test(m)) {
        updatePanelOpacity(0.82);
        return "Chat aura reset to default density";
      }
      const numeric = m.match(/(\d{1,3})\s*%?/);
      if (numeric) {
        const val = parseFloat(numeric[1] || "0");
        const normalized = clamp01(val > 1 ? val / 100 : val);
        updatePanelOpacity(normalized);
        return `Chat aura tuned to ${Math.round(normalized * 100)}% density`;
      }
      const step = 0.08;
      if (
        /(less\s*transparent|more\s*opaque|denser|thicker|solid|stronger)/i.test(
          m,
        )
      ) {
        const next = clamp01(panelOpacity + step);
        updatePanelOpacity(next);
        return `Chat aura boosted to ${Math.round(next * 100)}% density`;
      }
      if (/(more\s*transparent|lighter|airier|softer|thinner)/i.test(m)) {
        const next = clamp01(panelOpacity - step);
        updatePanelOpacity(next);
        return `Chat aura softened to ${Math.round(next * 100)}% density`;
      }
      return `Current chat aura is ${Math.round(panelOpacity * 100)}% density.`;
    }
    // tools
    if (/snapshot|backup/i.test(m)) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort("Snapshot request timeout"), 15000);
        const r = await fetch("/api/zaro/snapshot", {
          method: "POST",
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const j = await r.json();
        return r.ok ? "Snapshot saved" : "Snapshot failed";
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError")
          return "Snapshot timeout";
        return "Snapshot error";
      }
    }
    if (/integrity|check/i.test(m)) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort("Integrity check request timeout"), 15000);
        const r = await fetch("/api/zaro/integrity", {
          method: "POST",
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const j = await r.json();
        return r.ok || j.ok
          ? `${(j.changes || []).length} change(s)`
          : "Integrity failed";
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError")
          return "Integrity timeout";
        return "Integrity error";
      }
    }
    if (/restore/i.test(m)) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort("Restore request timeout"), 15000);
        const r = await fetch("/api/zaro/restore", {
          method: "POST",
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const j = await r.json();
        if (r.ok && j.ok) {
          setTimeout(() => window.location.reload(), 300);
        }
        return r.ok && j.ok ? "Restored" : "Restore failed";
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError")
          return "Restore timeout";
        return "Restore error";
      }
    }
    if (/package|pack/i.test(m)) {
      try {
        window.dispatchEvent(new CustomEvent("module:intent"));
        window.dispatchEvent(new CustomEvent("module:dryrun"));
      } catch {}
      return "Opening package tools";
    }
    if (/db\s*transfer|migrate|export/i.test(m)) {
      try {
        window.dispatchEvent(new CustomEvent("ui:dbtransfer"));
      } catch {}
      return "Open DB transfer";
    }
    if (
      /\b(help desk|help(?:\s+me)?|tour|walkthrough)\b/i.test(m) ||
      /\b(start|open|begin|show)\b.*\bguide\b/i.test(m)
    ) {
      try {
        window.dispatchEvent(
          new CustomEvent("guide:start", {
            detail: {
              steps: [
                { selector: "header", text: "This is the header" },
                { selector: "nav", text: "Use the menu to navigate" },
                { selector: "#root", text: "Main content area" },
              ],
            },
          }),
        );
      } catch {}
      return "Starting guide";
    }
    // mic / voice
    if (/\b(mute|silence)\b/i.test(m)) {
      setVoiceOn(false);
      return "Voice replies off";
    }
    if (/\b(unmute|speak)\b/i.test(m)) {
      setVoiceOn(true);
      return "Voice replies on";
    }
    if (/\b(silence|mute)\b/i.test(m)) {
      setVoiceOn(false);
      return "Voice replies off";
    }
    if (/\bstart (listening|mic)\b/i.test(m)) {
      if (!listening) toggleMic();
      return "Listening";
    }
    if (/\bstop (listening|mic)\b/i.test(m)) {
      if (listening) toggleMic();
      return "Stopped listening";
    }
    // rollback
    if (/\bpanic\b|\brollback\b/i.test(m)) {
      try {
        const r = await fetch("/api/rollback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (r.ok) return "Rolled back last apply";
        return "Rollback failed";
      } catch {
        return "Rollback error";
      }
    }
    const mCreate = m.match(/^create (?:a )?(?:new )?file\s+(.+)$/i);
    if (mCreate) {
      const rel = mCreate[1].trim().replace(/^\//, "");
      try {
        const r = await fetch("/api/write-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relPath: rel, contents: "" }),
        });
        if (r.ok) {
          window.dispatchEvent(
            new CustomEvent("code:open", { detail: { path: "/" + rel } }),
          );
          return `Created ${rel}`;
        }
        return "Create failed";
      } catch {
        return "Create error";
      }
    }
    return null;
  }
  function isAbortError(error: unknown, controller?: AbortController | null) {
    try {
      if (controller?.signal?.aborted) {
        return true;
      }
      if (!error) {
        return false;
      }
      if (
        typeof DOMException !== "undefined" &&
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return true;
      }
      if (typeof error === "string") {
        const s = error.toLowerCase();
        if (s.includes("abort") || s.includes("signal is aborted")) return true;
        return false;
      }
      if (typeof error === "object" && error !== null) {
        const name = (error as any)?.name;
        if (name === "AbortError" || name === "DOMException") {
          return true;
        }
        const message = (error as any)?.message || (error as any)?.error;
        if (typeof message === "string") {
          return /(abort|aborted|the user aborted|signal is aborted)/i.test(
            message,
          );
        }
      }
    } catch (e) {
      // fall through
    }
    return false;
  }

  async function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  const networkErrorNotifiedRef = React.useRef(false);
  async function safeFetch(input: RequestInfo | URL, init?: RequestInit) {
    // quick offline check
    try {
      if (
        typeof navigator !== "undefined" &&
        "onLine" in navigator &&
        !(navigator as any).onLine
      ) {
        console.debug("safeFetch: offline, aborting", input);
        if (!networkErrorNotifiedRef.current) {
          networkErrorNotifiedRef.current = true;
          setHistory((h) => [
            ...h,
            {
              role: "ai",
              text: "You appear to be offline. Requests will be retried when your connection returns.",
            },
          ]);
          window.setTimeout(
            () => (networkErrorNotifiedRef.current = false),
            6000,
          );
        }
        return null;
      }
    } catch {}

    const maxRetries = 2;
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const res = await fetch(input, init);
        return res;
      } catch (error: any) {
        // if aborted, stop retrying
        if (isAbortError(error)) {
          return null;
        }
        // network error like "Failed to fetch" or CORS/network down
        const message =
          (error && (error.message || String(error))) || String(error);
        console.warn("safeFetch attempt failed", {
          input,
          attempt,
          error: message,
        });
        // last attempt -> log and return null
        if (attempt === maxRetries) {
          if (!isAbortError(error)) {
            console.error("planner_fetch_error", { input, error });
            if (!networkErrorNotifiedRef.current) {
              networkErrorNotifiedRef.current = true;
              setHistory((h) => [
                ...h,
                {
                  role: "ai",
                  text: "Server unreachable. Please check your network or try again later.",
                },
              ]);
              window.setTimeout(
                () => (networkErrorNotifiedRef.current = false),
                6000,
              );
            }
          } else {
            console.debug("planner_fetch_error suppressed abort", { input });
          }
          return null;
        }
        // backoff
        const backoff = 200 * Math.pow(2, attempt);
        try {
          await sleep(backoff + Math.random() * 100);
        } catch {}
        attempt++;
        continue;
      }
    }
    return null;
  }

  async function callPlanner(prompt: string) {
    const message = prompt.trim() || prompt;
    cancelPlanner({ preservePending: true });
    const talk = smallTalk(message);
    if (talk) {
      return talk;
    }
    const cmd = await handleCommand(message);
    if (cmd) {
      return cmd;
    }
    const controller = new AbortController();
    plannerAbortRef.current = controller;

    // Add timeout for planner requests (30 seconds)
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    timeoutHandle = setTimeout(() => {
      controller.abort("Planner request timeout");
      console.debug("planner_timeout");
    }, 30000);

    const isActive = () =>
      !controller.signal.aborted && plannerAbortRef.current === controller;
    const ensureActive = () => isActive();
    try {
      let echoResponse: any = null;
      try {
        console.debug("planner_calling_echo_api", {
          message: message.substring(0, 50),
        });
        echoResponse = await safeFetch("/api/echo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: message, locale: speechLocale }),
          signal: controller.signal,
        });
        console.debug("planner_echo_response", {
          status: echoResponse?.status,
        });
      } catch (error) {
        if (!isAbortError(error, controller)) {
          console.error("planner_echo_fetch_exception", error);
        }
      }

      if (!ensureActive()) {
        return null;
      }

      if (echoResponse) {
        // read body once to avoid "body stream already read"
        let echoText: string | null = null;
        try {
          echoText = await echoResponse.text();
        } catch (error) {
          if (isAbortError(error, controller)) {
            return null;
          }
          console.error("planner_echo_read_error", error);
        }

        if (!ensureActive()) {
          return null;
        }

        let ej: any = {};
        try {
          ej = echoText ? JSON.parse(echoText) : {};
        } catch (error) {
          // non-JSON response, keep ej as {} but don't fail hard
          ej = {};
        }

        if (echoResponse.ok) {
          if (ej?.ok && ej?.text) {
            return ej.text;
          }
        } else {
          try {
            const offline =
              lang === "pt"
                ? "LLM indisponível"
                : lang === "es"
                  ? "LLM no disponible"
                  : lang === "fr"
                    ? "LLM indisponible"
                    : lang === "it"
                      ? "LLM non disponibile"
                      : "LLM unavailable";
            setHistory((h) => [
              ...h,
              {
                role: "ai",
                text: `${offline}: ${ej?.error || echoResponse.status}`,
              },
            ]);
          } catch (error) {
            if (isAbortError(error, controller)) {
              return null;
            }
            console.error("planner_echo_error", error);
          }
        }
      }
      let planResponse: any = null;
      try {
        console.debug("planner_calling_plan_api", {
          message: message.substring(0, 50),
        });
        planResponse = await safeFetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: message,
            route: "/generated",
            layoutTemplate: "Minimal",
          }),
          signal: controller.signal,
        });
        console.debug("planner_plan_response", {
          status: planResponse?.status,
        });
      } catch (error) {
        if (!isAbortError(error, controller)) {
          console.error("planner_fetch_exception", error);
        }
      }

      if (!ensureActive()) {
        return null;
      }
      if (!planResponse) {
        return lang === "pt"
          ? "Erro de rede"
          : lang === "es"
            ? "Error de red"
            : lang === "fr"
              ? "Erreur réseau"
              : lang === "it"
                ? "Errore di rete"
                : "Network error";
      }
      if (!planResponse.ok) {
        return lang === "pt"
          ? "Falha no planejador"
          : lang === "es"
            ? "Fallo del planificador"
            : lang === "fr"
              ? "��chec du planificateur"
              : lang === "it"
                ? "Pianificatore non riuscito"
                : "Planner failed";
      }
      try {
        // read plan response body once to avoid double-read issues
        let planText: string | null = null;
        try {
          planText = await planResponse.text();
        } catch (error) {
          if (isAbortError(error, controller)) {
            return null;
          }
          console.error("planner_plan_read_error", error);
        }
        if (!ensureActive()) {
          return null;
        }
        let j: any = {};
        try {
          j = planText ? JSON.parse(planText) : {};
        } catch (error) {
          j = {};
        }
        const top =
          j?.candidates?.[0]?.title ||
          (lang === "pt"
            ? "Alteração planejada"
            : lang === "es"
              ? "Cambio planificado"
              : lang === "fr"
                ? "Changement planifié"
                : lang === "it"
                  ? "Modifica pianificata"
                  : "Planned change");
        window.dispatchEvent(
          new CustomEvent("echo:plan", { detail: { summary: top } }),
        );
        const prefix =
          lang === "pt"
            ? "Plano"
            : lang === "es"
              ? "Plan"
              : lang === "fr"
                ? "Plan"
                : lang === "it"
                  ? "Piano"
                  : "Plan";
        return `${prefix}: ${top}`;
      } catch (error) {
        if (isAbortError(error, controller)) {
          return null;
        }
        console.error("planner_plan_parse_error", error);
        return lang === "pt"
          ? "Erro de rede"
          : lang === "es"
            ? "Error de red"
            : lang === "fr"
              ? "Erreur réseau"
              : lang === "it"
                ? "Errore di rete"
                : "Network error";
      }
    } catch (error) {
      if (isAbortError(error, controller)) {
        return null;
      }
      throw error;
    } finally {
      clearTimeout(timeoutHandle);
      if (plannerAbortRef.current === controller) {
        plannerAbortRef.current = null;
      }
    }
  }
  const [premiumVoices, setPremiumVoices] = React.useState<
    { id: string; name: string; gender: string; language?: string }[] | null
  >(null);
  const [usePremium, setUsePremium] = React.useState<boolean>(
    () => safeGet("echo.tts.premium") !== "0", // Default to true (premium)
  );
  const [premiumVoiceId, setPremiumVoiceId] = React.useState<string>(
    () => safeGet("echo.tts.premium.voice") || "",
  );
  const [lastTts, setLastTts] = React.useState<{
    blob: Blob | null;
    voiceId?: string;
    text?: string;
    url?: string;
  } | null>(null);
  const stopSpeaking = React.useCallback(() => {
    setSpeaking(false);
    if (speechAudioRef.current) {
      try {
        speechAudioRef.current.pause();
      } catch {}
      speechAudioRef.current = null;
    }
    if (speechUtteranceRef.current) {
      speechUtteranceRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }, []);
  const resetTtsCache = React.useCallback(() => {
    setLastTts((prev) => {
      if (prev?.url) {
        try {
          URL.revokeObjectURL(prev.url);
        } catch {}
      }
      return null;
    });
  }, []);
  const cancelPlanner = React.useCallback(
    (options?: { preservePending?: boolean }) => {
      if (plannerAbortRef.current) {
        try {
          // include a reason when aborting so runtime messages are clearer and easier to suppress
          const reason =
            typeof DOMException !== "undefined"
              ? new DOMException("User cancelled planner request", "AbortError")
              : ("User cancelled planner request" as any);
          try {
            (plannerAbortRef.current as any).abort(reason);
          } catch (e) {
            // fallback to no-reason abort if environment doesn't support reason
            try {
              plannerAbortRef.current!.abort();
            } catch {}
          }
        } catch {}
      }
      plannerAbortRef.current = null;
      if (!options?.preservePending) {
        setPendingReply(false);
      }
    },
    [],
  );
  const appendAiMessage = React.useCallback(
    (text: string, options?: { speak?: boolean }) => {
      setHistory((h) => [...h, { role: "ai", text }]);
      if (options?.speak) {
        speak(text);
      }
    },
    [speak],
  );
  const handleNewChat = React.useCallback(() => {
    window.clearTimeout(timer.current);
    cancelPlanner();
    stopSpeaking();
    resetTtsCache();
    lastSubmitRef.current = null;
    lastTranscriptRef.current = "";
    transcriptThresholdRef.current = BASE_TRANSCRIPT_CONFIDENCE;
    transcriptRejectsRef.current = 0;
    lowConfidenceNotifiedRef.current = false;
    setValue("");
    setHistory([]);
    setPendingReply(false);
    ai3.bus.publish("EchoChat:reset", {});
    setAvgSentiment(ai3.telemetry?.getAverageSentiment?.() ?? 0.5);
    setContextSummary({});
    appendAiMessage("Chat reset. Ready when you are!", { speak: true });
  }, [ai3, appendAiMessage, cancelPlanner, resetTtsCache, stopSpeaking]);
  const announceAuraChange = React.useCallback(() => {
    const current = Math.round(clamp01(panelOpacityRef.current) * 100);
    if (current === lastAuraAnnounceRef.current) return;
    lastAuraAnnounceRef.current = current;
    appendAiMessage(`Chat aura set to ${current}% density.`, { speak: false });
  }, [appendAiMessage]);
  React.useEffect(() => {
    safeSet("echo.tts", voiceOn ? "1" : "0");
  }, [voiceOn]);
  const prevVoiceOnRef = React.useRef(voiceOn);
  React.useEffect(() => {
    if (prevVoiceOnRef.current === voiceOn) return;
    if (!voiceOn) {
      stopSpeaking();
      resetTtsCache();
      appendAiMessage("Voice replies muted.");
    } else {
      appendAiMessage("Voice replies engaged.", { speak: true });
    }
    prevVoiceOnRef.current = voiceOn;
  }, [voiceOn, appendAiMessage, resetTtsCache, stopSpeaking]);
  React.useEffect(() => {
    safeSet("echo.voice", voiceName);
  }, [voiceName]);
  React.useEffect(() => {
    safeSet("echo.tts.premium", usePremium ? "1" : "0");
  }, [usePremium]);
  React.useEffect(() => {
    if (premiumVoiceId) safeSet("echo.tts.premium.voice", premiumVoiceId);
  }, [premiumVoiceId]);
  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/tts/voices");
        if (r.ok) {
          const j = await r.json();
          if (j?.ok !== false) {
            const list = (j.voices || []) as {
              id: string;
              name: string;
              gender: string;
              language?: string;
            }[];
            setPremiumVoices(list);
            const primary = (speechLocale || "en").split("-")[0].toLowerCase();
            const langMatch = (v: { language?: string }) => {
              const L = (v.language || "").toLowerCase();
              if (!L) return 0;
              if (speechLocale && L.includes(speechLocale.toLowerCase()))
                return 3;
              if (primary && L.startsWith(primary)) return 2;
              if (/portugu/.test(L) && primary === "pt") return 2;
              return 0;
            };
            const pick = (names: string[]) =>
              list.find((v) => names.includes(v.name))?.id;
            const curated = [
              "Fernanda - AI Agent",
              "Fernanda",
              "Samara X",
              "Rachel",
              "Bella",
              "Charlotte",
              "Antoni",
              "Adam",
              "Josh",
            ];
            const byLang = [...list].sort(
              (a, b) => langMatch(b) - langMatch(a),
            );
            const preferred =
              pick(curated) || byLang[0]?.id || list[0]?.id || "";
            if (!premiumVoiceId && preferred) setPremiumVoiceId(preferred);
            if (!usePremium && preferred) setUsePremium(true);
          }
        }
      } catch {}
    })();
  }, [speechLocale]);

  async function speak(text: string) {
    if (!voiceOn) return;
    stopSpeaking();
    resetTtsCache();
    // Prefer premium if available; auto-pick curated default if none selected
    let list = premiumVoices || [];
    if (!list.length) {
      try {
        const r = await fetch("/api/tts/voices");
        if (r.ok) {
          const j = await r.json();
          if (j?.ok !== false) {
            list = (j.voices || []) as any[];
            setPremiumVoices(list as any);
          }
        }
      } catch {}
    }
    let vid = premiumVoiceId;
    if (!vid && list.length) {
      const primary = (speechLocale || "en").split("-")[0].toLowerCase();
      const langMatch = (v: { language?: string }) => {
        const L = (v as any).language
          ? String((v as any).language).toLowerCase()
          : "";
        if (!L) return 0;
        if (speechLocale && L.includes(speechLocale.toLowerCase())) return 3;
        if (primary && L.startsWith(primary)) return 2;
        if (/portugu/.test(L) && primary === "pt") return 2;
        return 0;
      };
      const pick = (names: string[]) =>
        list.find((v: any) => names.includes(v.name))?.id;
      const curated = [
        "Fernanda - AI Agent",
        "Fernanda",
        "Samara X",
        "Rachel",
        "Bella",
        "Charlotte",
        "Antoni",
        "Adam",
        "Josh",
      ];
      const byLang = [...list].sort(
        (a: any, b: any) => langMatch(b) - langMatch(a),
      );
      vid = pick(curated) || byLang[0]?.id || list[0].id;
      setPremiumVoiceId(vid);
      setUsePremium(true);
    }
    if ((usePremium || list.length > 0) && vid) {
      try {
        const r = await fetch("/api/tts/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voiceId: vid }),
        });
        if (r.ok) {
          const blob = await r.blob();
          try {
            if (lastTts?.url) URL.revokeObjectURL(lastTts.url);
          } catch {}
          const url = URL.createObjectURL(blob);
          setLastTts({ blob, voiceId: vid, text, url });
          const audio = new Audio(url);
          audio.preload = "auto";
          const reset = () => {
            if (speechAudioRef.current === audio) {
              speechAudioRef.current = null;
            }
            setSpeaking(false);
          };
          audio.onplaying = () => setSpeaking(true);
          audio.onended = reset;
          audio.onpause = reset;
          audio.onerror = reset;
          speechAudioRef.current = audio;
          audio.play().catch(() => {
            reset();
          });
          return;
        }
      } catch {}
    }
    if (!("speechSynthesis" in window)) {
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    speechUtteranceRef.current = u;
    u.lang = speechLocale;
    const primary = (speechLocale || "en").split("-")[0].toLowerCase();
    const v =
      voicesRef.current.find((v) => v.name === voiceName) ||
      voicesRef.current.find(
        (v) => (v.lang || "").toLowerCase() === speechLocale.toLowerCase(),
      ) ||
      voicesRef.current.find((v) =>
        (v.lang || "").toLowerCase().startsWith(primary),
      ) ||
      voicesRef.current.find((v) => /en/i.test(v.lang || "")) ||
      voicesRef.current[0];
    if (v) u.voice = v;
    u.rate = ttsRate;
    u.pitch = ttsPitch;
    u.volume = 1;
    u.onstart = () => {
      setSpeaking(true);
    };
    const finalize = () => {
      if (speechUtteranceRef.current === u) {
        speechUtteranceRef.current = null;
      }
      setSpeaking(false);
    };
    u.onend = finalize;
    u.onerror = finalize;
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      finalize();
    }
  }
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const messagesRef = React.useRef<HTMLDivElement | null>(null);
  const lastTranscriptRef = React.useRef("");
  const transcriptThresholdRef = React.useRef(BASE_TRANSCRIPT_CONFIDENCE);
  const transcriptRejectsRef = React.useRef(0);
  const lowConfidenceNotifiedRef = React.useRef(false);
  const lastSubmitRef = React.useRef<{ text: string; at: number } | null>(null);
  React.useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    const frame = window.requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [history, pendingReply, open]);
  async function submitPrompt(
    raw: string,
    options: { bypassLength?: boolean; preserveInput?: boolean } = {},
  ) {
    const text = raw.trim();
    if (!text) return;
    if (!options.bypassLength && text.length < 3) return;
    const now = Date.now();
    if (
      lastSubmitRef.current &&
      lastSubmitRef.current.text === text &&
      now - lastSubmitRef.current.at < 750
    ) {
      if (!options.preserveInput) {
        setValue("");
      }
      return;
    }
    lastSubmitRef.current = { text, at: now };
    window.clearTimeout(timer.current);
    stopSpeaking();
    resetTtsCache();
    ai3.telemetry?.capture?.({
      module: "EchoChat",
      sentiment: estimateSentiment(text),
      timestamp: Date.now(),
    });
    setAvgSentiment(ai3.telemetry?.getAverageSentiment?.() ?? 0.5);
    if (pendingReply) {
      cancelPlanner();
    }
    const personaSnapshot = ai3.personas.adaptToContext(text);
    setPersona(personaSnapshot);
    ai3.reason.addThought("Echo", `User: ${text}`, 0.65);
    void ai3.cluster?.syncContext("EchoChat", `user:${now}`, {
        role: "user",
        text,
        persona: personaSnapshot.mode,
      })
      .then(refreshContextSummary)
      .catch(() => undefined);
    ai3.bus.publish("EchoChat:user", { text, persona: personaSnapshot.mode });
    setPinned(true);
    setHovering(true);
    setOpen(true);
    setHistory((h) => [...h, { role: "user", text }]);
    lastTranscriptRef.current = "";
    setPendingReply(true);
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      let response: string | null = null;

      // Check if user is asking about weather
      const weatherMatch = text.match(
        /weather|temperature|celsius|fahrenheit|forecast|rain|cloud|outdoor|catering/i,
      );
      if (weatherMatch) {
        const locationMatch = text.match(
          /(?:in|at|for|weather\s+(?:in|at|for)?)\s+([A-Z][a-z\s]+)/i,
        );
        if (locationMatch) {
          const location = locationMatch[1].trim();
          const weatherService = getWeatherService();
          const weatherData = await weatherService
            .getWeather(location)
            .catch(() => null);

          if (weatherData) {
            response = weatherService.formatWeather(weatherData);
          } else {
            response = `For real-time weather data critical to your outdoor operations in ${location}, I recommend checking:\n\n📍 **Weather Sources:**\n• Weather.com - Detailed hourly forecasts\n• National Weather Service (weather.gov) - Official forecasts\n• Weather app on your phone - Push notifications for alerts\n• Local news stations - Regional weather specialists\n\n**For Outdoor Catering & Hospitality:**\nCheck wind speed (affects tent/patio setups), precipitation %, and temperature trends for the event window. Updated every 1-3 hours for best accuracy.`;
          }
        } else {
          response =
            "To check weather for your outdoor venue, tell me the location. For example: 'What's the weather forecast for Fort Lauderdale?' This will help me suggest where to monitor for outdoor catering, patio service, or tent setup planning.";
        }
      }

      // If no weather response, use planner
      if (!response) {
        try {
          const plannerResult = await callPlanner(text).catch((error: any) => {
            if (isAbortError(error)) {
              console.debug("planner_cancelled");
              return null;
            }
            console.error("planner_error", error);
            return null;
          });
          if (plannerResult == null) {
            // Return with a helpful message instead of silently returning
            response =
              lang === "pt"
                ? "Desculpe, não consegui processar sua solicitação no momento."
                : lang === "es"
                  ? "Disculpe, no pude procesar su solicitud en este momento."
                  : lang === "fr"
                    ? "Désolé, je n'ai pas pu traiter votre demande pour l'instant."
                    : lang === "it"
                      ? "Mi scusi, non ho potuto elaborare la tua richiesta in questo momento."
                      : "Sorry, I couldn't process your request at the moment.";
          } else {
            response =
              plannerResult && plannerResult.trim().length > 0
                ? plannerResult
                : "I heard you but need a little more detail to help.";
          }
        } catch (error) {
          console.error("planner_exception", error);
          response =
            lang === "pt"
              ? "Erro ao processar sua solicitação."
              : lang === "es"
                ? "Error al procesar su solicitud."
                : lang === "fr"
                  ? "Erreur lors du traitement de votre demande."
                  : lang === "it"
                    ? "Errore durante l'elaborazione della tua richiesta."
                    : "Error processing your request.";
        }
      }
      ai3.reason.addThought("Stratus", `Response: ${response}`, 0.82);
      void ai3.cluster?.syncContext("EchoChat", `ai:${Date.now()}`, {
          role: "ai",
          text: response,
          persona: personaSnapshot.mode,
        })
        .then(refreshContextSummary)
        .catch(() => undefined);
      setHistory((h) => [...h, { role: "ai", text: response }]);
      ai3.bus.publish("EchoChat:ai", {
        text: response,
        persona: personaSnapshot.mode,
      });
      const latency =
        (typeof performance !== "undefined" ? performance.now() : Date.now()) -
        started;
      ai3.telemetry?.capture?.({
        module: "EchoChat",
        sentiment: estimateSentiment(response),
        latencyMs: latency,
        emotion: response.includes("!") ? "excited" : undefined,
        timestamp: Date.now(),
      });
      setAvgSentiment(ai3.telemetry?.getAverageSentiment?.() ?? 0.5);
      await speak(response);
    } catch (error: any) {
      if (isAbortError(error)) {
        return;
      }
      ai3.telemetry?.capture?.({
        module: "EchoChat",
        sentiment: 0.2,
        timestamp: Date.now(),
      });
      setAvgSentiment(ai3.telemetry?.getAverageSentiment?.() ?? 0.5);
      setHistory((h) => [
        ...h,
        {
          role: "ai",
          text: "I heard you but ran into a hiccup processing that. Please try again in a moment.",
        },
      ]);
    } finally {
      setPendingReply(false);
    }
    if (!options.preserveInput) {
      setValue("");
    }
  }

  function onType(v: string) {
    setPinned(true);
    setHovering(true);
    setOpen(true);
    setValue(v);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void submitPrompt(v).catch((err: any) => {
        if (!isAbortError(err)) console.error("submitPrompt_error", err);
      });
    }, AUTOSUBMIT_DELAY);
  }
  React.useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (recognitionRestartRef.current !== null) {
        window.clearTimeout(recognitionRestartRef.current);
      }
      const recog = recogRef.current;
      if (recog) {
        try {
          recog.stop();
        } catch {}
      }
      cancelPlanner();
      stopSpeaking();
      resetTtsCache();
    },
    [cancelPlanner, stopSpeaking, resetTtsCache],
  );
  const transcriptDebounceRef = React.useRef<number | null>(null);
  function handleTranscript(text: string, options?: { confidence?: number }) {
    // Debounce incoming final transcripts to avoid rapid cancel/restart cycles
    if (transcriptDebounceRef.current !== null) {
      try {
        window.clearTimeout(transcriptDebounceRef.current);
      } catch {}
      transcriptDebounceRef.current = null;
    }
    transcriptDebounceRef.current = window.setTimeout(() => {
      const cleaned = text.trim();
      if (!cleaned) return;
      const confidence = options?.confidence;
      if (typeof confidence === "number") {
        const threshold = transcriptThresholdRef.current;
        if (confidence < threshold) {
          transcriptRejectsRef.current += 1;
          const drop =
            TRANSCRIPT_CONFIDENCE_STEP_DOWN +
            Math.max(0, transcriptRejectsRef.current - 1) * 0.05;
          const provisional = threshold - drop;
          const nextThreshold = Math.max(
            TRANSCRIPT_CONFIDENCE_FLOOR,
            Math.min(provisional, confidence - 0.02),
          );
          transcriptThresholdRef.current = nextThreshold;
          if (confidence < nextThreshold) {
            if (
              !lowConfidenceNotifiedRef.current &&
              transcriptRejectsRef.current >=
                TRANSCRIPT_LOW_CONFIDENCE_NOTICE_THRESHOLD
            ) {
              lowConfidenceNotifiedRef.current = true;
              setHistory((h) => [
                ...h,
                {
                  role: "ai",
                  text: "I'm hearing background noise. Try speaking closer to the mic or reduce other sounds.",
                },
              ]);
            }
            return;
          }
          transcriptRejectsRef.current = 0;
          lowConfidenceNotifiedRef.current = false;
        } else {
          transcriptRejectsRef.current = 0;
          lowConfidenceNotifiedRef.current = false;
          if (transcriptThresholdRef.current < BASE_TRANSCRIPT_CONFIDENCE) {
            const easedTarget = Math.max(
              TRANSCRIPT_CONFIDENCE_FLOOR,
              confidence - 0.05,
            );
            const nextThreshold = Math.min(
              BASE_TRANSCRIPT_CONFIDENCE,
              Math.max(transcriptThresholdRef.current, easedTarget) +
                TRANSCRIPT_CONFIDENCE_STEP_UP,
            );
            transcriptThresholdRef.current = nextThreshold;
          }
        }
      }
      if (lastTranscriptRef.current === cleaned) return;
      lastTranscriptRef.current = cleaned;
      setValue(cleaned);
      void submitPrompt(cleaned, { bypassLength: true }).catch((err: any) => {
        if (!isAbortError(err)) console.error("submitPrompt_error", err);
      });
    }, 150);
  }
  React.useEffect(() => {
    if (listening) return;
    lastTranscriptRef.current = "";
  }, [listening]);
  function ensureRecog() {
    const SR: any =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return null;
    if (!recogRef.current) {
      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.lang = speechLocale;
      const scheduleRestart = (delay = 600) => {
        if (recognitionRestartRef.current !== null) {
          window.clearTimeout(recognitionRestartRef.current);
        }
        recognitionRestartRef.current = window.setTimeout(() => {
          if (!shouldListenRef.current) return;
          try {
            r.start();
          } catch {}
        }, delay);
      };
      r.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) {
            const transcript = res[0]?.transcript || "";
            const confidence =
              typeof res[0]?.confidence === "number"
                ? res[0].confidence
                : undefined;
            handleTranscript(transcript, { confidence });
          }
        }
      };
      r.onstart = () => {
        if (recognitionRestartRef.current !== null) {
          window.clearTimeout(recognitionRestartRef.current);
          recognitionRestartRef.current = null;
        }
        micErrorRef.current = null;
        setListening(true);
      };
      r.onend = () => {
        setListening(false);
        if (shouldListenRef.current) {
          scheduleRestart();
        }
      };
      r.onaudioend = () => {
        if (shouldListenRef.current) {
          scheduleRestart(450);
        }
      };
      r.onerror = (event: any) => {
        setListening(false);
        const reason = event?.error || "unknown";
        if (reason === "not-allowed" || reason === "service-not-allowed") {
          if (micErrorRef.current !== "denied") {
            micErrorRef.current = "denied";
            setHistory((h) => [
              ...h,
              {
                role: "ai",
                text: "Microphone permission denied. Please enable it in your browser settings and try again.",
              },
            ]);
          }
          setShouldListen(false);
          return;
        }
        if (shouldListenRef.current) {
          scheduleRestart(800);
        }
      };
      recogRef.current = r;
    } else {
      try {
        recogRef.current.lang = speechLocale;
      } catch {}
    }
    return recogRef.current;
  }
  async function toggleMic() {
    if (shouldListen) {
      setShouldListen(false);
      return;
    }
    const granted = await requestMicrophoneAccess();
    if (!granted) {
      return;
    }
    const r = ensureRecog();
    if (!r) {
      if (micErrorRef.current !== "unsupported-toggle") {
        micErrorRef.current = "unsupported-toggle";
        setHistory((h) => [
          ...h,
          { role: "ai", text: "Microphone not supported in this browser." },
        ]);
      }
      return;
    }
    micErrorRef.current = null;
    setPinned(true);
    setHovering(true);
    setOpen(true);
    setShouldListen(true);
  }
  function togglePinnedState(force?: boolean) {
    setPinned((prev) => {
      const next = typeof force === "boolean" ? force : !prev;
      if (next) {
        setOpen(true);
      } else {
        setOpen(false);
        setHovering(false);
      }
      return next;
    });
  }
  const updatePanelOpacity = React.useCallback((value: number | string) => {
    const raw = typeof value === "number" ? value : parseFloat(value);
    if (Number.isNaN(raw)) return;
    const normalized = raw > 1.01 ? raw / 100 : raw;
    setPanelOpacity(clamp01(normalized));
  }, []);

  const displaySize = variant === "header" ? iconSize + 16 : iconSize;
  const popupPlacementClass =
    variant === "header"
      ? "absolute right-0 top-[calc(100%+14px)]"
      : isStudio
        ? "absolute bottom-[calc(100%+18px)] right-0"
        : "absolute top-[calc(100%+18px)] right-0";
  const panelMotionClass =
    hovering || pinned ? "opacity-100 scale-100" : "opacity-95 scale-[0.98]";
  const panelStyle = React.useMemo(
    () => computePanelStyle(panelOpacity),
    [panelOpacity],
  );
  const overlayStyle = React.useMemo(
    () => computeOverlayStyle(panelOpacity),
    [panelOpacity],
  );
  const bubbleStyles = React.useMemo(() => {
    const aiStart = 0.22 + panelOpacity * 0.45;
    const aiEnd = 0.12 + panelOpacity * 0.28;
    const userStart = 0.18 + panelOpacity * 0.32;
    const userEnd = 0.1 + panelOpacity * 0.24;
    return {
      ai: {
        background: `linear-gradient(135deg, hsl(var(--primary) / ${aiStart.toFixed(2)}), hsl(var(--primary) / ${aiEnd.toFixed(2)}))`,
        boxShadow: `0 0 38px hsl(var(--primary) / ${(0.28 + panelOpacity * 0.5).toFixed(2)})`,
      } as React.CSSProperties,
      user: {
        background: `linear-gradient(135deg, hsl(var(--foreground) / ${userStart.toFixed(2)}), hsl(var(--foreground) / ${userEnd.toFixed(2)}))`,
        boxShadow: `0 0 28px rgba(11,19,36, ${(0.24 + panelOpacity * 0.4).toFixed(2)})`,
      } as React.CSSProperties,
    };
  }, [panelOpacity]);
  const orbKey = variant === "header" ? "header-orb" : "fixed-orb";
  const baseOrbProps = React.useMemo(
    () => ({
      pattern,
      radius,
      speed,
      wobble,
      compactness,
      colorA,
      colorB,
      showRings: showRings && pattern !== "waves",
      ringSpeed,
      ringCount,
      ringParticles,
      ringRandomness,
      ringPalette: palette.ringPalette,
      ringColor: palette.ringColor,
      glowParticles,
      glowColor,
      glowSpeed,
      glowSize,
      dirAzimuth: dirAz,
      dirElevation: dirEl,
      omniGlow,
      helix: pattern === "classic" && helix,
      helixColor: palette.helixColor,
      helixParticles,
      helixRadius,
      helixPitch,
      helixSpeed,
      waveCols,
      waveRows,
      waveAmp,
      waveSpeed,
      waveSpacing,
      waveColor,
      chaosAttractor: chaosMode,
      chaosPoints,
      chaosDt,
      chaosSigma,
      chaosRho,
      chaosBeta,
      chaosA,
      chaosB,
      chaosC,
      chaosScale,
      chaosSpeed,
      chaosIntensity,
      chaosColor,
      tessellationType,
      tessellationCols,
      tessellationRows,
      tessellationScale,
      tessellationDepth,
      tessellationSpeed,
      tessellationWarp,
      tessellationColorA,
      tessellationColorB,
    }),
    [
      pattern,
      radius,
      speed,
      wobble,
      compactness,
      colorA,
      colorB,
      showRings,
      ringSpeed,
      ringCount,
      ringParticles,
      ringRandomness,
      palette.ringPalette,
      palette.ringColor,
      glowParticles,
      glowColor,
      glowSpeed,
      glowSize,
      dirAz,
      dirEl,
      omniGlow,
      helix,
      palette.helixColor,
      helixParticles,
      helixRadius,
      helixPitch,
      helixSpeed,
      waveCols,
      waveRows,
      waveAmp,
      waveSpeed,
      waveSpacing,
      waveColor,
      chaosMode,
      chaosPoints,
      chaosDt,
      chaosSigma,
      chaosRho,
      chaosBeta,
      chaosA,
      chaosB,
      chaosC,
      chaosScale,
      chaosSpeed,
      chaosIntensity,
      chaosColor,
      tessellationType,
      tessellationCols,
      tessellationRows,
      tessellationScale,
      tessellationDepth,
      tessellationSpeed,
      tessellationWarp,
      tessellationColorA,
      tessellationColorB,
    ],
  );
  const orbMood = React.useMemo<
    "idle" | "listening" | "processing" | "speaking"
  >(() => {
    if (speaking) return "speaking";
    if (pendingReply) return "processing";
    if (listening || shouldListen) return "listening";
    return "idle";
  }, [speaking, pendingReply, listening, shouldListen]);
  const orbProps = React.useMemo(() => {
    const base = baseOrbProps;
    const overrides: Record<string, any> = {};
    const baseGlow = base.glowColor ?? glowColor ?? "#39f3ff";
    const baseColorA = base.colorA ?? colorA ?? "#14e0ff";
    const baseColorB = base.colorB ?? colorB ?? "#ffe95c";
    switch (orbMood) {
      case "listening": {
        overrides.glowSpeed = (base.glowSpeed ?? 1.4) + 0.5;
        if (base.showRings) {
          overrides.ringSpeed = (base.ringSpeed ?? 0.6) + 0.35;
        }
        overrides.glowColor = lightenHexColor(baseGlow, 0.22);
        overrides.colorA = lightenHexColor(baseColorA, 0.15);
        overrides.colorB = lightenHexColor(baseColorB, 0.12);
        overrides.wobble = (base.wobble ?? 0.25) + 0.12;
        overrides.compactness = Math.min(1, (base.compactness ?? 0.9) + 0.05);
        if (base.pattern === "fractal") {
          overrides.chaosSpeed = (base.chaosSpeed ?? 0.7) * 1.2;
          overrides.chaosIntensity = Math.min(
            1,
            (base.chaosIntensity ?? 0.3) + 0.06,
          );
        }
        if (base.pattern === "tessellation") {
          overrides.tessellationSpeed = (base.tessellationSpeed ?? 0.85) * 1.15;
          overrides.tessellationDepth = (base.tessellationDepth ?? 0.45) * 1.1;
        }
        break;
      }
      case "processing": {
        if (base.pattern === "fractal") {
          overrides.chaosSpeed = (base.chaosSpeed ?? 0.7) * 1.45;
          overrides.chaosIntensity = Math.min(
            1,
            (base.chaosIntensity ?? 0.3) + 0.18,
          );
          overrides.showRings = Boolean(base.showRings);
        } else if (base.pattern === "tessellation") {
          overrides.tessellationSpeed = (base.tessellationSpeed ?? 0.85) * 1.35;
          overrides.tessellationDepth = (base.tessellationDepth ?? 0.45) * 1.3;
          overrides.tessellationWarp = Math.min(
            1,
            (base.tessellationWarp ?? 0.55) + 0.15,
          );
          overrides.tessellationColorA = lightenHexColor(baseColorA, 0.18);
          overrides.tessellationColorB = lightenHexColor(baseColorB, 0.18);
        } else {
          overrides.pattern = "waves";
          overrides.showRings = false;
          overrides.waveAmp = (base.waveAmp ?? 0.5) * 1.35;
          overrides.waveSpeed = (base.waveSpeed ?? 0.8) * 1.4;
          overrides.waveColor = lightenHexColor(
            base.waveColor ?? baseGlow,
            0.3,
          );
        }
        overrides.glowSpeed = (base.glowSpeed ?? 1.4) * 1.25;
        overrides.omniGlow = true;
        break;
      }
      case "speaking": {
        overrides.glowSpeed = (base.glowSpeed ?? 1.4) * 1.65;
        if (base.showRings) {
          overrides.ringSpeed = (base.ringSpeed ?? 0.6) * 1.55;
        }
        overrides.helixSpeed = (base.helixSpeed ?? 1) * 1.8;
        overrides.glowColor = lightenHexColor(baseGlow, 0.35);
        overrides.colorA = lightenHexColor(baseColorA, 0.28);
        overrides.colorB = lightenHexColor(baseColorB, 0.28);
        overrides.wobble = (base.wobble ?? 0.25) + 0.18;
        overrides.compactness = Math.min(1, (base.compactness ?? 0.9) + 0.08);
        if (base.pattern === "fractal") {
          overrides.chaosSpeed = (base.chaosSpeed ?? 0.7) * 1.75;
          overrides.chaosIntensity = Math.min(
            1,
            (base.chaosIntensity ?? 0.3) + 0.22,
          );
        }
        if (base.pattern === "tessellation") {
          overrides.tessellationSpeed = (base.tessellationSpeed ?? 0.85) * 1.4;
          overrides.tessellationDepth = (base.tessellationDepth ?? 0.45) * 1.35;
          overrides.tessellationColorA = lightenHexColor(baseColorA, 0.28);
          overrides.tessellationColorB = lightenHexColor(baseColorB, 0.28);
        }
        overrides.omniGlow = true;
        break;
      }
      default:
        break;
    }
    return { ...base, ...overrides };
  }, [baseOrbProps, orbMood, glowColor, colorA, colorB]);
  const orbHaloColor = orbProps.glowColor ?? glowColor ?? "#39f3ff";
  const orbFrameStyle = React.useMemo<React.CSSProperties>(() => {
    const size = displaySize;
    const style: React.CSSProperties = {
      width: size,
      height: size,
      minWidth: size,
      minHeight: size,
      transition:
        "transform 240ms ease, box-shadow 240ms ease, filter 240ms ease",
    };
    const halo = lightenHexColor(orbHaloColor, 0.18);
    if (orbMood === "speaking") {
      style.transform = "scale(1.08)";
      style.boxShadow = `0 0 55px ${lightenHexColor(halo, 0.1)}, 0 0 20px ${halo}`;
      style.filter = "saturate(1.45)";
    } else if (orbMood === "processing") {
      style.transform = "scale(1.05)";
      style.boxShadow = `0 0 38px ${halo}, 0 0 14px ${lightenHexColor(orbHaloColor, 0.05)}`;
      style.filter = "saturate(1.3)";
    } else if (orbMood === "listening") {
      style.transform = "scale(1.04)";
      style.boxShadow = `0 0 28px ${halo}, 0 0 10px ${lightenHexColor(orbHaloColor, 0.02)}`;
      style.filter = "saturate(1.18)";
    } else {
      style.transform = "scale(1)";
      style.boxShadow = "0 0 0 rgba(0,0,0,0)";
      style.filter = "saturate(1)";
    }
    return style;
  }, [displaySize, orbMood, orbHaloColor]);

  React.useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 0);
    if (!shouldListen) return;
    const r = ensureRecog();
    if (!r) return;
    try {
      r.start();
    } catch (error: any) {
      if (
        error?.name !== "InvalidStateError" &&
        micErrorRef.current !== "start-open"
      ) {
        micErrorRef.current = "start-open";
        setHistory((h) => [
          ...h,
          {
            role: "ai",
            text: "I need microphone access to listen. Please enable it in your browser settings.",
          },
        ]);
      }
    }
  }, [open, shouldListen, speechLocale]);

  React.useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [history, pendingReply]);

  const handleEchoAiToggle = (open: boolean) => {
    setOpen(open);
  };

  React.useEffect(() => {
    const handleEchoToggle = (e: CustomEvent) => {
      handleEchoAiToggle(e.detail.open);
    };
    window.addEventListener(
      "echoai:toggle" as any,
      handleEchoToggle as EventListener,
    );
    return () =>
      window.removeEventListener(
        "echoai:toggle" as any,
        handleEchoToggle as EventListener,
      );
  }, []);

  React.useEffect(() => {
    // Initialize system knowledge scanner
    const scanner = getSystemKnowledgeScanner();

    // Simulate system loading over 3 seconds
    scanner.simulateLoading(3000);

    // Update awareness percentage as system loads
    const updateInterval = setInterval(() => {
      const awareness = scanner.getAwareness();
      setSystemAwareness(awareness);
    }, 100);

    return () => clearInterval(updateInterval);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`z-30 ${variant === "header" ? "" : `fixed right-4`}`}
      style={
        variant === "header"
          ? {
              position: "static",
              pointerEvents: open ? "auto" : "none",
            }
          : {
              position: "fixed",
              right: "1rem",
              top: isStudio ? "auto" : "4.5rem",
              bottom: isStudio ? "1rem" : "auto",
              pointerEvents: open ? "auto" : "none",
              zIndex: 30,
            }
      }
      onMouseEnter={() => {
        setHovering(true);
        if (!pinned) {
          setOpen(true);
        }
      }}
      onMouseLeave={() => {
        if (!pinned) {
          setOpen(false);
        }
        setHovering(false);
      }}
    >
      <button
        aria-label={pinned ? "Hide Echo AI" : "Open Echo AI"}
        onClick={() => togglePinnedState()}
        className={`${launcherButtonBaseClass} ${
          variant === "header"
            ? "bg-transparent shadow-none"
            : fixedLauncherChromeClass
        }`}
        style={{ width: displaySize + 6, height: displaySize + 6 }}
        onMouseEnter={() => {
          setHovering(true);
          if (!pinned) {
            setOpen(true);
          }
        }}
      >
        <div
          className={orbHostClass}
          style={orbFrameStyle}
          data-orb-mood={orbMood}
        >
          {fallback ? (
            <img
              src={ICON_URL}
              alt="Echo"
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "9999px",
                objectFit: "cover",
              }}
            />
          ) : (
            <EchoOrb
              key={orbKey}
              bare
              className="h-full w-full"
              {...orbProps}
            />
          )}
        </div>
      </button>
      {variant === "header" ? (
        <span
          className={`pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 select-none rounded-full bg-[#00ff00]/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#00ff00] shadow-[0_0_28px_rgba(0,255,0,0.8)] backdrop-blur-2xl transition-opacity duration-300 ${
            hovering || pinned ? "opacity-100" : "opacity-0"
          }`}
        >
          Echo AI
        </span>
      ) : null}
      {open && (
        <div
          className={`pointer-events-auto ${variant !== "header" ? popupPlacementClass : ""}`}
          style={
            variant === "header"
              ? {
                  position: "fixed",
                  right: "1rem",
                  top: "calc(5rem + 24px)",
                  zIndex: 61,
                }
              : undefined
          }
        >
          <div
            style={{
              ...panelStyle,
              background:
                "linear-gradient(135deg, rgba(13, 17, 23, 0.95) 0%, rgba(15, 23, 42, 0.92) 100%)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(0, 217, 255, 0.2)",
              boxShadow:
                "0 0 30px rgba(0, 217, 255, 0.4), 0 20px 60px rgba(0, 217, 255, 0.25), inset 0 0 60px rgba(0, 217, 255, 0.1)",
            }}
            className={`${glassPanelClass} ${panelMotionClass}`}
          >
            <div
              className={glassOverlayClass}
              style={overlayStyle}
              aria-hidden="true"
            />
            <header className="relative z-[1] flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={statusIndicatorClass}>
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[#00d9ff] opacity-0 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#00d9ff] shadow-[0_0_16px_rgba(0,217,255,0.6)]" />
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#00d9ff]">
                      Echo
                    </span>
                    <span
                      className={`text-[11px] font-medium ${
                        speaking
                          ? "text-[#00d9ff]"
                          : pendingReply
                            ? "text-[#00d9ff]"
                            : listening || shouldListen
                              ? "text-[#00d9ff]"
                              : voiceOn
                                ? "text-[#c8ccd2]"
                                : "text-[#8892a0]"
                      }`}
                    >
                      {speaking
                        ? "Responding…"
                        : pendingReply
                          ? "Formulating…"
                          : listening
                            ? "Listening��"
                            : shouldListen
                              ? "Ready for voice"
                              : voiceOn
                                ? "Voice ready"
                                : "Ready"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVoiceOn((v) => !v)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition duration-200 ${
                      voiceOn
                        ? "bg-[rgba(0,217,255,0.2)] border border-[#00d9ff] text-[#00d9ff]"
                        : "bg-[rgba(255,255,255,0.05)] border border-[rgba(0,217,255,0.15)] text-[#c8ccd2] hover:bg-[rgba(255,255,255,0.08)]"
                    }`}
                    aria-pressed={voiceOn}
                    title="Toggle voice replies"
                  >
                    🔊 Voice
                  </button>
                  <button
                    type="button"
                    onClick={toggleMic}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition duration-200 ${
                      shouldListen
                        ? "bg-[rgba(0,217,255,0.2)] border border-[#00d9ff] text-[#00d9ff]"
                        : "bg-[rgba(255,255,255,0.05)] border border-[rgba(0,217,255,0.15)] text-[#c8ccd2] hover:bg-[rgba(255,255,255,0.08)]"
                    }`}
                    aria-pressed={shouldListen}
                    title={
                      shouldListen ? "Mute microphone" : "Enable microphone"
                    }
                  >
                    {shouldListen
                      ? listening
                        ? "🎤 Live"
                        : "🎤 On"
                      : "🎤 Off"}
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePinnedState()}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition duration-200 ${
                      pinned
                        ? "bg-[rgba(0,217,255,0.2)] border border-[#00d9ff] text-[#00d9ff]"
                        : "bg-[rgba(255,255,255,0.05)] border border-[rgba(0,217,255,0.15)] text-[#c8ccd2] hover:bg-[rgba(255,255,255,0.08)]"
                    }`}
                    aria-pressed={pinned}
                    title={pinned ? "Undock chat" : "Dock chat"}
                  >
                    {pinned ? "📌 Docked" : "📌 Dock"}
                  </button>
                  <button
                    type="button"
                    onClick={handleNewChat}
                    className="rounded-full px-2.5 py-1 text-[10px] font-medium bg-[rgba(255,255,255,0.05)] border border-[rgba(0,217,255,0.15)] text-[#c8ccd2] hover:bg-[rgba(255,255,255,0.08)] transition duration-200"
                    title="Start a new conversation"
                  >
                    ➕ New
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#6b7280] px-1">
                <span>{speechLocale.toUpperCase()}</span>
                <span>
                  {history.length}{" "}
                  {history.length === 1 ? "message" : "messages"}
                </span>
              </div>
              <div
                className="max-w-[86%] rounded-lg px-3 py-2 text-[11px] border border-[rgba(0,217,255,0.15)]"
                style={{ background: "rgba(0, 217, 255, 0.08)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#00d9ff]">
                      Echo
                    </span>
                  </div>
                  <span className="text-[10px] text-[#8892a0]">
                    {systemAwareness}% aware
                  </span>
                </div>
              </div>
            </header>
            <div
              ref={messagesRef}
              className={`${messageScrollClass} relative z-[1] flex-1`}
              style={{ scrollBehavior: "smooth" }}
            >
              {history.length === 0 ? (
                <div
                  className="max-w-[86%] rounded-2xl px-4 py-3 text-[12px] leading-relaxed"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(0, 217, 255, 0.15) 0%, rgba(0, 217, 255, 0.08) 100%)",
                    border: "1px solid rgba(0, 217, 255, 0.25)",
                    color: "#e8eaed",
                  }}
                >
                  <p className="font-medium text-[#00d9ff] mb-2">
                    Hello, I'm Echo.
                  </p>
                  <p className="text-[11px] leading-relaxed text-[#c8ccd2]">
                    Ask me to check the weather for your location, orchestrate
                    modules, tune accessibility, or guide you through
                    hospitality operations. I can help with outdoor catering,
                    venue planning, and business indicators.
                  </p>
                </div>
              ) : (
                history.map((m, i) => (
                  <div
                    key={`${m.role}-${i}`}
                    className={`max-w-[86%] rounded-2xl px-4 py-3 text-[12px] leading-relaxed ${
                      m.role === "ai" ? "text-left" : "ml-auto text-right"
                    }`}
                    style={
                      m.role === "ai"
                        ? {
                            background:
                              "linear-gradient(135deg, rgba(0, 217, 255, 0.15) 0%, rgba(0, 217, 255, 0.08) 100%)",
                            border: "1px solid rgba(0, 217, 255, 0.25)",
                            color: "#e8eaed",
                          }
                        : {
                            background:
                              "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)",
                            border: "1px solid rgba(59, 130, 246, 0.3)",
                            color: "#e8eaed",
                          }
                    }
                  >
                    {m.text}
                  </div>
                ))
              )}
              {pendingReply ? (
                <div
                  className="max-w-[86%] rounded-2xl px-4 py-3 text-[12px] leading-relaxed flex items-center gap-3"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(0, 217, 255, 0.12) 0%, rgba(0, 217, 255, 0.06) 100%)",
                    border: "1px solid rgba(0, 217, 255, 0.2)",
                    color: "#e8eaed",
                  }}
                >
                  <span className="relative inline-flex h-1.5 w-6 justify-between gap-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00d9ff] animate-pulse [animation-delay:-0.4s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00d9ff] animate-pulse [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00d9ff] animate-pulse" />
                  </span>
                  <span className="text-[11px] font-medium text-[#8892a0]">
                    Echo is thinking
                  </span>
                </div>
              ) : null}
            </div>
            <script>
              {`
                const messagesDiv = document.querySelector('[class*="messageScrollClass"]');
                if (messagesDiv) {
                  messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }
              `}
            </script>
            <div className="relative z-[1] flex min-h-0 flex-col gap-3">
              <div className="max-w-[86%] flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => onType(e.target.value)}
                  placeholder={
                    listening
                      ? "Listening…"
                      : shouldListen
                        ? "Talk or type���"
                        : `Ask Echo…`
                  }
                  className="w-full rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(0,217,255,0.2)] px-3 py-2 text-[12px] text-[#e8eaed] placeholder-[#6b7280] focus:outline-none focus:ring-1 focus:ring-[#00d9ff] focus:border-[#00d9ff] focus:bg-[rgba(255,255,255,0.08)] transition duration-200"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void submitPrompt(value, { bypassLength: true }).catch(
                        (err: any) => {
                          if (!isAbortError(err))
                            console.error("submitPrompt_error", err);
                        },
                      );
                    }
                  }}
                />
                <div />
              </div>
              <div className="max-w-[86%] flex flex-wrap items-center gap-2">
                {usePremium && premiumVoices ? (
                  <select
                    value={premiumVoiceId}
                    onChange={(e) => setPremiumVoiceId(e.target.value)}
                    className="min-w-[140px] rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(59,130,246,0.2)] px-2 py-1 text-[11px] text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] focus:border-[#3b82f6] transition duration-200"
                    title="Select premium voice"
                  >
                    {premiumVoices.map((v) => (
                      <option
                        key={v.id}
                        value={v.id}
                        className="bg-[#0f172a] text-[#e8eaed]"
                      >
                        {v.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    className="min-w-[140px] rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(0,217,255,0.2)] px-2 py-1 text-[11px] text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#00d9ff] focus:border-[#00d9ff] transition duration-200"
                    title="Select voice"
                  >
                    {voicesRef.current.map((v, i) => (
                      <option
                        key={`${v.name}-${i}`}
                        value={v.name}
                        className="bg-[#0f172a] text-[#e8eaed]"
                      >
                        {v.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
