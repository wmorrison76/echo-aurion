/**
 * Ingredient Chemistry Schema
 * Defines how ingredients contribute to flavor, texture, and emulsion stability
 * Used by FlavorMatrix for balance calculations and Echo reasoning
 */

export interface ChemicalComponent {
  name: string;
  percentage?: number; // % of ingredient mass
  intensity?: number; // 0–1 perceived impact (0=undetectable, 1=dominant)
  notes?: string; // aromatic descriptors (citrusy, green, floral, etc.)
}

export interface IngredientChemistryProfile {
  ingredientId: string; // cross-ref to IngredientCodexEntry.id
  name: string; // human readable: "white vinegar", "extra virgin olive oil"

  // Acidity & pH
  acidity?: number; // pH scale (0–14)
  acidPercentage?: number; // e.g., vinegar 4–8%, lemon juice 5–6%, cream 0%

  // Macronutrient Composition
  fatPercentage?: number; // oils 100%, butter 80%, egg yolk 30%, cream 35%
  sugarPercentage?: number; // honey 80%, fruit varies, vinegar ~0%
  proteinPercentage?: number; // egg 12%, yogurt 3%, mustard 1%
  waterActivity?: number; // aw level (0–1); lower = more shelf-stable

  // Volatile Aromatics & Flavor Compounds
  volatiles: ChemicalComponent[];

  // Emulsification Properties
  emulsifiers?: boolean; // true if contains lecithin, egg, mustard
  emulsionStrength?: number; // how well stabilizes emulsions (0–1)

  // Texture-Modifying Properties
  thickeningPower?: number; // starches/gums/purées (0–1)
  saltinessFactor?: number; // relative salt perception (0–1)

  // Browning / Color Development
  maillardPotential?: number; // how readily browns (0–1)
  caramelizationPotential?: number; // sugar browning (0–1)

  // Flavor Characteristics
  basicTastes?: {
    sweet?: number; // 0–1
    salty?: number;
    sour?: number;
    bitter?: number;
    umami?: number;
  };

  // Interaction Notes
  notes?: string; // special properties, warnings, pairings
}

/**
 * Predefined Chemistry Profiles for Common Ingredients
 * Used as defaults; can be overridden per recipe
 */
export const INGREDIENT_CHEMISTRY_DATABASE: Record<
  string,
  IngredientChemistryProfile
