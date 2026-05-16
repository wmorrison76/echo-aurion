export interface WineProfile {
  name: string;
  region?: string;
  grape?: string;
  sweetness: "dry" | "off_dry" | "medium" | "sweet";
  acidity: 1 | 2 | 3 | 4 | 5;
  tannin: 0 | 1 | 2 | 3 | 4 | 5;
  body: 1 | 2 | 3 | 4 | 5;
  alcohol: 1 | 2 | 3 | 4 | 5;
  flavorNotes: string[];
}

export interface DishProfile {
  intensity: 1 | 2 | 3 | 4 | 5;
  fatLevel: 1 | 2 | 3 | 4 | 5;
  sweetness: 0 | 1 | 2 | 3 | 4 | 5;
  acidity: 1 | 2 | 3 | 4 | 5;
  spiceHeat: 0 | 1 | 2 | 3 | 4 | 5;
  saltiness: 1 | 2 | 3 | 4 | 5;
  keyFlavors: string[];
}

export interface PairingAssessment {
  compatibilityScore: number;
  reasons: string[];
  suggestions: string[];
}

export class SommelierEngine {
  static assessPairing(
    wine: WineProfile,
    dish: DishProfile,
  ): PairingAssessment {
    let score = 0.5;
    const reasons: string[] = [];
    const suggestions: string[] = [];

    const intensityDelta = Math.abs(wine.body - dish.intensity);
    if (intensityDelta <= 1) {
      score += 0.15;
      reasons.push("Wine body matches dish intensity.");
    } else {
      suggestions.push("Consider a wine with body closer to dish intensity.");
    }

    if (dish.fatLevel >= 3 && wine.acidity >= 3) {
      score += 0.1;
      reasons.push("Wine acidity cuts through dish richness.");
    } else if (dish.fatLevel >= 3 && wine.acidity <= 2) {
      suggestions.push(
        "Richer dishes often benefit from higher acidity wines.",
      );
    }

    if (dish.spiceHeat >= 3 && wine.sweetness !== "dry") {
      score += 0.1;
      reasons.push("Off-dry or sweeter wines temper spice heat.");
    } else if (dish.spiceHeat >= 3 && wine.sweetness === "dry") {
      suggestions.push("Spicy dishes pair better with a touch of sweetness.");
    }

    if (dish.sweetness > 0) {
      if (wine.sweetness === "sweet" || wine.sweetness === "medium") {
        score += 0.1;
        reasons.push("Wine sweetness can stand up to dessert sweetness.");
      } else {
        suggestions.push("Desserts generally need wine sweeter than the dish.");
      }
    }

    if (dish.saltiness >= 3 && wine.tannin >= 3) {
      suggestions.push(
        "High salt with high tannin can feel astringent; consider lower tannin.",
      );
    }

    const joinedWineNotes = wine.flavorNotes.join(" ").toLowerCase();
    if (
      joinedWineNotes &&
      dish.keyFlavors.some((f) => joinedWineNotes.includes(f.toLowerCase()))
    ) {
      score += 0.1;
      reasons.push("Wine and dish share complementary flavor notes.");
    }

    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    return {
      compatibilityScore: clamp(score),
      reasons,
      suggestions,
    };
  }
}
