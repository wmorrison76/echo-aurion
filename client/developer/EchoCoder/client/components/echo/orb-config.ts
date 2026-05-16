export type OrbControlConfig = {
  iconSize: number;
  pattern: "classic" | "waves" | "galaxy" | "fractal" | "tessellation";
  colorA: string;
  colorB: string;
  showRings: boolean;
  ringSpeed: number;
  ringCount: number;
  ringParticles: number;
  ringRandomness: number;
  radius: number;
  glowParticles: number;
  glowColor: string;
  glowSpeed: number;
  glowSize: number;
  omniGlow: boolean;
  helix: boolean;
  helixParticles: number;
  helixRadius: number;
  helixPitch: number;
  helixSpeed: number;
  dirAz: number;
  dirEl: number;
  speed: number;
  wobble: number;
  compactness: number;
  waveCols: number;
  waveRows: number;
  waveAmp: number;
  waveSpeed: number;
  waveSpacing: number;
  waveColor: string;
  bgEnabled: boolean;
  bgUrl: string;
  chaosAttractor: "lorenz" | "rossler";
  chaosPoints: number;
  chaosDt: number;
  chaosSigma: number;
  chaosRho: number;
  chaosBeta: number;
  chaosScale: number;
  chaosSpeed: number;
  chaosIntensity: number;
  chaosA: number;
  chaosB: number;
  chaosC: number;
  chaosColor: string;
  tessellationType: "hex" | "tri";
  tessellationCols: number;
  tessellationRows: number;
  tessellationScale: number;
  tessellationDepth: number;
  tessellationSpeed: number;
  tessellationWarp: number;
  tessellationColorA: string;
  tessellationColorB: string;
};

const DEFAULTS: OrbControlConfig = {
  iconSize: 30,
  pattern: "classic",
  colorA: "#14e0ff",
  colorB: "#ffe95c",
  showRings: true,
  ringSpeed: 0.6,
  ringCount: 8,
  ringParticles: 900,
  ringRandomness: 0.35,
  radius: 2.2,
  glowParticles: 1200,
  glowColor: "#ffe95c",
  glowSpeed: 1.4,
  glowSize: 0.035,
  omniGlow: true,
  helix: true,
  helixParticles: 1200,
  helixRadius: 0.9,
  helixPitch: 0.5,
  helixSpeed: 1.0,
  dirAz: 0,
  dirEl: 0,
  speed: 0.35,
  wobble: 0.25,
  compactness: 0.9,
  waveCols: 120,
  waveRows: 80,
  waveAmp: 0.5,
  waveSpeed: 0.8,
  waveSpacing: 0.08,
  waveColor: "#39f3ff",
  bgEnabled: false,
  bgUrl: "",
  chaosAttractor: "lorenz",
  chaosPoints: 18000,
  chaosDt: 0.008,
  chaosSigma: 10,
  chaosRho: 28,
  chaosBeta: 8 / 3,
  chaosScale: 0.085,
  chaosSpeed: 0.7,
  chaosIntensity: 0.3,
  chaosA: 0.2,
  chaosB: 0.2,
  chaosC: 5.7,
  chaosColor: "#f7c8ff",
  tessellationType: "hex",
  tessellationCols: 72,
  tessellationRows: 48,
  tessellationScale: 0.24,
  tessellationDepth: 0.45,
  tessellationSpeed: 0.85,
  tessellationWarp: 0.55,
  tessellationColorA: "#14e0ff",
  tessellationColorB: "#ffe95c",
};

const hasWindow = typeof window !== "undefined";

const readNumber = (key: string, fallback: number) => {
  if (!hasWindow) return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
};

const readBoolean = (key: string, fallback: boolean) => {
  if (!hasWindow) return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === "1" || raw.toLowerCase() === "true";
};

const readString = (key: string, fallback: string) => {
  if (!hasWindow) return fallback;
  const raw = window.localStorage.getItem(key);
  return raw ?? fallback;
};

export const orbConfigDefaults = (): OrbControlConfig => ({ ...DEFAULTS });