> = {
  "white-vinegar": {
    ingredientId: "white-vinegar",
    name: "White Vinegar",
    acidity: 2.4,
    acidPercentage: 5,
    fatPercentage: 0,
    sugarPercentage: 0,
    waterActivity: 0.95,
    volatiles: [
      { name: "acetic acid", intensity: 0.9, notes: "sharp, pungent" },
      {
        name: "sulfur compounds",
        intensity: 0.3,
        notes: "slight vinegar notes",
      },
    ],
    emulsifiers: false,
    thickeningPower: 0,
    saltinessFactor: 0,
    basicTastes: { sour: 0.95, sweet: 0.05 },
    notes: "Standard culinary acid; works in vinaigrettes, marinades",
  },

  "olive-oil": {
    ingredientId: "olive-oil",
    name: "Extra Virgin Olive Oil",
    acidity: undefined,
    acidPercentage: 0,
    fatPercentage: 100,
    sugarPercentage: 0,
    waterActivity: 0.0,
    volatiles: [
      { name: "oleic acid", intensity: 0.7, notes: "smooth, fruity" },
      { name: "polyphenols", intensity: 0.4, notes: "peppery finish" },
      { name: "limonene", intensity: 0.2, notes: "citrus notes" },
    ],
    emulsifiers: false,
    emulsionStrength: 0.3,
    thickeningPower: 0,
    saltinessFactor: 0,
    basicTastes: { sweet: 0.3, bitter: 0.2 },
    notes: "High quality = more aromatic; cold-pressed best for raw use",
  },

  "dijon-mustard": {
    ingredientId: "dijon-mustard",
    name: "Dijon Mustard",
    acidity: 3.5,
    acidPercentage: 1.5,
    fatPercentage: 3,
    sugarPercentage: 2,
    waterActivity: 0.85,
    volatiles: [
      { name: "isothiocyanates", intensity: 0.8, notes: "sharp, pungent" },
      { name: "sulfur", intensity: 0.5, notes: "savory" },
    ],
    emulsifiers: true,
    emulsionStrength: 0.7,
    thickeningPower: 0.3,
    saltinessFactor: 0.4,
    basicTastes: { salty: 0.3, sour: 0.4, bitter: 0.2, umami: 0.1 },
    notes: "Excellent emulsifier; salt and vinegar content add seasoning",
  },

  honey: {
    ingredientId: "honey",
    name: "Raw Honey",
    acidity: 3.9,
    acidPercentage: 0.1,
    fatPercentage: 0,
    sugarPercentage: 80,
    waterActivity: 0.55,
    volatiles: [
      { name: "floral esters", intensity: 0.6, notes: "floral, sweet" },
      { name: "furfural", intensity: 0.2, notes: "caramel notes" },
    ],
    emulsifiers: false,
    thickeningPower: 0.4,
    saltinessFactor: 0,
    maillardPotential: 0.7,
    caramelizationPotential: 0.8,
    basicTastes: { sweet: 1.0, umami: 0.1 },
    notes: "Rounds acidity; adds body; browns at high temps",
  },

  "lemon-juice": {
    ingredientId: "lemon-juice",
    name: "Fresh Lemon Juice",
    acidity: 2.0,
    acidPercentage: 5.5,
    fatPercentage: 0,
    sugarPercentage: 2.5,
    waterActivity: 0.94,
    volatiles: [
      { name: "limonene", intensity: 0.9, notes: "citrus, fresh" },
      { name: "citral", intensity: 0.8, notes: "bright, lemony" },
    ],
    emulsifiers: false,
    thickeningPower: 0,
    saltinessFactor: 0,
    basicTastes: { sour: 0.95, sweet: 0.1 },
    notes: "Brighter, fresher acid than vinegar; adds aromatic lift",
  },

  "egg-yolk": {
    ingredientId: "egg-yolk",
    name: "Egg Yolk",
    acidity: undefined,
    acidPercentage: 0,
    fatPercentage: 30,
    sugarPercentage: 0,
    proteinPercentage: 16,
    waterActivity: 0.75,
    volatiles: [
      { name: "sulfur compounds", intensity: 0.3, notes: "subtle, eggy" },
    ],
    emulsifiers: true,
    emulsionStrength: 1.0,
    thickeningPower: 0.5,
    saltinessFactor: 0,
    basicTastes: { umami: 0.2, sweet: 0.1 },
    notes: "Premier emulsifier; ~3g per 250ml oil max for mayo",
  },

  butter: {
    ingredientId: "butter",
    name: "Unsalted Butter",
    acidity: undefined,
    acidPercentage: 0,
    fatPercentage: 80,
    sugarPercentage: 0,
    waterActivity: 0.15,
    volatiles: [
      { name: "butyric acid", intensity: 0.3, notes: "buttery, creamy" },
      { name: "diacetyl", intensity: 0.2, notes: "creamy, slightly sweet" },
    ],
    emulsifiers: true,
    emulsionStrength: 0.6,
    thickeningPower: 0.2,
    saltinessFactor: 0,
    basicTastes: { sweet: 0.2, umami: 0.1 },
    notes: "Lower melting point than oil; separates if overheated in emulsions",
  },

  garlic: {
    ingredientId: "garlic",
    name: "Fresh Garlic",
    acidity: undefined,
    acidPercentage: 0,
    fatPercentage: 0.5,
    sugarPercentage: 1,
    proteinPercentage: 2,
    waterActivity: 0.75,
    volatiles: [
      { name: "allicin", intensity: 0.95, notes: "pungent, sulfurous" },
      { name: "diallyl disulfide", intensity: 0.7, notes: "savory, meaty" },
    ],
    emulsifiers: false,
    thickeningPower: 0.1,
    saltinessFactor: 0.1,
    basicTastes: { umami: 0.3, salty: 0.1 },
    notes: "Raw = sharp; cooked = sweet; develops sweetness with long cooking",
  },

  shallot: {
    ingredientId: "shallot",
    name: "Shallot",
    acidity: 6.5,
    acidPercentage: 0,
    fatPercentage: 0.1,
    sugarPercentage: 7,
    proteinPercentage: 1.5,
    waterActivity: 0.88,
    volatiles: [
      { name: "sulfur compounds", intensity: 0.6, notes: "onion-like, milder" },
      { name: "sugars", intensity: 0.5, notes: "subtle sweetness" },
    ],
    emulsifiers: false,
    thickeningPower: 0.05,
    saltinessFactor: 0,
    basicTastes: { sweet: 0.4, umami: 0.2 },
    notes: "Milder than garlic; adds sweetness when cooked",
  },

  mayonnaise: {
    ingredientId: "mayonnaise",
    name: "Mayonnaise (Store-bought)",
    acidity: 3.8,
    acidPercentage: 0.5,
    fatPercentage: 70,
    sugarPercentage: 0.5,
    waterActivity: 0.5,
    volatiles: [
      { name: "emulsion matrix", intensity: 0.5, notes: "creamy, rich" },
    ],
    emulsifiers: true,
    emulsionStrength: 0.95,
    thickeningPower: 0.8,
    saltinessFactor: 0.3,
    basicTastes: { salty: 0.2, umami: 0.1 },
    notes:
      "Pre-made emulsion; add carefully to other emulsions to avoid breaking",
  },
};

/**
 * Helper: Get default profile for an ingredient
 */
export function getIngredientChemistry(
  ingredientId: string,
): IngredientChemistryProfile | undefined {
  return INGREDIENT_CHEMISTRY_DATABASE[ingredientId];
}

/**
 * Helper: List all defined ingredients
 */
export function listAvailableIngredients(): string[] {
  return Object.keys(INGREDIENT_CHEMISTRY_DATABASE);
}
