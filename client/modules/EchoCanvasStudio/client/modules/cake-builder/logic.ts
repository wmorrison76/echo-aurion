import { DesignData, PricingBreakdown, TierSpec } from "./types";

export function servingsForRound(diameter: number) {
  const r = diameter / 2;
  return Math.max(1, Math.round((Math.PI * r * r) / 2));
}

export function estimateServings(
  tiers: TierSpec[],
  shape: "round" | "square" | "sheet",
) {
  if (shape === "round")
    return tiers.reduce((a, t) => a + servingsForRound(t.diameter || 0), 0);
  if (shape === "square")
    return tiers.reduce(
      (a, t) => a + Math.round(servingsForRound(t.diameter || 0) * 1.25),
      0,
    );
  // sheet
  const sheetPreset = (w?: number, d?: number) => {
    const W = Math.round(w || 0);
    const D = Math.round(d || 0);
    const key = `${Math.min(W, D)}x${Math.max(W, D)}`;
    const map: Record<string, number> = {
      "9x13": 22,
      "13x18": 42,
      "18x26": 75,
    };
    if (map[key]) return map[key];
    const area = (w || 0) * (d || 0);
    return Math.max(1, Math.round(area / 6.2));
  };
  return tiers.reduce((a, t) => a + sheetPreset(t.width, t.depth), 0);
}

export function recommendTiers(guests: number): TierSpec[] {
  const sizes = [6, 8, 10, 12, 14];
  const tiers: TierSpec[] = [];
  let remaining = guests;
  for (let i = sizes.length - 1; i >= 0; i--) {
    const d = sizes[i];
    const s = servingsForRound(d);
    if (remaining <= 0) break;
    if (remaining >= s * 0.7 || tiers.length === 0) {
      tiers.unshift({ diameter: d, height: 4 });
      remaining -= s;
    }
  }
  if (estimateServings(tiers, "round") < guests) {
    tiers.push({ diameter: 6, height: 4 });
  }
  return tiers;
}

export function priceEstimate(design: DesignData): PricingBreakdown {
  const servings = estimateServings(design.tiers, design.shape);
  const basePerServing = 6; // USD
  const basePrice = servings * basePerServing;
  const deco = design.decorations.length * 12;
  const stand =
    design.stand === "gold" ? 25 : design.stand === "acrylic" ? 15 : 0;
  const complexity = Math.max(
    0,
    (design.tiers.length - 1) * 20 + (design.sliceAngle > 0 ? 10 : 0),
  );
  const total = basePrice + deco + stand + complexity;
  return { servings, basePrice, decorations: deco, stand, complexity, total };
}

export function prepStart(eventDate?: string, days = 2) {
  if (!eventDate) return null;
  const d = new Date(eventDate);
  const start = new Date(d);
  start.setDate(d.getDate() - days);
  return start.toISOString().slice(0, 10);
}