export const readOrbControlConfigFromStorage = (): OrbControlConfig => {
  const base = orbConfigDefaults();
  return {
    ...base,
    iconSize: readNumber("orb.size", base.iconSize),
    pattern: readString("orb.pattern", base.pattern) as OrbControlConfig["pattern"],
    colorA: readString("orb.colorA", base.colorA),
    colorB: readString("orb.colorB", base.colorB),
    showRings: readBoolean("orb.showRings", base.showRings),
    ringSpeed: readNumber("orb.ring.speed", base.ringSpeed),
    ringCount: readNumber("orb.ring.count", base.ringCount),
    ringParticles: readNumber("orb.ring.particles", base.ringParticles),
    ringRandomness: readNumber("orb.ring.rand", base.ringRandomness),
    radius: readNumber("orb.radius", base.radius),
    glowParticles: readNumber("orb.glow.count", base.glowParticles),
    glowColor: readString("orb.glow.color", base.glowColor),
    glowSpeed: readNumber("orb.glow.speed", base.glowSpeed),
    glowSize: readNumber("orb.glow.size", base.glowSize),
    omniGlow: readBoolean("orb.omni", base.omniGlow),
    helix: readBoolean("orb.helix", base.helix),
    helixParticles: readNumber("orb.helix.particles", base.helixParticles),
    helixRadius: readNumber("orb.helix.radius", base.helixRadius),
    helixPitch: readNumber("orb.helix.pitch", base.helixPitch),
    helixSpeed: readNumber("orb.helix.speed", base.helixSpeed),
    dirAz: readNumber("orb.dir.az", base.dirAz),
    dirEl: readNumber("orb.dir.el", base.dirEl),
    speed: readNumber("orb.speed", base.speed),
    wobble: readNumber("orb.wobble", base.wobble),
    compactness: readNumber("orb.compactness", base.compactness),
    waveCols: readNumber("orb.wave.cols", base.waveCols),
    waveRows: readNumber("orb.wave.rows", base.waveRows),
    waveAmp: readNumber("orb.wave.amp", base.waveAmp),
    waveSpeed: readNumber("orb.wave.speed", base.waveSpeed),
    waveSpacing: readNumber("orb.wave.spacing", base.waveSpacing),
    waveColor: readString("orb.wave.color", base.waveColor),
    bgEnabled: readBoolean("orb.bg.enabled", base.bgEnabled),
    bgUrl: readString("orb.bg.url", base.bgUrl),
    chaosAttractor: readString("orb.chaos.mode", base.chaosAttractor) as OrbControlConfig["chaosAttractor"],
    chaosPoints: readNumber("orb.chaos.points", base.chaosPoints),
    chaosDt: readNumber("orb.chaos.dt", base.chaosDt),
    chaosSigma: readNumber("orb.chaos.sigma", base.chaosSigma),
    chaosRho: readNumber("orb.chaos.rho", base.chaosRho),
    chaosBeta: readNumber("orb.chaos.beta", base.chaosBeta),
    chaosScale: readNumber("orb.chaos.scale", base.chaosScale),
    chaosSpeed: readNumber("orb.chaos.speed", base.chaosSpeed),
    chaosIntensity: readNumber("orb.chaos.intensity", base.chaosIntensity),
    chaosA: readNumber("orb.chaos.a", base.chaosA),
    chaosB: readNumber("orb.chaos.b", base.chaosB),
    chaosC: readNumber("orb.chaos.c", base.chaosC),
    chaosColor: readString("orb.chaos.color", base.chaosColor),
    tessellationType: readString("orb.tess.pattern", base.tessellationType) as OrbControlConfig["tessellationType"],
    tessellationCols: readNumber("orb.tess.cols", base.tessellationCols),
    tessellationRows: readNumber("orb.tess.rows", base.tessellationRows),
    tessellationScale: readNumber("orb.tess.scale", base.tessellationScale),
    tessellationDepth: readNumber("orb.tess.depth", base.tessellationDepth),
    tessellationSpeed: readNumber("orb.tess.speed", base.tessellationSpeed),
    tessellationWarp: readNumber("orb.tess.warp", base.tessellationWarp),
    tessellationColorA: readString("orb.tess.colorA", base.tessellationColorA),
    tessellationColorB: readString("orb.tess.colorB", base.tessellationColorB),
  };
};

export const mergeOrbConfig = (
  partial?: Partial<OrbControlConfig>,
  base?: OrbControlConfig,
): OrbControlConfig => ({
  ...(base ?? readOrbControlConfigFromStorage()),
  ...(partial ?? {}),
});
