import EchoOrb, {
  type EchoOrbProps,
  orbHostClass,
} from "@/components/echo/EchoOrb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import EmbedSnippet from "@/components/echo/EmbedSnippet";
import { createOrbPalette } from "@/components/echo/orb-palette";
import type { OrbControlConfig } from "@/components/echo/orb-config";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import MoodAwareEchoOrb from "@/components/echo/MoodAwareEchoOrb";

type LayerOrbProps = (EchoOrbProps & { omniGlow?: boolean }) | undefined;

function BackgroundLayer({
  enabled,
  url,
  orbProps,
}: {
  enabled: boolean;
  url: string;
  orbProps: LayerOrbProps;
}) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    let el = document.getElementById("orb-bg-layer") as HTMLDivElement | null;
    if (!el) {
      el = document.createElement("div");
      el.id = "orb-bg-layer";
      Object.assign(el.style, { position: "fixed", inset: "0", zIndex: "-1" });
      document.body.appendChild(el);
    }
    setHost(el);
    return () => {
      if (el && el.parentElement) el.parentElement.removeChild(el);
    };
  }, []);
  if (!enabled || !host || !orbProps) return null;
  const pattern = orbProps.pattern ?? "classic";
  const backgroundProps = {
    ...orbProps,
    radius: (orbProps.radius ?? 2.2) * 1.1,
    helix: pattern === "classic" && Boolean(orbProps.helix),
  } as EchoOrbProps & { omniGlow?: boolean };
  return createPortal(
    <div
      className="h-full w-full"
      style={{
        backgroundImage: url ? `url(${url})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 opacity-90">
        <EchoOrb bare className="h-full w-full" {...backgroundProps} />
      </div>
    </div>,
    host,
  );
}

function Screensaver({
  open,
  onClose,
  orbProps,
}: {
  open: boolean;
  onClose: () => void;
  orbProps: LayerOrbProps;
}) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    let el = document.getElementById(
      "orb-screensaver",
    ) as HTMLDivElement | null;
    if (!el) {
      el = document.createElement("div");
      el.id = "orb-screensaver";
      Object.assign(el.style, {
        position: "fixed",
        inset: "0",
        zIndex: "9998",
      });
      document.body.appendChild(el);
    }
    setHost(el);
    return () => {
      if (el && el.parentElement) el.parentElement.removeChild(el);
    };
  }, [open]);
  if (!open || !host || !orbProps) return null;
  const pattern = orbProps.pattern ?? "classic";
  const screenProps = {
    ...orbProps,
    radius: (orbProps.radius ?? 2.2) * 1.2,
    helix: pattern === "classic" && Boolean(orbProps.helix),
  } as EchoOrbProps & { omniGlow?: boolean };
  return createPortal(
    <div
      className="h-full w-full bg-black"
      onClick={onClose}
      onKeyDown={onClose}
      tabIndex={0}
    >
      <EchoOrb bare className="h-full w-full" {...screenProps} />
    </div>,
    host,
  );
}

export default function EchoControlsPage() {
  const { toast } = useToast();
  const [speed, setSpeed] = useState(0.4);
  const [wobble, setWobble] = useState(0.25);
  const [compactness, setCompactness] = useState(0.9);
  const [colorA, setColorA] = useState("#14e0ff");
  const [colorB, setColorB] = useState("#ffe95c");
  const [showRings, setShowRings] = useState(true);
  const [ringSpeed, setRingSpeed] = useState(0.6);
  const [ringCount, setRingCount] = useState(8);
  const [ringParticles, setRingParticles] = useState(900);
  const [ringRandomness, setRingRandomness] = useState(0.35);
  const [radius, setRadius] = useState(2.2);
  const [glowParticles, setGlowParticles] = useState(1200);
  const [glowAz, setGlowAz] = useState(25);
  const [glowEl, setGlowEl] = useState(10);
  const [glowSpeed, setGlowSpeed] = useState(1.4);
  const [glowSize, setGlowSize] = useState(0.035);
  const [glowColor, setGlowColor] = useState("#ffe95c");
  const [omniGlow, setOmniGlow] = useState(true);
  const [helix, setHelix] = useState(true);
  const [helixParticles, setHelixParticles] = useState(1200);
  const [helixRadius, setHelixRadius] = useState(0.9);
  const [helixPitch, setHelixPitch] = useState(0.5);
  const [helixSpeed, setHelixSpeed] = useState(1.0);
  const [pattern, setPattern] = useState<
    "classic" | "waves" | "galaxy" | "fractal" | "tessellation"
  >(() => (localStorage.getItem("orb.pattern") as any) || "classic");
  const [bgEnabled, setBgEnabled] = useState<boolean>(
    () => localStorage.getItem("orb.bg.enabled") === "1",
  );
  const [bgUrl, setBgUrl] = useState<string>(
    () => localStorage.getItem("orb.bg.url") || "",
  );
  const [iconSize, setIconSize] = useState<number>(() =>
    parseInt(localStorage.getItem("orb.size") || "30", 10),
  );
  const [presets, setPresets] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("orb.presets") || "[]");
    } catch {
      return [];
    }
  });
  const [waveCols, setWaveCols] = useState<number>(() =>
    parseInt(localStorage.getItem("orb.wave.cols") || "120", 10),
  );
  const [waveRows, setWaveRows] = useState<number>(() =>
    parseInt(localStorage.getItem("orb.wave.rows") || "80", 10),
  );
  const [waveAmp, setWaveAmp] = useState<number>(() =>
    parseFloat(localStorage.getItem("orb.wave.amp") || "0.5"),
  );
  const [waveSpeed, setWaveSpeed] = useState<number>(() =>
    parseFloat(localStorage.getItem("orb.wave.speed") || "0.8"),
  );
  const [waveSpacing, setWaveSpacing] = useState<number>(() =>
    parseFloat(localStorage.getItem("orb.wave.spacing") || "0.08"),
  );
  const [waveColor, setWaveColor] = useState<string>(
    () => localStorage.getItem("orb.wave.color") || "#39f3ff",
  );
  const [chaosMode, setChaosMode] = useState<"lorenz" | "rossler">(() =>
    localStorage.getItem("orb.chaos.mode") === "rossler" ? "rossler" : "lorenz",
  );
  const [chaosPoints, setChaosPoints] = useState<number>(() =>
    parseInt(localStorage.getItem("orb.chaos.points") || "18000", 10),
  );
  const [chaosDt, setChaosDt] = useState<number>(() =>
    parseFloat(localStorage.getItem("orb.chaos.dt") || "0.008"),
  );
  const [chaosSigma, setChaosSigma] = useState<number>(() =>
    parseFloat(localStorage.getItem("orb.chaos.sigma") || "10"),
  );
  const [chaosRho, setChaosRho] = useState<number>(() =>
    parseFloat(localStorage.getItem("orb.chaos.rho") || "28"),
  );
  const [chaosBeta, setChaosBeta] = useState<number>(() =>
    parseFloat(localStorage.getItem("orb.chaos.beta") || (8 / 3).toString()),
  );
  const [chaosScale, setChaosScale] = useState<number>(() =>
    parseFloat(localStorage.getItem("orb.chaos.scale") || "0.085"),
  );
  const [chaosSpeed, setChaosSpeed] = useState<number>(() =>
    parseFloat(localStorage.getItem("orb.chaos.speed") || "0.7"),
  );
  const [chaosIntensity, setChaosIntensity] = useState<number>(() =>
    parseFloat(localStorage.getItem("orb.chaos.intensity") || "0.3"),
  );
  const [chaosA, setChaosA] = useState<number>(() =>
    parseFloat(localStorage.getItem("orb.chaos.a") || "0.2"),
  );
  const [chaosB, setChaosB] = useState<number>(() =>
    parseFloat(localStorage.getItem("orb.chaos.b") || "0.2"),
  );
  const [chaosC, setChaosC] = useState<number>(() =>
    parseFloat(localStorage.getItem("orb.chaos.c") || "5.7"),
  );
  const [chaosColor, setChaosColor] = useState<string>(
    () => localStorage.getItem("orb.chaos.color") || "#f7c8ff",
  );
  const [tessellationType, setTessellationType] = useState<"hex" | "tri">(() =>
    localStorage.getItem("orb.tess.pattern") === "tri" ? "tri" : "hex",
  );
  const [tessellationCols, setTessellationCols] = useState<number>(() =>
    parseInt(localStorage.getItem("orb.tess.cols") || "72", 10),
  );
  const [tessellationRows, setTessellationRows] = useState<number>(() =>
    parseInt(localStorage.getItem("orb.tess.rows") || "48", 10),
  );
  const [tessellationScale, setTessellationScale] = useState<number>(() =>
    parseFloat(localStorage.getItem("orb.tess.scale") || "0.24"),
  );
  const [tessellationDepth, setTessellationDepth] = useState<number>(() =>
    parseFloat(localStorage.getItem("orb.tess.depth") || "0.45"),
  );
  const [tessellationSpeed, setTessellationSpeed] = useState<number>(() =>
    parseFloat(localStorage.getItem("orb.tess.speed") || "0.85"),
  );
  const [tessellationWarp, setTessellationWarp] = useState<number>(() =>
    parseFloat(localStorage.getItem("orb.tess.warp") || "0.55"),
  );
  const [tessellationColorA, setTessellationColorA] = useState<string>(
    () => localStorage.getItem("orb.tess.colorA") || "#14e0ff",
  );
  const [tessellationColorB, setTessellationColorB] = useState<string>(
    () => localStorage.getItem("orb.tess.colorB") || "#ffe95c",
  );
  const palette = useMemo(
    () => createOrbPalette({ colorA, colorB, glowColor }),
    [colorA, colorB, glowColor],
  );
  const sharedOrbProps = useMemo(
    () =>
      ({
        pattern,
        speed,
        wobble,
        compactness,
        colorA,
        colorB,
        radius,
        showRings,
        ringSpeed,
        ringCount,
        ringParticles,
        ringRandomness,
        ringPalette: palette.ringPalette,
        ringColor: palette.ringColor,
        glowParticles,
        glowColor,
        dirAzimuth: glowAz,
        dirElevation: glowEl,
        glowSpeed,
        glowSize,
        helix,
        helixParticles,
        helixRadius,
        helixPitch,
        helixSpeed,
        helixColor: palette.helixColor,
        omniGlow,
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
      }) as EchoOrbProps & { omniGlow?: boolean },
    [
      pattern,
      speed,
      wobble,
      compactness,
      colorA,
      colorB,
      radius,
      showRings,
      ringSpeed,
      ringCount,
      ringParticles,
      ringRandomness,
      palette,
      glowParticles,
      glowColor,
      glowAz,
      glowEl,
      glowSpeed,
      glowSize,
      helix,
      helixParticles,
      helixRadius,
      helixPitch,
      helixSpeed,
      omniGlow,
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

  useEffect(() => {
    localStorage.setItem("orb.bg.enabled", bgEnabled ? "1" : "0");
    localStorage.setItem("orb.bg.url", bgUrl);
  }, [bgEnabled, bgUrl]);
  useEffect(() => {
    localStorage.setItem("orb.size", String(iconSize));
  }, [iconSize]);
  useEffect(() => {
    localStorage.setItem("orb.pattern", pattern);
  }, [pattern]);
  useEffect(() => {
    localStorage.setItem("orb.speed", String(speed));
  }, [speed]);
  useEffect(() => {
    localStorage.setItem("orb.wobble", String(wobble));
  }, [wobble]);
  useEffect(() => {
    localStorage.setItem("orb.compactness", String(compactness));
  }, [compactness]);
  useEffect(() => {
    localStorage.setItem("orb.radius", String(radius));
  }, [radius]);
  useEffect(() => {
    localStorage.setItem("orb.dir.az", String(glowAz));
  }, [glowAz]);
  useEffect(() => {
    localStorage.setItem("orb.dir.el", String(glowEl));
  }, [glowEl]);
  useEffect(() => {
    localStorage.setItem("orb.helix.particles", String(helixParticles));
  }, [helixParticles]);
  useEffect(() => {
    localStorage.setItem("orb.helix.radius", String(helixRadius));
  }, [helixRadius]);
  useEffect(() => {
    localStorage.setItem("orb.helix.pitch", String(helixPitch));
  }, [helixPitch]);
  useEffect(() => {
    localStorage.setItem("orb.helix.speed", String(helixSpeed));
  }, [helixSpeed]);
  useEffect(() => {
    localStorage.setItem("orb.colorA", colorA);
  }, [colorA]);
  useEffect(() => {
    localStorage.setItem("orb.colorB", colorB);
  }, [colorB]);
  useEffect(() => {
    localStorage.setItem("orb.showRings", showRings ? "1" : "0");
  }, [showRings]);
  useEffect(() => {
    localStorage.setItem("orb.ring.speed", String(ringSpeed));
  }, [ringSpeed]);
  useEffect(() => {
    localStorage.setItem("orb.ring.count", String(ringCount));
  }, [ringCount]);
  useEffect(() => {
    localStorage.setItem("orb.ring.particles", String(ringParticles));
  }, [ringParticles]);
  useEffect(() => {
    localStorage.setItem("orb.ring.rand", String(ringRandomness));
  }, [ringRandomness]);
  useEffect(() => {
    localStorage.setItem("orb.glow.count", String(glowParticles));
  }, [glowParticles]);
  useEffect(() => {
    localStorage.setItem("orb.glow.color", glowColor);
  }, [glowColor]);
  useEffect(() => {
    localStorage.setItem("orb.glow.speed", String(glowSpeed));
  }, [glowSpeed]);
  useEffect(() => {
    localStorage.setItem("orb.glow.size", String(glowSize));
  }, [glowSize]);
  useEffect(() => {
    localStorage.setItem("orb.omni", omniGlow ? "1" : "0");
  }, [omniGlow]);
  useEffect(() => {
    localStorage.setItem("orb.helix", helix ? "1" : "0");
  }, [helix]);
  useEffect(() => {
    localStorage.setItem("orb.wave.cols", String(waveCols));
  }, [waveCols]);
  useEffect(() => {
    localStorage.setItem("orb.wave.rows", String(waveRows));
  }, [waveRows]);
  useEffect(() => {
    localStorage.setItem("orb.wave.amp", String(waveAmp));
  }, [waveAmp]);
  useEffect(() => {
    localStorage.setItem("orb.wave.speed", String(waveSpeed));
  }, [waveSpeed]);
  useEffect(() => {
    localStorage.setItem("orb.wave.spacing", String(waveSpacing));
  }, [waveSpacing]);
  useEffect(() => {
    localStorage.setItem("orb.wave.color", waveColor);
  }, [waveColor]);
  useEffect(() => {
    localStorage.setItem("orb.chaos.mode", chaosMode);
  }, [chaosMode]);
  useEffect(() => {
    localStorage.setItem("orb.chaos.points", String(chaosPoints));
  }, [chaosPoints]);
  useEffect(() => {
    localStorage.setItem("orb.chaos.dt", String(chaosDt));
  }, [chaosDt]);
  useEffect(() => {
    localStorage.setItem("orb.chaos.sigma", String(chaosSigma));
  }, [chaosSigma]);
  useEffect(() => {
    localStorage.setItem("orb.chaos.rho", String(chaosRho));
  }, [chaosRho]);
  useEffect(() => {
    localStorage.setItem("orb.chaos.beta", String(chaosBeta));
  }, [chaosBeta]);
  useEffect(() => {
    localStorage.setItem("orb.chaos.scale", String(chaosScale));
  }, [chaosScale]);
  useEffect(() => {
    localStorage.setItem("orb.chaos.speed", String(chaosSpeed));
  }, [chaosSpeed]);
  useEffect(() => {
    localStorage.setItem("orb.chaos.intensity", String(chaosIntensity));
  }, [chaosIntensity]);
  useEffect(() => {
    localStorage.setItem("orb.chaos.a", String(chaosA));
  }, [chaosA]);
  useEffect(() => {
    localStorage.setItem("orb.chaos.b", String(chaosB));
  }, [chaosB]);
  useEffect(() => {
    localStorage.setItem("orb.chaos.c", String(chaosC));
  }, [chaosC]);
  useEffect(() => {
    localStorage.setItem("orb.chaos.color", chaosColor);
  }, [chaosColor]);
  useEffect(() => {
    localStorage.setItem("orb.tess.pattern", tessellationType);
  }, [tessellationType]);
  useEffect(() => {
    localStorage.setItem("orb.tess.cols", String(tessellationCols));
  }, [tessellationCols]);
  useEffect(() => {
    localStorage.setItem("orb.tess.rows", String(tessellationRows));
  }, [tessellationRows]);
  useEffect(() => {
    localStorage.setItem("orb.tess.scale", String(tessellationScale));
  }, [tessellationScale]);
  useEffect(() => {
    localStorage.setItem("orb.tess.depth", String(tessellationDepth));
  }, [tessellationDepth]);
  useEffect(() => {
    localStorage.setItem("orb.tess.speed", String(tessellationSpeed));
  }, [tessellationSpeed]);
  useEffect(() => {
    localStorage.setItem("orb.tess.warp", String(tessellationWarp));
  }, [tessellationWarp]);
  useEffect(() => {
    localStorage.setItem("orb.tess.colorA", tessellationColorA);
  }, [tessellationColorA]);
  useEffect(() => {
    localStorage.setItem("orb.tess.colorB", tessellationColorB);
  }, [tessellationColorB]);
  useEffect(() => {
    const detail: OrbControlConfig = {
      iconSize,
      pattern,
      colorA,
      colorB,
      showRings,
      ringSpeed,
      ringCount,
      ringParticles,
      ringRandomness,
      radius,
      glowParticles,
      glowColor,
      glowSpeed,
      glowSize,
      omniGlow,
      helix,
      helixParticles,
      helixRadius,
      helixPitch,
      helixSpeed,
      dirAz: glowAz,
      dirEl: glowEl,
      speed,
      wobble,
      compactness,
      waveCols,
      waveRows,
      waveAmp,
      waveSpeed,
      waveSpacing,
      waveColor,
      bgEnabled,
      bgUrl,
      chaosAttractor: chaosMode,
      chaosPoints,
      chaosDt,
      chaosSigma,
      chaosRho,
      chaosBeta,
      chaosScale,
      chaosSpeed,
      chaosIntensity,
      chaosA,
      chaosB,
      chaosC,
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
    };
    window.dispatchEvent(
      new CustomEvent<OrbControlConfig>("orb:changed", { detail }),
    );
  }, [
    pattern,
    bgEnabled,
    bgUrl,
    iconSize,
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
    radius,
    glowParticles,
    glowAz,
    glowEl,
    glowSpeed,
    glowSize,
    glowColor,
    omniGlow,
    helix,
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
    chaosScale,
    chaosSpeed,
    chaosIntensity,
    chaosA,
    chaosB,
    chaosC,
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
  ]);

  const [screensaverOpen, setScreensaverOpen] = useState(false);
  function savePresets(list: any[]) {
    setPresets(list);
    localStorage.setItem("orb.presets", JSON.stringify(list));
  }
  function startScreensaver() {
    setScreensaverOpen(true);
  }
  function snap() {
    const snapshot = {
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
      radius,
      glowParticles,
      glowAz,
      glowEl,
      glowSpeed,
      glowSize,
      glowColor,
      omniGlow,
      helix,
      helixParticles,
      helixRadius,
      helixPitch,
      helixSpeed,
      pattern,
      bgEnabled,
      bgUrl,
      iconSize,
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
      chaosScale,
      chaosSpeed,
      chaosIntensity,
      chaosA,
      chaosB,
      chaosC,
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
      time: Date.now(),
    };
    const list = [snapshot, ...presets].slice(0, 20);
    savePresets(list);
    toast({
      title: "Preset saved",
      description: "Your orb snapshot is ready to reuse.",
    });
  }
  function applyPreset(p: any) {
    setSpeed(p.speed);
    setWobble(p.wobble);
    setCompactness(p.compactness);
    setColorA(p.colorA);
    setColorB(p.colorB);
    setShowRings(p.showRings);
    setRingSpeed(p.ringSpeed);
    setRingCount(p.ringCount);
    setRingParticles(p.ringParticles);
    setRingRandomness(p.ringRandomness);
    setRadius(p.radius);
    setGlowParticles(p.glowParticles);
    setGlowAz(p.glowAz);
    setGlowEl(p.glowEl);
    setGlowSpeed(p.glowSpeed);
    setGlowSize(p.glowSize);
    setGlowColor(p.glowColor);
    setOmniGlow(p.omniGlow);
    setHelix(p.helix);
    setHelixParticles(p.helixParticles);
    setHelixRadius(p.helixRadius);
    setHelixPitch(p.helixPitch);
    setHelixSpeed(p.helixSpeed);
    setPattern(p.pattern || "classic");
    setBgEnabled(Boolean(p.bgEnabled));
    setBgUrl(p.bgUrl || "");
    setIconSize(p.iconSize || 30);
    setWaveCols(p.waveCols || 120);
    setWaveRows(p.waveRows || 80);
    setWaveAmp(p.waveAmp || 0.5);
    setWaveSpeed(p.waveSpeed || 0.8);
    setWaveSpacing(p.waveSpacing || 0.08);
    setWaveColor(p.waveColor || "#39f3ff");
    setChaosMode(p.chaosMode === "rossler" ? "rossler" : "lorenz");
    setChaosPoints(() => {
      const value = Number(p.chaosPoints);
      return Number.isFinite(value) ? value : 18000;
    });
    setChaosDt(() => {
      const value = Number(p.chaosDt);
      return Number.isFinite(value) ? value : 0.008;
    });
    setChaosSigma(() => {
      const value = Number(p.chaosSigma);
      return Number.isFinite(value) ? value : 10;
    });
    setChaosRho(() => {
      const value = Number(p.chaosRho);
      return Number.isFinite(value) ? value : 28;
    });
    setChaosBeta(() => {
      const value = Number(p.chaosBeta);
      return Number.isFinite(value) ? value : 8 / 3;
    });
    setChaosScale(() => {
      const value = Number(p.chaosScale);
      return Number.isFinite(value) ? value : 0.085;
    });
    setChaosSpeed(() => {
      const value = Number(p.chaosSpeed);
      return Number.isFinite(value) ? value : 0.7;
    });
    setChaosIntensity(() => {
      const value = Number(p.chaosIntensity);
      return Number.isFinite(value) ? value : 0.3;
    });
    setChaosA(() => {
      const value = Number(p.chaosA);
      return Number.isFinite(value) ? value : 0.2;
    });
    setChaosB(() => {
      const value = Number(p.chaosB);
      return Number.isFinite(value) ? value : 0.2;
    });
    setChaosC(() => {
      const value = Number(p.chaosC);
      return Number.isFinite(value) ? value : 5.7;
    });
    setChaosColor(p.chaosColor || "#f7c8ff");
    setTessellationType(p.tessellationType === "tri" ? "tri" : "hex");
    setTessellationCols(() => {
      const value = Number(p.tessellationCols);
      return Number.isFinite(value) ? value : 72;
    });
    setTessellationRows(() => {
      const value = Number(p.tessellationRows);
      return Number.isFinite(value) ? value : 48;
    });
    setTessellationScale(() => {
      const value = Number(p.tessellationScale);
      return Number.isFinite(value) ? value : 0.24;
    });
    setTessellationDepth(() => {
      const value = Number(p.tessellationDepth);
      return Number.isFinite(value) ? value : 0.45;
    });
    setTessellationSpeed(() => {
      const value = Number(p.tessellationSpeed);
      return Number.isFinite(value) ? value : 0.85;
    });
    setTessellationWarp(() => {
      const value = Number(p.tessellationWarp);
      return Number.isFinite(value) ? value : 0.55;
    });
    setTessellationColorA(p.tessellationColorA || "#14e0ff");
    setTessellationColorB(p.tessellationColorB || "#ffe95c");
    toast({
      title: "Preset applied",
      description: "Orb configuration restored.",
    });
  }

  const handlePush = () => {
    let dispatched = false;
    try {
      window.parent?.postMessage({ type: "builder:push-code" }, "*");
      dispatched = true;
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent("builder:push-code"));
      dispatched = true;
    } catch {}
    toast({
      title: dispatched ? "Push requested" : "Push code",
      description:
        "Check the top-right Push Code button to publish these orb settings.",
    });
  };

  return (
    <main className="container py-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.85fr)]">
        <section className="space-y-6">
          <Card className="border-none bg-gradient-to-br from-background/85 via-background/70 to-background/60 shadow-xl ring-1 ring-primary/10">
            <CardHeader className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <CardTitle>Echo Controls</CardTitle>
                <CardDescription>
                  Live orb preview with internal opposing rings. Use the
                  controls below.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handlePush}>
                Push code
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="mx-auto w-full max-w-[520px]">
                <div className={`${orbHostClass} aspect-square`}>
                  {/* Use MoodAwareEchoOrb for AI-driven mood and workload visualization */}
                  <MoodAwareEchoOrb
                    size={520}
                    className="h-full w-full"
                    autoStart={true}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="inline-flex items-center gap-2">
                  <span className="uppercase tracking-wide text-muted-foreground">
                    Pattern
                  </span>
                  <select
                    value={pattern}
                    onChange={(event) => setPattern(event.target.value as any)}
                    className="rounded-md border bg-background px-2 py-1 text-xs"
                  >
                    <option value="classic">Classic</option>
                    <option value="waves">Waves</option>
                    <option value="galaxy">Galaxy</option>
                    <option value="fractal">Fractal</option>
                    <option value="tessellation">Tessellation</option>
                  </select>
                </label>
                <Button variant="outline" size="sm" onClick={snap}>
                  Save preset
                </Button>
                {presets.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {presets.slice(0, 8).map((preset, index) => (
                      <Button
                        key={preset.time}
                        variant="ghost"
                        size="sm"
                        onClick={() => applyPreset(preset)}
                        title={new Date(preset.time).toLocaleString()}
                      >
                        Preset {index + 1}
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => savePresets([])}
                    >
                      Clear presets
                    </Button>
                  </div>
                ) : null}
              </div>

              {pattern === "waves" ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 text-xs">
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span>Amplitude</span>
                      <span>{waveAmp.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[waveAmp]}
                      min={0}
                      max={2}
                      step={0.01}
                      onValueChange={(value) => setWaveAmp(value[0])}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span>Wave speed</span>
                      <span>{waveSpeed.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[waveSpeed]}
                      min={0}
                      max={3}
                      step={0.01}
                      onValueChange={(value) => setWaveSpeed(value[0])}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span>Point spacing</span>
                      <span>{waveSpacing.toFixed(3)}</span>
                    </div>
                    <Slider
                      value={[waveSpacing]}
                      min={0.02}
                      max={0.2}
                      step={0.001}
                      onValueChange={(value) => setWaveSpacing(value[0])}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span>Cols</span>
                      <span>{waveCols}</span>
                    </div>
                    <Slider
                      value={[waveCols]}
                      min={20}
                      max={240}
                      step={1}
                      onValueChange={(value) => setWaveCols(value[0])}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span>Rows</span>
                      <span>{waveRows}</span>
                    </div>
                    <Slider
                      value={[waveRows]}
                      min={20}
                      max={160}
                      step={1}
                      onValueChange={(value) => setWaveRows(value[0])}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="uppercase tracking-wide text-muted-foreground">
                      Color
                    </span>
                    <input
                      type="color"
                      value={waveColor}
                      onChange={(event) => setWaveColor(event.target.value)}
                      className="h-6 w-10 cursor-pointer rounded-md border bg-transparent"
                    />
                  </div>
                </div>
              ) : null}

              {pattern === "fractal" ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="uppercase tracking-wide text-muted-foreground">
                      Attractor
                    </span>
                    <select
                      value={chaosMode}
                      onChange={(event) =>
                        setChaosMode(
                          event.target.value === "rossler"
                            ? "rossler"
                            : "lorenz",
                        )
                      }
                      className="rounded-md border bg-background px-2 py-1 text-xs"
                    >
                      <option value="lorenz">Lorenz</option>
                      <option value="rossler">Rössler</option>
                    </select>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span>Points</span>
                      <span>{chaosPoints}</span>
                    </div>
                    <Slider
                      value={[Math.min(50000, Math.max(2000, chaosPoints))]}
                      min={2000}
                      max={50000}
                      step={1000}
                      onValueChange={(value) => setChaosPoints(value[0])}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span>Scale</span>
                      <span>{chaosScale.toFixed(3)}</span>
                    </div>
                    <Slider
                      value={[chaosScale]}
                      min={0.03}
                      max={0.18}
                      step={0.001}
                      onValueChange={(value) => setChaosScale(value[0])}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span>Speed</span>
                      <span>{chaosSpeed.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[chaosSpeed]}
                      min={0}
                      max={2}
                      step={0.01}
                      onValueChange={(value) => setChaosSpeed(value[0])}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span>Chaos</span>
                      <span>{chaosIntensity.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[chaosIntensity]}
                      min={0}
                      max={1}
                      step={0.01}
                      onValueChange={(value) => setChaosIntensity(value[0])}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span>Δt</span>
                      <span>{chaosDt.toFixed(3)}</span>
                    </div>
                    <Slider
                      value={[chaosDt]}
                      min={0.001}
                      max={0.02}
                      step={0.0005}
                      onValueChange={(value) => setChaosDt(value[0])}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="uppercase tracking-wide text-muted-foreground">
                      Accent
                    </span>
                    <input
                      type="color"
                      value={chaosColor}
                      onChange={(event) => setChaosColor(event.target.value)}
                      className="h-6 w-10 cursor-pointer rounded-md border bg-transparent"
                    />
                  </div>
                  {chaosMode === "lorenz" ? (
                    <div className="md:col-span-2 xl:col-span-3 grid gap-4 md:grid-cols-3">
                      <div>
                        <div className="mb-1 flex justify-between">
                          <span>σ</span>
                          <span>{chaosSigma.toFixed(1)}</span>
                        </div>
                        <Slider
                          value={[chaosSigma]}
                          min={0.1}
                          max={30}
                          step={0.1}
                          onValueChange={(value) => setChaosSigma(value[0])}
                        />
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between">
                          <span>ρ</span>
                          <span>{chaosRho.toFixed(1)}</span>
                        </div>
                        <Slider
                          value={[chaosRho]}
                          min={0}
                          max={60}
                          step={0.5}
                          onValueChange={(value) => setChaosRho(value[0])}
                        />
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between">
                          <span>β</span>
                          <span>{chaosBeta.toFixed(2)}</span>
                        </div>
                        <Slider
                          value={[chaosBeta]}
                          min={0.5}
                          max={4}
                          step={0.01}
                          onValueChange={(value) => setChaosBeta(value[0])}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="md:col-span-2 xl:col-span-3 grid gap-4 md:grid-cols-3">
                      <div>
                        <div className="mb-1 flex justify-between">
                          <span>a</span>
                          <span>{chaosA.toFixed(2)}</span>
                        </div>
                        <Slider
                          value={[chaosA]}
                          min={0}
                          max={1}
                          step={0.01}
                          onValueChange={(value) => setChaosA(value[0])}
                        />
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between">
                          <span>b</span>
                          <span>{chaosB.toFixed(2)}</span>
                        </div>
                        <Slider
                          value={[chaosB]}
                          min={0}
                          max={1}
                          step={0.01}
                          onValueChange={(value) => setChaosB(value[0])}
                        />
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between">
                          <span>c</span>
                          <span>{chaosC.toFixed(2)}</span>
                        </div>
                        <Slider
                          value={[chaosC]}
                          min={2}
                          max={14}
                          step={0.05}
                          onValueChange={(value) => setChaosC(value[0])}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {pattern === "tessellation" ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="uppercase tracking-wide text-muted-foreground">
                      Layout
                    </span>
                    <select
                      value={tessellationType}
                      onChange={(event) =>
                        setTessellationType(
                          event.target.value === "tri" ? "tri" : "hex",
                        )
                      }
                      className="rounded-md border bg-background px-2 py-1 text-xs"
                    >
                      <option value="hex">Hexagonal</option>
                      <option value="tri">Triangular</option>
                    </select>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span>Columns</span>
                      <span>{tessellationCols}</span>
                    </div>
                    <Slider
                      value={[Math.min(160, Math.max(10, tessellationCols))]}
                      min={10}
                      max={160}
                      step={1}
                      onValueChange={(value) => setTessellationCols(value[0])}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span>Rows</span>
                      <span>{tessellationRows}</span>
                    </div>
                    <Slider
                      value={[Math.min(160, Math.max(10, tessellationRows))]}
                      min={10}
                      max={160}
                      step={1}
                      onValueChange={(value) => setTessellationRows(value[0])}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span>Scale</span>
                      <span>{tessellationScale.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[tessellationScale]}
                      min={0.1}
                      max={0.5}
                      step={0.005}
                      onValueChange={(value) => setTessellationScale(value[0])}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span>Depth</span>
                      <span>{tessellationDepth.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[tessellationDepth]}
                      min={0}
                      max={1}
                      step={0.01}
                      onValueChange={(value) => setTessellationDepth(value[0])}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span>Speed</span>
                      <span>{tessellationSpeed.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[tessellationSpeed]}
                      min={0}
                      max={2}
                      step={0.01}
                      onValueChange={(value) => setTessellationSpeed(value[0])}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span>Warp</span>
                      <span>{tessellationWarp.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[tessellationWarp]}
                      min={0}
                      max={1}
                      step={0.01}
                      onValueChange={(value) => setTessellationWarp(value[0])}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="uppercase tracking-wide text-muted-foreground">
                      Primary
                    </span>
                    <input
                      type="color"
                      value={tessellationColorA}
                      onChange={(event) =>
                        setTessellationColorA(event.target.value)
                      }
                      className="h-6 w-10 cursor-pointer rounded-md border bg-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="uppercase tracking-wide text-muted-foreground">
                      Secondary
                    </span>
                    <input
                      type="color"
                      value={tessellationColorB}
                      onChange={(event) =>
                        setTessellationColorB(event.target.value)
                      }
                      className="h-6 w-10 cursor-pointer rounded-md border bg-transparent"
                    />
                  </div>
                </div>
              ) : null}

              <div className="rounded-lg border border-primary/10 bg-background/60 p-4">
                <EmbedSnippet
                  radius={radius}
                  ringCount={ringCount}
                  ringParticles={ringParticles}
                  ringSpeed={ringSpeed}
                  ringRandomness={ringRandomness}
                  glowParticles={glowParticles}
                  glowSpeed={glowSpeed}
                  omniGlow={omniGlow}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto xl:pr-1">
          <Card>
            <CardHeader>
              <CardTitle>Motion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span>Speed</span>
                  <span>{speed.toFixed(2)}</span>
                </div>
                <Slider
                  value={[speed]}
                  min={0}
                  max={2}
                  step={0.01}
                  onValueChange={(value) => setSpeed(value[0])}
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span>Wobble</span>
                  <span>{wobble.toFixed(2)}</span>
                </div>
                <Slider
                  value={[wobble]}
                  min={0}
                  max={2}
                  step={0.01}
                  onValueChange={(value) => setWobble(value[0])}
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span>Compactness</span>
                  <span>{compactness.toFixed(2)}</span>
                </div>
                <Slider
                  value={[compactness]}
                  min={0.5}
                  max={0.99}
                  step={0.01}
                  onValueChange={(value) => setCompactness(value[0])}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rings &amp; Glow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span>Ring speed</span>
                  <span>{ringSpeed.toFixed(2)}</span>
                </div>
                <Slider
                  value={[ringSpeed]}
                  min={0}
                  max={2}
                  step={0.01}
                  onValueChange={(value) => setRingSpeed(value[0])}
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span>Ring randomness</span>
                  <span>{ringRandomness.toFixed(2)}</span>
                </div>
                <Slider
                  value={[ringRandomness]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={(value) => setRingRandomness(value[0])}
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span>Ring count</span>
                  <span>{ringCount}</span>
                </div>
                <Slider
                  value={[ringCount]}
                  min={0}
                  max={12}
                  step={1}
                  onValueChange={(value) => setRingCount(value[0])}
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span>Orb radius</span>
                  <span>{radius.toFixed(2)}</span>
                </div>
                <Slider
                  value={[radius]}
                  min={1.2}
                  max={3}
                  step={0.01}
                  onValueChange={(value) => setRadius(value[0])}
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span>Ring particles</span>
                  <span>{ringParticles}</span>
                </div>
                <Slider
                  value={[ringParticles]}
                  min={0}
                  max={2400}
                  step={25}
                  onValueChange={(value) => setRingParticles(value[0])}
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span>Glow particles</span>
                  <span>{glowParticles}</span>
                </div>
                <Slider
                  value={[glowParticles]}
                  min={0}
                  max={3000}
                  step={25}
                  onValueChange={(value) => setGlowParticles(value[0])}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>Glow azimuth</span>
                    <span>{glowAz}°</span>
                  </div>
                  <Slider
                    value={[glowAz]}
                    min={0}
                    max={360}
                    step={1}
                    onValueChange={(value) => setGlowAz(value[0])}
                  />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>Glow elevation</span>
                    <span>{glowEl}°</span>
                  </div>
                  <Slider
                    value={[glowEl]}
                    min={-90}
                    max={90}
                    step={1}
                    onValueChange={(value) => setGlowEl(value[0])}
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={omniGlow}
                  onChange={(event) => setOmniGlow(event.target.checked)}
                />
                Omni glow
              </label>
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span>Glow speed</span>
                  <span>{glowSpeed.toFixed(2)}</span>
                </div>
                <Slider
                  value={[glowSpeed]}
                  min={0}
                  max={3}
                  step={0.01}
                  onValueChange={(value) => setGlowSpeed(value[0])}
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span>Glow size</span>
                  <span>{glowSize.toFixed(3)}</span>
                </div>
                <Slider
                  value={[glowSize]}
                  min={0}
                  max={0.08}
                  step={0.001}
                  onValueChange={(value) => setGlowSize(value[0])}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showRings}
                    onChange={(event) => setShowRings(event.target.checked)}
                  />
                  Rings
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={helix}
                    onChange={(event) => setHelix(event.target.checked)}
                  />
                  Double helix
                </label>
                <label className="flex items-center gap-2">
                  Color A
                  <input
                    type="color"
                    value={colorA}
                    onChange={(event) => setColorA(event.target.value)}
                    className="h-6 w-10 cursor-pointer rounded-md border bg-transparent"
                  />
                </label>
                <label className="flex items-center gap-2">
                  Color B
                  <input
                    type="color"
                    value={colorB}
                    onChange={(event) => setColorB(event.target.value)}
                    className="h-6 w-10 cursor-pointer rounded-md border bg-transparent"
                  />
                </label>
                <label className="flex items-center gap-2">
                  Glow
                  <input
                    type="color"
                    value={glowColor}
                    onChange={(event) => setGlowColor(event.target.value)}
                    className="h-6 w-10 cursor-pointer rounded-md border bg-transparent"
                  />
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Site &amp; Presets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={bgEnabled}
                    onChange={(event) => setBgEnabled(event.target.checked)}
                  />
                  Use as site background
                </label>
                <input
                  value={bgUrl}
                  onChange={(event) => setBgUrl(event.target.value)}
                  placeholder="Background image URL"
                  className="flex-1 min-w-[160px] rounded-md border bg-background px-2 py-1"
                />
                <Button variant="ghost" size="sm" onClick={startScreensaver}>
                  Screensaver
                </Button>
                <Screensaver
                  open={screensaverOpen}
                  onClose={() => setScreensaverOpen(false)}
                  orbProps={sharedOrbProps}
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between">
                  <span>Orb icon size (header)</span>
                  <span>{iconSize}px</span>
                </div>
                <Slider
                  value={[iconSize]}
                  min={24}
                  max={96}
                  step={1}
                  onValueChange={(value) => setIconSize(value[0])}
                />
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
      <BackgroundLayer
        enabled={bgEnabled}
        url={bgUrl}
        orbProps={sharedOrbProps}
      />
    </main>
  );
}
