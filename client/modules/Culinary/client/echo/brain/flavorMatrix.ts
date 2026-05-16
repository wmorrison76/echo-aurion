/**
 * Flavor Matrix
 * Calculates overall dish flavor balance based on ingredient chemistry and ratios
 * Enables Echo to:
 * - Predict flavor outcomes
 * - Identify imbalances (too acidic, too rich, weak emulsion, etc.)
 * - Suggest corrections ("increase oil by 20%")
 * - Generalize across dish types
 */

import type { IngredientChemistryProfile } from "../codex/ingredientChemistry";

export interface IngredientAmount {
  ingredientId: string;
  grams: number;
}

export interface FlavorBalanceResult {
  acid: number; // total acid grams
  fat: number; // total fat grams
  sweet: number; // total sugar grams
  savory: number; // umami contribution
  bitter: number; // bitterness contribution
  aromatic: number; // aromatic volatility score
  viscosity: number; // thickening power aggregate
  emulsionStability: number; // likelihood of stable emulsion
  waterActivityAvg: number; // average water activity
  maillardPotential: number; // browning tendency
  caramelizationPotential: number;

  // Ratios & Recommendations
  fatToAcidRatio: number; // oil:vinegar ratio (3:1 is classic)
  saltinessFactor: number; // perceived salt intensity
  overallBalanceNotes: string[];
  suggestions: string[];
}

export class FlavorMatrix {
  /**
   * Calculate overall flavor balance from ingredient list + chemistry
   */
  static calculateBalance(
    ingredients: IngredientAmount[],
    chemistryProfiles: Record<string, IngredientChemistryProfile>,
  ): FlavorBalanceResult {
    let acid = 0;
    let fat = 0;
    let sweet = 0;
    let aromatic = 0;
    let savory = 0;
    let bitter = 0;
    let viscosity = 0;
    let emulsionStability = 0;
    let waterActivitySum = 0;
    let maillardPotential = 0;
    let caramelizationPotential = 0;
    let saltinessFactor = 0;

    let totalWeight = 0;

    for (const item of ingredients) {
      const profile = chemistryProfiles[item.ingredientId];
      if (!profile) continue;

      const weight = item.grams;
      totalWeight += weight;

      // Acid accumulation
      if (profile.acidPercentage) {
        acid += weight * (profile.acidPercentage / 100);
      }

      // Fat accumulation
      if (profile.fatPercentage) {
        fat += weight * (profile.fatPercentage / 100);
      }

      // Sugar accumulation
      if (profile.sugarPercentage) {
        sweet += weight * (profile.sugarPercentage / 100);
      }

      // Volatile aromatics
      for (const v of profile.volatiles) {
        aromatic += (v.intensity ?? 0.1) * weight * 0.01;
      }

      // Basic tastes
      if (profile.basicTastes) {
        savory += (profile.basicTastes.umami ?? 0) * weight * 0.01;
        bitter += (profile.basicTastes.bitter ?? 0) * weight * 0.01;
      }

      // Thickening power
      if (profile.thickeningPower) {
        viscosity += weight * profile.thickeningPower * 0.02;
      }

      // Emulsion stability
      if (profile.emulsifiers && profile.emulsionStrength) {
        emulsionStability +=
          weight * profile.emulsionStrength * (profile.fatPercentage ? 0.1 : 1);
      }

      // Water activity average
      if (profile.waterActivity !== undefined) {
        waterActivitySum += profile.waterActivity * weight;
      }

      // Browning potential
      if (profile.maillardPotential) {
        maillardPotential += weight * profile.maillardPotential * 0.01;
      }

      if (profile.caramelizationPotential) {
        caramelizationPotential +=
          weight * profile.caramelizationPotential * 0.01;
      }

      // Saltiness
      if (profile.saltinessFactor) {
        saltinessFactor += weight * profile.saltinessFactor * 0.01;
      }
    }

    // Normalize
    const scale = (n: number) => parseFloat((n / 100).toFixed(3));
    const waterActivityAvg =
      totalWeight > 0 ? waterActivitySum / totalWeight : 0.5;

    // Fat-to-acid ratio (classic vinaigrette is ~3:1)
    const fatToAcidRatio = acid > 0 ? fat / acid : 0;

    const notes: string[] = [];
    const suggestions: string[] = [];

    // Balance assessment
    if (acid > fat * 0.5) {
      notes.push("Dish leans acidic");
      if (fatToAcidRatio < 2) {
        suggestions.push(
          "Increase fat (oil/butter) by 20–30% or reduce acid by 15%",
        );
      }
    } else if (fat > acid * 2) {
      notes.push("Dish leans rich/fatty");
      if (fatToAcidRatio > 4) {
        suggestions.push(
          "Add acid (vinegar/lemon) to brighten and balance richness",
        );
      }
    } else {
      notes.push("Fat-to-acid balance appears optimal");
    }

    // Sweetness check
    if (sweet > 10) {
      notes.push("Sweetness present");
      if (sweet > fat * 0.5 && acid < 3) {
        suggestions.push("Add acid (lemon/vinegar) to balance sweetness");
      }
    }

    // Aromatic complexity
    if (aromatic > 15) {
      notes.push("Aromatic complexity high");
    } else if (aromatic < 5) {
      notes.push("Aromatic profile light");
      suggestions.push("Consider adding garlic, shallot, or herbs for depth");
    }

    // Emulsion stability
    if (emulsionStability < 5 && fat > 20) {
      notes.push("Emulsion stability low for amount of fat");
      suggestions.push(
        "Add emulsifier (mustard, egg yolk, or mayo) to stabilize emulsion",
      );
    }

    // Savory/umami check
    if (savory < 2 && fat > 30) {
      suggestions.push(
        "Add umami element (garlic, mustard, soy, Parmesan) for depth",
      );
    }

    // Water activity (shelf life)
    if (waterActivityAvg > 0.75) {
      notes.push("High water activity; best used fresh");
    } else if (waterActivityAvg < 0.6) {
      notes.push("Low water activity; good shelf stability");
    }

    // Browning potential
    if (maillardPotential > 10) {
      notes.push("High browning potential");
    }

    if (caramelizationPotential > 10) {
      notes.push("Caramelization likely when heated");
    }

    return {
      acid: scale(acid),
      fat: scale(fat),
      sweet: scale(sweet),
      savory: scale(savory),
      bitter: scale(bitter),
      aromatic: scale(aromatic),
      viscosity: scale(viscosity),
      emulsionStability: scale(emulsionStability),
      waterActivityAvg,
      maillardPotential: scale(maillardPotential),
      caramelizationPotential: scale(caramelizationPotential),
      fatToAcidRatio: parseFloat(fatToAcidRatio.toFixed(2)),
      saltinessFactor: scale(saltinessFactor),
      overallBalanceNotes: notes,
      suggestions,
    };
  }

