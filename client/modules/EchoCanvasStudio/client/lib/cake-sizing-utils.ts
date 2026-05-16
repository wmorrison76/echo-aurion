/**
 * Cake Sizing & Calculation Utilities
 * Calculates servings, tier recommendations, and pricing based on cake specifications
 */

export interface TierSpec {
  diameter?: number;
  width?: number;
  depth?: number;
  height: number;
}

export interface PricingBreakdown {
  servings: number;
  basePrice: number;
  decorations: number;
  stand: number;
  complexity: number;
  total: number;
}

/**
 * Calculate servings for a round cake tier
 * Assumes 2 sq inches per serving
 */
export function servingsForRound(diameter: number): number {
  const r = diameter / 2;
  return Math.max(1, Math.round((Math.PI * r * r) / 2));
}

/**
 * Estimate total servings for all tiers based on shape
 */
export function estimateServings(
  tiers: TierSpec[],
  shape: "round" | "square" | "sheet",
): number {
  if (shape === "round") {
    return tiers.reduce((a, t) => a + servingsForRound(t.diameter || 0), 0);
  }

  if (shape === "square") {
    // Square cakes yield ~25% more servings than round of same diameter
    return tiers.reduce(
      (a, t) => a + Math.round(servingsForRound(t.diameter || 0) * 1.25),
      0,
    );
  }

  // Sheet cakes - use preset sizes or calculate from area
  const sheetPreset = (w?: number, d?: number) => {
    const W = Math.round(w || 0);
    const D = Math.round(d || 0);
    const key = `${Math.min(W, D)}x${Math.max(W, D)}`;

    const presets: Record<string, number> = {
      "9x13": 22,
      "13x18": 42,
      "18x26": 75,
    };

    if (presets[key]) {
      return presets[key];
    }

    // Calculate from area (2 sq inches per serving)
    const area = (w || 0) * (d || 0);
    return Math.max(1, Math.round(area / 6.2));
  };

  return tiers.reduce((a, t) => a + sheetPreset(t.width, t.depth), 0);
}

/**
 * Recommend tier sizes based on guest count
 * Returns array of recommended tiers from bottom to top
 * @param guests - Number of guests
 * @param tierCount - Optional: Force exactly this many tiers
 */
export function recommendTiers(guests: number, tierCount?: number): TierSpec[] {
  const sizes = [6, 8, 10, 12, 14, 16, 18, 20];
  const tiers: TierSpec[] = [];

  // If tier count is specified, generate exactly that many tiers
  if (tierCount !== undefined && tierCount > 0) {
    // Distribute guest count evenly across tiers
    const servingsPerTier = Math.ceil(guests / tierCount);

    // Generate tiers from bottom (largest) to top (smallest)
    for (let i = 0; i < tierCount; i++) {
      // Find the smallest size that can serve the required amount
      let bestSize = 6;
      for (let j = 0; j < sizes.length; j++) {
        const size = sizes[j];
        const servings = servingsForRound(size);
        if (servings >= servingsPerTier) {
          bestSize = size;
          break;
        }
      }

      // For multiple tiers: make each tier progressively smaller from bottom to top
      let tierSize = bestSize;
      if (tierCount > 1) {
        // Reduce size for upper tiers
        const reduction = i * 2;
        tierSize = Math.max(6, bestSize - reduction);
      }

      // Avoid duplicate sizes when stacking
      const existingSizes = tiers.map((t) => t.diameter);
      while (existingSizes.includes(tierSize) && tierSize > 6) {
        tierSize -= 1;
      }

      tiers.push({ diameter: tierSize, height: 4 });
    }

    // Ensure tiers are sorted from largest to smallest (bottom to top)
    tiers.sort((a, b) => b.diameter - a.diameter);

    return tiers;
  }

  // Original algorithm if no tier count specified
  let remaining = guests;

  // Build tiers from largest to smallest
  for (let i = sizes.length - 1; i >= 0; i--) {
    const d = sizes[i];
    const s = servingsForRound(d);

    if (remaining <= 0) break;

    // Add tier if we need at least 70% of its capacity, or if it's the first tier
    if (remaining >= s * 0.7 || tiers.length === 0) {
      tiers.unshift({ diameter: d, height: 4 });
      remaining -= s;
    }
  }

  // If still short on servings, add a small tier
  if (estimateServings(tiers, "round") < guests) {
    tiers.push({ diameter: 6, height: 4 });
  }

  return tiers;
}

/**
 * Validate if cake can accommodate guest count
 * Returns { isValid: boolean, message: string, shortage?: number }
 */
export function validateCakeSize(
  tiers: TierSpec[],
  shape: "round" | "square" | "sheet",
  guestCount: number,
): { isValid: boolean; message: string; shortage?: number } {
  const servings = estimateServings(tiers, shape);

  if (servings >= guestCount) {
    return {
      isValid: true,
      message: `Cake serves ${servings} people (${guestCount - servings} extra servings)`,
    };
  }

  const shortage = guestCount - servings;
  return {
    isValid: false,
    message: `⚠️ Cake only serves ${servings} people. Need ${shortage} more servings!`,
    shortage,
  };
}

/**
 * Get recommended tiers for a guest count with tier specifications
 */
export function getRecommendedTierSpecs(guestCount: number): {
  tiers: TierSpec[];
  totalServings: number;
  recommendation: string;
} {
  const tiers = recommendTiers(guestCount);
  const totalServings = estimateServings(tiers, "round");

  const tierDescriptions = tiers
    .map((t, i) => `${t.diameter}"Ø`)
    .reverse()
    .join(" + ");

  return {
    tiers,
    totalServings,
    recommendation: `${tiers.length}-tier cake: ${tierDescriptions} (serves ~${totalServings})`,
  };
}

/**
 * Calculate pricing based on design
 */
export function calculatePricing(
  tiers: TierSpec[],
  shape: "round" | "square" | "sheet",
  decorationCount: number = 0,
  stand?: "none" | "gold" | "acrylic",
): PricingBreakdown {
  const servings = estimateServings(tiers, shape);
  const basePerServing = 6; // USD
  const basePrice = servings * basePerServing;

  const deco = decorationCount * 12;

  const standPrice = stand === "gold" ? 25 : stand === "acrylic" ? 15 : 0;

  const complexity = Math.max(0, (tiers.length - 1) * 20);

  const total = basePrice + deco + standPrice + complexity;

  return {
    servings,
    basePrice,
    decorations: deco,
    stand: standPrice,
    complexity,
    total,
  };
}

/**
 * Get next delivery deadline based on event date and prep days
 */
export function getDeliveryDeadline(
  eventDate?: string,
  prepDays: number = 2,
): string | null {
  if (!eventDate) return null;

  const d = new Date(eventDate);
  const start = new Date(d);
  start.setDate(d.getDate() - prepDays);

  return start.toISOString().slice(0, 10);
}

/**
 * Recommend tiers with specific heights for visual balance
 */
export function getBalancedTiers(
  guestCount: number,
  preferredShape: "round" | "square" = "round",
): TierSpec[] {
  const baseTiers = recommendTiers(guestCount);

  // Add standard heights for visual balance
  return baseTiers.map((tier, index) => ({
    ...tier,
    height: index === baseTiers.length - 1 ? 3 : 4, // Top tier slightly shorter
  }));
}
