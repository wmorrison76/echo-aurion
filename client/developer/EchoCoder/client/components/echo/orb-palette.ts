const DEFAULT_RING_PALETTE = ["#1ee3ff", "#39f3ff", "#00b7ff", "#8fdcff", "#ffe95c", "#ffd94d", "#fff06b"];
const DEFAULT_HELIX_COLOR = "#f05eff";

type RGB = { r: number; g: number; b: number };

type OrbPaletteInputs = {
  colorA: string;
  colorB: string;
  glowColor: string;
};

function clampHexComponent(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function toHex(value: number) {
  return clampHexComponent(value).toString(16).padStart(2, "0");
}

function isValidHex(value: string) {
  return /^#?[0-9a-fA-F]{3}$/.test(value) || /^#?[0-9a-fA-F]{6}$/.test(value);
}

function normalizeHex(value: string, fallback = "#ffffff") {
  const raw = (value || "").trim();
  if (!isValidHex(raw)) {
    return fallback;
  }
  const hex = raw.startsWith("#") ? raw.slice(1) : raw;
  if (hex.length === 3) {
    return `#${hex
      .split("")
      .map((char) => `${char}${char}`)
      .join("")}`.toLowerCase();
  }
  return `#${hex.toLowerCase()}`;
}

function hexToRgb(hex: string): RGB {
  const normalized = normalizeHex(hex, "#ffffff").slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: RGB) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(a: string, b: string, weight = 0.5) {
  const ratio = Math.max(0, Math.min(1, Number.isFinite(weight) ? weight : 0.5));
  const colorA = hexToRgb(a);
  const colorB = hexToRgb(b);
  const mixed: RGB = {
    r: colorA.r * (1 - ratio) + colorB.r * ratio,
    g: colorA.g * (1 - ratio) + colorB.g * ratio,
    b: colorA.b * (1 - ratio) + colorB.b * ratio,
  };
  return rgbToHex(mixed);
}

export function createOrbPalette({ colorA, colorB, glowColor }: OrbPaletteInputs) {
  const baseA = normalizeHex(colorA, DEFAULT_RING_PALETTE[0]);
  const baseB = normalizeHex(colorB, DEFAULT_RING_PALETTE[1]);
  const glow = normalizeHex(glowColor, DEFAULT_RING_PALETTE[4]);

  const mixes = [
    baseA,
    baseB,
    glow,
    mixHex(baseA, baseB, 0.35),
    mixHex(baseA, glow, 0.55),
    mixHex(baseB, glow, 0.65),
    mixHex(glow, "#ffffff", 0.25),
  ];
  const deduped = Array.from(new Set(mixes.map((hex) => normalizeHex(hex))));
  const ringPalette = deduped.length > 0 ? deduped : DEFAULT_RING_PALETTE;
  const ringColor = normalizeHex(baseB || baseA || glow, DEFAULT_RING_PALETTE[0]);
  const helixColor = normalizeHex(mixHex(baseB, glow, 0.6), DEFAULT_HELIX_COLOR);

  return {
    ringPalette,
    ringColor,
    helixColor,
  };
}
