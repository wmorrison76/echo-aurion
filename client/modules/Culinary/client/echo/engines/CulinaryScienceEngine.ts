export interface IngredientChemistryProfile {
  ingredientId: string;
  acidity?: number;
  acidPercentage?: number;
  fatPercentage?: number;
  sugarPercentage?: number;
  proteinPercentage?: number;
  waterActivity?: number;
  volatiles: { name: string; intensity?: number; notes?: string }[];
  emulsifiers?: boolean;
  emulsionStrength?: number;
  thickeningPower?: number;
  saltinessFactor?: number;
}

export interface FlavorBalance {
  acid: number;
  fat: number;
  sweet: number;
  salty: number;
  umami: number;
  bitter: number;
  aromatic: number;
  spice: number;
  richness: number;
  notes: string[];
}

export interface IngredientAmount {
  ingredientId: string;
  grams: number;
}

export interface ThermalPhase {
  name: string;
  targetTempC: number;
  durationMinutes: number;
}

export interface ThermalAssessment {
  safeCooked: boolean;
  likelyMaillard: boolean;
  likelyCaramelization: boolean;
  overReductionRisk: boolean;
  notes: string[];
}

export class CulinaryScienceEngine {
  static assessFlavorBalance(
    ingredients: IngredientAmount[],
    profiles: Record<string, IngredientChemistryProfile>,
  ): FlavorBalance {
    let acid = 0;
    let fat = 0;
    let sweet = 0;
    let salty = 0;
    let umami = 0;
    let bitter = 0;
    let aromatic = 0;
    let spice = 0;
    let richness = 0;
    const notes: string[] = [];

    for (const ing of ingredients) {
      const p = profiles[ing.ingredientId];
      if (!p) continue;

      const weight = ing.grams || 0;
      if (p.acidPercentage) acid += weight * (p.acidPercentage / 100);
      if (p.fatPercentage) fat += weight * (p.fatPercentage / 100);
      if (p.sugarPercentage) sweet += weight * (p.sugarPercentage / 100);
      if (p.saltinessFactor) salty += weight * p.saltinessFactor * 0.03;
      if (p.proteinPercentage)
        umami += weight * (p.proteinPercentage / 100) * 0.2;

      if (p.volatiles?.length) {
        for (const v of p.volatiles) {
          const intensity = v.intensity ?? 0.2;
          aromatic += weight * intensity * 0.01;
          if (
            /capsaicin|chili|pepper|pungent/i.test(v.name) ||
            /spicy|picante/i.test(v.notes ?? "")
          ) {
            spice += weight * intensity * 0.01;
          }
          if (/bitter|tannin|charred/i.test(v.notes ?? "")) {
            bitter += weight * intensity * 0.01;
          }
        }
      }

      richness += (p.fatPercentage ?? 0) * weight * 0.01;
    }

    const scale = (n: number) => Number((n / 100).toFixed(3));

    const flavor: FlavorBalance = {
      acid: scale(acid),
      fat: scale(fat),
      sweet: scale(sweet),
      salty: scale(salty),
      umami: scale(umami),
      bitter: scale(bitter),
      aromatic: scale(aromatic),
      spice: scale(spice),
      richness: scale(richness),
      notes,
    };

    if (flavor.acid > flavor.fat * 1.5) {
      notes.push("Dish leans bright/acidic; consider adding fat or sweetness.");
    } else if (flavor.fat > flavor.acid * 2) {
      notes.push("Dish leans rich; consider more acid or bitterness for lift.");
    }

    if (flavor.sweet > 0.6 && flavor.acid < 0.2) {
      notes.push("Sweetness dominates without enough acid to balance.");
    }

    if (flavor.spice > 0.4) {
      notes.push(
        "Spice is a prominent element; balance salt and sour accordingly.",
      );
    }

    if (flavor.umami > 0.5) {
      notes.push("Strong umami backbone; be careful not to over-salt.");
    }

    return flavor;
  }

  static assessThermalProfile(phases: ThermalPhase[]): ThermalAssessment {
    let maxTemp = 0;
    let totalMinutes = 0;
    const notes: string[] = [];

    for (const phase of phases) {
      maxTemp = Math.max(maxTemp, phase.targetTempC);
      totalMinutes += phase.durationMinutes;
    }

    const safeCooked = maxTemp >= 75 && totalMinutes >= 5;
    const likelyMaillard = maxTemp >= 140 && totalMinutes >= 5;
    const likelyCaramelization = maxTemp >= 160 && totalMinutes >= 5;
    const overReductionRisk = totalMinutes >= 120 && maxTemp >= 90;

    if (!safeCooked) {
      notes.push("Thermal profile may not be sufficient for food safety.");
    }

    if (likelyMaillard) {
      notes.push("Adequate temperature for Maillard browning.");
    }

    if (likelyCaramelization) {
      notes.push("High enough temperature for sugar caramelization.");
    }

    if (overReductionRisk) {
      notes.push("Extended cooking time; risk of over-reduction or dryness.");
    }

    return {
      safeCooked,
      likelyMaillard,
      likelyCaramelization,
      overReductionRisk,
      notes,
    };
  }

  static extractTechniquesFromRecipe(
    ingredients: string[],
    instructions: string[],
  ): string[] {
    const techniques: string[] = [];
    const commonTechniques = [
      "dice",
      "julienne",
      "brunoise",
      "chiffonade",
      "blanch",
      "sauté",
      "braise",
      "poach",
      "sous-vide",
      "deglaze",
      "emulsify",
      "temper",
      "caramelize",
      "reduce",
      "infuse",
      "clarify",
      "rest",
      "bloom",
      "proof",
      "roast",
      "grill",
      "smoke",
      "fry",
      "bake",
      "simmer",
      "steep",
      "macerate",
    ];

    const combinedText =
      `${ingredients.join(" ")} ${instructions.join(" ")}`.toLowerCase();

    for (const technique of commonTechniques) {
      if (combinedText.includes(technique)) {
        techniques.push(technique);
      }
    }

    return [...new Set(techniques)];
  }
}
