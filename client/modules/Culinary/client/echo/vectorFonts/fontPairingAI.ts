/**
 * Font Pairing AI Engine
 * Intelligent font pairing recommendations based on cuisine, brand, and context
 * Production-ready AI system for menu design
 */

import type {
  VectorFont,
  FontPairingRecommendation,
  BrandIdentity,
  CuisineStyle,
  BrandMood,
} from "./types";
import { vectorFontLibrary } from "./fontLibrary";

interface PairingScore {
  pairing: FontPairingRecommendation;
  score: number;
  reasons: string[];
}

/**
 * Font Pairing AI Engine
 * Recommends optimal font combinations based on multiple factors
 */
export class FontPairingAI {
  /**
   * Main recommendation engine
   * Returns ranked font pairing suggestions
   */
  static recommendPairings(
    brand: BrandIdentity,
    context?: {
      numberOfItems?: number;
      menuType?: "single-page" | "multi-page";
      targetAudience?: string;
    }
  ): FontPairingRecommendation[] {
    // Score all available pairings
    const scoredPairings: PairingScore[] = vectorFontLibrary.pairings.map((pairing) => {
      const score = this.scorePairing(pairing, brand, context);
      return score;
    });

    // Sort by score descending
    return scoredPairings
      .sort((a, b) => b.score - a.score)
      .map((s) => s.pairing);
  }

  /**
   * Score a pairing based on brand and context
   */
  private static scorePairing(
    pairing: FontPairingRecommendation,
    brand: BrandIdentity,
    context?: {
      numberOfItems?: number;
      menuType?: "single-page" | "multi-page";
      targetAudience?: string;
    }
  ): PairingScore {
    let score = 50; // Base score
    const reasons: string[] = [];

    // Check if pairing is suitable for cuisine type
    if (pairing.bestFor.includes(brand.cuisine)) {
      score += 30;
      reasons.push(`Ideal for ${brand.cuisine} cuisine`);
    }

    // Check if pairing matches brand mood
    if (
      pairing.bestFor.some((type) =>
        this.moodMatches(type, brand.mood)
      )
    ) {
      score += 20;
      reasons.push(`Matches ${brand.mood} aesthetic`);
    }

    // Bonus for explicit mood matching
    const headingMoods = this.getFontMoods(pairing.headingFont);
    const bodyMoods = this.getFontMoods(pairing.bodyFont);

    if (headingMoods.includes(brand.mood)) {
      score += 15;
      reasons.push("Heading font matches brand mood perfectly");
    }

    if (bodyMoods.includes(brand.mood)) {
      score += 10;
      reasons.push("Body font complements brand");
    }

    // Contrast scoring
    const headingIsSerif = pairing.headingFont.category === "serif";
    const bodyIsSerif = pairing.bodyFont.category === "serif";

    if (headingIsSerif && !bodyIsSerif) {
      score += 15;
      reasons.push("Good serif/sans-serif contrast");
    }

    // Check if fonts have explicitly listed pairings
    if (
      pairing.headingFont.pairingWith?.includes(pairing.bodyFont.id) ||
      pairing.bodyFont.pairingWith?.includes(pairing.headingFont.id)
    ) {
      score += 25;
      reasons.push("Designer-recommended combination");
    }

    // Confidence score boost
    score = Math.round(score * pairing.confidence);

    return {
      pairing,
      score: Math.min(100, score),
      reasons,
    };
  }

  /**
   * Get moods associated with a font
   */
  private static getFontMoods(font: VectorFont): BrandMood[] {
    return (font.mood || []) as BrandMood[];
  }

  /**
   * Check if mood type matches brand mood
   */
  private static moodMatches(type: string, brandMood: BrandMood): boolean {
    const moodMap: Record<string, BrandMood[]> = {
      fine_dining: ["luxury", "classic", "elegant"],
      bistro: ["classic", "rustic", "warm"],
      casual: ["playful", "modern", "friendly"],
      hotel_lobby: ["luxury", "minimal", "professional"],
      pool_bar: ["vibrant", "playful", "modern"],
      cafe: ["minimal", "modern", "friendly"],
      steakhouse: ["luxury", "rustic"],
      seafood: ["elegant", "luxury", "minimal"],
      tasting_menu: ["luxury", "minimal"],
    };

    const applicableMoods = moodMap[type] || [];
    return applicableMoods.includes(brandMood);
  }

  /**
   * Get font by ID
   */
  static getFontById(fontId: string): VectorFont | undefined {
    return vectorFontLibrary.fonts.find((f) => f.id === fontId);
  }

  /**
   * Suggest fonts for specific role
   */
  static suggestFontsForRole(
    role: "heading" | "body" | "accent",
    brand: BrandIdentity,
    limit: number = 5
  ): VectorFont[] {
    let candidates = vectorFontLibrary.fonts;

    // Filter based on role
    if (role === "heading") {
      candidates = candidates.filter((f) =>
        ["serif", "display", "decorative"].includes(f.category)
      );
    } else if (role === "body") {
      candidates = candidates.filter((f) =>
        ["sans-serif", "serif"].includes(f.category)
      );
    } else if (role === "accent") {
      candidates = candidates.filter((f) =>
        ["handwriting", "display", "decorative"].includes(f.category)
      );
    }

    // Filter based on cuisine
    if (brand.cuisine) {
      candidates = candidates.filter((f) =>
        f.cuisine?.includes(brand.cuisine) || f.cuisine?.length === 0
      );
    }

    // Filter based on mood
    candidates = candidates
      .filter((f) => {
        if (!f.mood || f.mood.length === 0) return true;
        return f.mood.includes(brand.mood);
      })
      .slice(0, limit);

    return candidates;
  }