  /**
   * Special: Vinaigrette Balance
   * Checks standard 3:1 oil:vinegar ratio and suggests corrections
   */
  static balanceVinaigrette(
    oilGrams: number,
    vinegaarGrams: number,
    otherIngredients: IngredientAmount[] = [],
    chemistryProfiles: Record<string, IngredientChemistryProfile> = {},
  ): { ratio: number; balanced: boolean; notes: string[] } {
    const ratio = oilGrams / vinegaarGrams;
    const notes: string[] = [];
    const balanced = Math.abs(ratio - 3) < 0.5;

    if (ratio < 2) {
      notes.push(
        `Ratio ${ratio.toFixed(2)}:1 is too acidic. Ideal is 3:1 oil:vinegar.`,
      );
      notes.push(
        `Increase oil by ${Math.round(((3 * vinegaarGrams - oilGrams) / vinegaarGrams) * 100) / 100}g or reduce vinegar.`,
      );
    } else if (ratio > 4) {
      notes.push(
        `Ratio ${ratio.toFixed(2)}:1 is too rich. Ideal is 3:1 oil:vinegar.`,
      );
      notes.push(
        `Reduce oil by ${Math.round(((oilGrams - 3 * vinegaarGrams) / oilGrams) * 100) / 100}g or increase vinegar.`,
      );
    } else {
      notes.push(`Ratio ${ratio.toFixed(2)}:1 is well-balanced.`);
    }

    return { ratio: parseFloat(ratio.toFixed(2)), balanced, notes };
  }

  /**
   * Special: Mayonnaise / Emulsion Stability
   * Classic rule: 1 egg yolk emulsifies ~250ml oil
   * Returns warnings if proportions exceed stable range
   */
  static assessEmulsionCapacity(
    emulsifierGrams: number,
    fatGrams: number,
    chemistryProfiles: Record<string, IngredientChemistryProfile>,
  ): { stable: boolean; notes: string[] } {
    const notes: string[] = [];

    // Rough heuristic: 1g egg yolk (18g yolk, ~5g fat) → ~100ml oil (~92g)
    const capacityFatPerGramEmulsifier = emulsifierGrams > 0 ? 18 : 0;
    const maxStableFat = emulsifierGrams * capacityFatPerGramEmulsifier;

    const stable = fatGrams <= maxStableFat * 1.1; // 10% overhead

    if (!stable) {
      notes.push(
        `Fat-to-emulsifier ratio exceeds stability. ${emulsifierGrams}g emulsifier can stabilize ~${Math.round(maxStableFat)}g fat; you have ${fatGrams}g.`,
      );
      notes.push(
        `Add ${Math.round((fatGrams - maxStableFat) / capacityFatPerGramEmulsifier + 0.5)}g more emulsifier or reduce fat by ${Math.round(fatGrams - maxStableFat)}g.`,
      );
      notes.push(
        "If emulsion breaks: blend in slowly, start with new emulsifier, or add water/acid gradually.",
      );
    } else {
      notes.push(
        `Emulsion proportions stable: ${emulsifierGrams}g emulsifier, ${fatGrams}g fat.`,
      );
    }

    return { stable, notes };
  }

  /**
   * Suggest flavor corrections based on balance result
   */
  static suggestCorrections(balance: FlavorBalanceResult): string[] {
    const corrections: string[] = [];

    if (balance.fatToAcidRatio < 2) {
      corrections.push("Increase oil/fat to achieve 3:1 ratio with acid");
    }

    if (balance.fatToAcidRatio > 4) {
      corrections.push(
        "Add acid (vinegar, lemon, or citrus) to brighten richness",
      );
    }

    if (balance.aromatic < 5) {
      corrections.push(
        "Add aromatic elements: garlic, shallot, or fresh herbs",
      );
    }

    if (
      balance.emulsionStability < 5 &&
      balance.fat > 20 &&
      balance.fat > balance.acid
    ) {
      corrections.push(
        "Emulsion may be unstable; add mustard, egg yolk, or mayo to stabilize",
      );
    }

    if (balance.sweet > 15 && balance.acid < 3) {
      corrections.push("Add acid to balance sweetness");
    }

    if (balance.savory < 2 && balance.fat > 30) {
      corrections.push("Add umami (garlic, mustard, soy, Parmesan) for depth");
    }

    return corrections.length > 0
      ? corrections
      : ["Balance appears sound; no major corrections needed"];
  }
}
