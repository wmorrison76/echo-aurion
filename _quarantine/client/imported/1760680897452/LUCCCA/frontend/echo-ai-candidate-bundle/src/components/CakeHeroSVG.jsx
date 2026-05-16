// src/components/CakeHero3D.jsx
import React, { useMemo } from "react";

/**
 * Lightweight SVG "3D" cake preview.
 * - No external deps (no three.js), instant render.
 * - Derives tier count from `layers` (counts items with type === "cake").
 * - Colors are customizable via props.
 *
 * Props:
 *  - layers: [{ id, type, flavor, filling, ... }]
 *  - icingColor: CSS color for tiers
 *  - accentColor: CSS color for topper / accents
 *  - plateColor: CSS color for stand
 *  - background: CSS color
 *  - topper: boolean (heart topper)
 *  - className: wrapper class
 */
export default function CakeHero3D({
  layers = [],
  icingColor = "#F2D7E2",      // soft blush
  accentColor = "#8B6CB8",     // muted purple
  plateColor = "#B6BDC7",
  background = "transparent",
  topper = true,
  className = "",
}) {
  // How many "cake" layers were added in the canvas?
  const tierCount = useMemo(() => {
    const count = layers.filter((l) => l?.type === "cake").length;
    return Math.min(Math.max(count || 1, 1), 5); // clamp 1..5
  }, [layers]);

  // Build a simple set of tiers: widest at bottom, narrower to top
  const tiers = useMemo(() => {
    // Base width & height in SVG units
    const baseW = 520;
    const baseH = 120;

    const out = [];
    for (let i = 0; i < tierCount; i++) {
      const t = tierCount - i; // 3,2,1 from bottom to top
      const width = baseW - (t - 1) * 80;
      const height = baseH - (t - 1) * 10;
      const x = 300 - width / 2;                 // centered around 300
      const y = 460 - (i * (height + 16));       // stack upwards
      out.push({ x, y, width, height, r: 26 });
    }
    return out;
  }, [tierCount]);

  // Light/dark tints for fake 3D shading
  const [icLight, icMid, icDark] = useMemo(() => {
    // quick-and-dirty HSL tweak for highlight/shadow
    const toHsl = (c) => {
      const ctx = document?.createElement?.("canvas")?.getContext?.("2d");
      if (!ctx) return [0, 0, 85];
      ctx.fillStyle = c;
      const s = ctx.fillStyle; // browser-normalized color
      // convert from rgb(...) to hsl
      const m = s.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/
      );
      if (!m) return [0, 0, 85];
      const [_, r, g, b] = m.map(Number);
      // rgb->hsl
      const rr = r / 255, gg = g / 255, bb = b / 255;
      const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
      let h = 0, s2 = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s2 = l > 0.5 ? d / (2 - max - min) : d / (max - min);
        switch (max) {
          case rr: h = (gg - bb) / d + (gg < bb ? 6 : 0); break;
          case gg: h = (bb - rr) / d + 2; break;
          case bb: h = (rr - gg) / d + 4; break;
        }
        h /= 6;
      }
      return [Math.round(h * 360), Math.round(s2 * 100), Math.round(l * 100)];
    };
    const [h, s, l] = toHsl(icingColor);
    const light = `hsl(${h} ${Math.max(20, s - 15)}% ${Math.min(98, l + 12)}%)`;
    const mid   = `hsl(${h} ${s}% ${l}%)`;
    const dark  = `hsl(${h} ${Math.min(95, s + 15)}% ${Math.max(10, l - 15)}%)`;
    return [light, mid, dark];
  }, [icingColor]);

  return (
    <div
      className={className}
      style={{
        background,
        borderRadius: 16,
        border: "1px solid rgba(148,163,184,0.25)",
      }}
    >
      <svg
        viewBox="0 0 600 520"
        width="100%"
        height="100%"
        role="img"
        aria-label="Cake preview"
      >
        {/* defs for gradients & shadow */}
        <defs>
          {/* subtle base shadow */}
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="12" stdDeviation="12" floodOpacity="0.28" />
          </filter>

          {/* icing gradient */}
          <linearGradient id="icingGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={icLight} />
            <stop offset="45%" stopColor={icMid} />
            <stop offset="100%" stopColor={icDark} />
          </linearGradient>

          {/* subtle top highlight */}
          <radialGradient id="topHighlight" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          {/* plate gradient */}
          <linearGradient id="plateGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lighten(plateColor, 10)} />
            <stop offset="100%" stopColor={darken(plateColor, 12)} />
          </linearGradient>

          {/* topper stroke */}
          <linearGradient id="topperGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={lighten(accentColor, 12)} />
            <stop offset="100%" stopColor={darken(accentColor, 8)} />
          </linearGradient>
        </defs>

        {/* cake stand / plate */}
        <g filter="url(#shadow)">
          <ellipse
            cx="300"
            cy="500"
            rx="220"
            ry="32"
            fill="url(#plateGrad)"
            opacity="0.9"
          />
        </g>

        {/* tiers */}
        {tiers.map((t, idx) => (
          <g key={idx}>
            {/* body */}
            <rect
              x={t.x}
              y={t.y}
              width={t.width}
              height={t.height}
              rx={t.r}
              fill="url(#icingGrad)"
              filter="url(#shadow)"
              stroke="rgba(0,0,0,0.06)"
              strokeWidth="1"
            />
            {/* top soft highlight */}
            <ellipse
              cx={t.x + t.width / 2}
              cy={t.y + 10}
              rx={t.width * 0.46}
              ry={t.height * 0.18}
              fill="url(#topHighlight)"
              opacity="0.7"
            />
          </g>
        ))}

        {/* optional heart topper */}
        {topper && tierCount > 1 && (
          <path
            d="M300 160
               C 280 130, 230 140, 240 180
               C 250 210, 290 230, 300 250
               C 310 230, 350 210, 360 180
               C 370 140, 320 130, 300 160
               Z"
            fill="none"
            stroke="url(#topperGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
}

/* --- tiny color helpers (no deps) --- */
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function parseRgb(c) {
  const ctx = document?.createElement?.("canvas")?.getContext?.("2d");
  if (!ctx) return [200, 200, 200];
  ctx.fillStyle = c;
  const s = ctx.fillStyle;
  const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return [200, 200, 200];
  return m.slice(1, 4).map(Number);
}
function lighten(c, pct) {
  const [r, g, b] = parseRgb(c);
  const f = (x) => clamp(Math.round(x + (255 - x) * (pct / 100)), 0, 255);
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}
function darken(c, pct) {
  const [r, g, b] = parseRgb(c);
  const f = (x) => clamp(Math.round(x * (1 - pct / 100)), 0, 255);
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}