  /**
   * Create custom pairing recommendation
   */
  static createCustomPairing(
    headingFontId: string,
    bodyFontId: string,
    accentFontId?: string
  ): FontPairingRecommendation | null {
    const headingFont = this.getFontById(headingFontId);
    const bodyFont = this.getFontById(bodyFontId);
    const accentFont = accentFontId ? this.getFontById(accentFontId) : undefined;

    if (!headingFont || !bodyFont) return null;

    return {
      headingFont,
      bodyFont,
      accentFont,
      confidence: 0.75,
      reason: "Custom user pairing",
      bestFor: [headingFont.category as any],
    };
  }

  /**
   * Analyze compatibility between two fonts
   */
  static analyzeCompatibility(fontId1: string, fontId2: string): number {
    const font1 = this.getFontById(fontId1);
    const font2 = this.getFontById(fontId2);

    if (!font1 || !font2) return 0;

    let score = 50;

    // Same category = less compatible (monotonous)
    if (font1.category === font2.category) {
      score -= 20;
    }

    // Check explicit pairings
    if (font1.pairingWith?.includes(fontId2) || font2.pairingWith?.includes(fontId1)) {
      score += 30;
    }

    // Contrast analysis
    const categories = [font1.category, font2.category];
    if (
      (categories.includes("serif") && categories.includes("sans-serif")) ||
      (categories.includes("serif") && categories.includes("display")) ||
      (categories.includes("sans-serif") && categories.includes("display"))
    ) {
      score += 15;
    }

    // Mood compatibility
    const moods1 = font1.mood || [];
    const moods2 = font2.mood || [];
    const commonMoods = moods1.filter((m) => moods2.includes(m));

    if (commonMoods.length > 0) {
      score += commonMoods.length * 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get alternative pairings if user wants variety
   */
  static getAlternativePairings(
    brand: BrandIdentity,
    excludeFontIds: string[] = []
  ): FontPairingRecommendation[] {
    let alternatives = vectorFontLibrary.pairings.filter((pairing) => {
      const ids = [pairing.headingFont.id, pairing.bodyFont.id];
      if (pairing.accentFont) ids.push(pairing.accentFont.id);
      return !ids.some((id) => excludeFontIds.includes(id));
    });

    // Score remaining pairings
    const scored = alternatives
      .map((pairing) => ({
        pairing,
        score: this.scorePairing(pairing, brand),
      }))
      .sort((a, b) => b.score.score - a.score.score);

    return scored.map((s) => s.pairing);
  }

  /**
   * Suggest improved pairing if current pairing has issues
   */
  static suggestImprovement(
    currentHeadingId: string,
    currentBodyId: string,
    brand: BrandIdentity
  ): FontPairingRecommendation | null {
    const compatibility = this.analyzeCompatibility(currentHeadingId, currentBodyId);

    // If compatibility is good, no suggestion needed
    if (compatibility > 70) return null;

    // Get recommendations
    const recommendations = this.recommendPairings(brand);

    // Return first recommendation that doesn't use current fonts
    return (
      recommendations.find((r) => {
        return (
          r.headingFont.id !== currentHeadingId &&
          r.bodyFont.id !== currentBodyId
        );
      }) || recommendations[0]
    );
  }

  /**
   * Get pairing statistics
   */
  static getPairingStats(): {
    totalPairings: number;
    totalFonts: number;
    categoriesRepresented: string[];
    moodsRepresented: string[];
  } {
    const cuisines = new Set<string>();
    const moods = new Set<string>();

    vectorFontLibrary.pairings.forEach((p) => {
      p.bestFor.forEach((c) => cuisines.add(c));
      vectorFontLibrary.fonts.forEach((f) => {
        f.mood?.forEach((m) => moods.add(m));
      });
    });

    return {
      totalPairings: vectorFontLibrary.pairings.length,
      totalFonts: vectorFontLibrary.fonts.length,
      categoriesRepresented: Array.from(cuisines),
      moodsRepresented: Array.from(moods),
    };
  }

  /**
   * Search fonts by tag or name
   */
  static searchFonts(query: string, limit: number = 10): VectorFont[] {
    const lowerQuery = query.toLowerCase();

    return vectorFontLibrary.fonts
      .filter(
        (f) =>
          f.name.toLowerCase().includes(lowerQuery) ||
          f.tags.some((t) => t.toLowerCase().includes(lowerQuery)) ||
          f.description?.toLowerCase().includes(lowerQuery)
      )
      .slice(0, limit);
  }

  /**
   * Get trending pairings (most recommended)
   */
  static getTrendingPairings(limit: number = 3): FontPairingRecommendation[] {
    return vectorFontLibrary.pairings
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }
}

export default FontPairingAI;
