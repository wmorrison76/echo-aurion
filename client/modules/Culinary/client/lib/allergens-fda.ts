/**
 * FDA Allergen Management
 * Compliance with Top 14 allergens (EU/FDA)
 * Cross-contamination tracking and prevention
 */

export type FDAAllergen =
  | 'Milk'
  | 'Eggs'
  | 'Peanuts'
  | 'Tree Nuts'
  | 'Fish'
  | 'Shellfish'
  | 'Crustaceans'
  | 'Soy'
  | 'Wheat'
  | 'Sesame'
  | 'Mollusks'
  | 'Mustard'
  | 'Lupin'
  | 'Celery'
  | 'Sulfites';

export interface FDARiskLevel {
  level: 'none' | 'low' | 'medium' | 'high';
  description: string;
  mitigation?: string;
}

export interface CrossContaminationRisk {
  allergen1: FDAAllergen;
  allergen2: FDAAllergen;
  riskLevel: FDARiskLevel;
  sharedEquipment: string[];
  cleaningProtocol?: string;
}

export interface SupplierAllergenCert {
  ingredientName: string;
  supplierId: string;
  certifiedFreeFrom: FDAAllergen[];
  certificationDate: Date;
  expiryDate: Date;
  documentUrl?: string;
}

export interface AllergenLabel {
  contains: FDAAllergen[];
  mayContain: FDAAllergen[];
  declaredOn: Date;
  region: 'US' | 'EU' | 'AU' | 'CA';
}

// FDA Top 14 Allergens
export const FDA_TOP_14_ALLERGENS: Record<FDAAllergen, {
  label: string;
  symbol: string;
  regulations: string[];
}> = {
  'Milk': {
    label: 'Milk (Dairy)',
    symbol: '🥛',
    regulations: ['FDA FALCPA', 'EU 1169/2011']
  },
  'Eggs': {
    label: 'Eggs',
    symbol: '🥚',
    regulations: ['FDA FALCPA', 'EU 1169/2011']
  },
  'Peanuts': {
    label: 'Peanuts',
    symbol: '🥜',
    regulations: ['FDA FALCPA', 'EU 1169/2011']
  },
  'Tree Nuts': {
    label: 'Tree Nuts (Almonds, Cashews, Walnuts, etc)',
    symbol: '🌰',
    regulations: ['FDA FALCPA', 'EU 1169/2011']
  },
  'Fish': {
    label: 'Fish (All species)',
    symbol: '🐟',
    regulations: ['FDA FALCPA', 'EU 1169/2011']
  },
  'Shellfish': {
    label: 'Shellfish (Crustaceans & Mollusks)',
    symbol: '🦐',
    regulations: ['FDA FALCPA', 'EU 1169/2011']
  },
  'Crustaceans': {
    label: 'Crustaceans (Crab, Lobster, Shrimp)',
    symbol: '🦀',
    regulations: ['FDA FALCPA', 'EU 1169/2011']
  },
  'Soy': {
    label: 'Soy',
    symbol: '🫘',
    regulations: ['FDA FALCPA', 'EU 1169/2011']
  },
  'Wheat': {
    label: 'Wheat (Gluten)',
    symbol: '🌾',
    regulations: ['FDA FALCPA', 'EU 1169/2011', 'GF Certification']
  },
  'Sesame': {
    label: 'Sesame',
    symbol: '🫒',
    regulations: ['FDA FALCPA', 'EU 1169/2011']
  },
  'Mollusks': {
    label: 'Mollusks (Clams, Mussels, Oysters)',
    symbol: '🦪',
    regulations: ['EU 1169/2011']
  },
  'Mustard': {
    label: 'Mustard',
    symbol: '💛',
    regulations: ['EU 1169/2011']
  },
  'Lupin': {
    label: 'Lupin',
    symbol: '🌺',
    regulations: ['EU 1169/2011']
  },
  'Celery': {
    label: 'Celery',
    symbol: '🥬',
    regulations: ['EU 1169/2011']
  },
  'Sulfites': {
    // Required ≥10 ppm declaration under FDA 21 CFR 101.100(a)(4) and
    // EU 1169/2011 Annex II. Common in wine, dried fruit, cured meats.
    label: 'Sulfites (≥10 ppm)',
    symbol: '🍷',
    regulations: ['FDA 21 CFR 101.100(a)(4)', 'EU 1169/2011']
  }
};

/**
 * Cross-contamination matrix for common kitchen scenarios
 */
export const CROSS_CONTAMINATION_MATRIX: Record<string, CrossContaminationRisk[]> = {
  'Peanuts-Tree Nuts': {
    allergen1: 'Peanuts',
    allergen2: 'Tree Nuts',
    riskLevel: { level: 'high', description: 'Often processed on same equipment' },
    sharedEquipment: ['roasting_pan', 'mixing_bowl', 'cutting_surface'],
    cleaningProtocol: 'Wash with hot soapy water, sanitize, air dry'
  },
  'Fish-Shellfish': {
    allergen1: 'Fish',
    allergen2: 'Shellfish',
    riskLevel: { level: 'high', description: 'Shared cutting boards and utensils' },
    sharedEquipment: ['cutting_board', 'knife', 'cooking_oil'],
    cleaningProtocol: 'Use separate cutting boards, dedicated knives'
  },
  'Milk-Eggs': {
    allergen1: 'Milk',
    allergen2: 'Eggs',
    riskLevel: { level: 'medium', description: 'Often mixed in baking' },
    sharedEquipment: ['mixing_bowl', 'whisks', 'baking_sheet'],
    cleaningProtocol: 'Wash thoroughly between uses'
  },
  'Wheat-Soy': {
    allergen1: 'Wheat',
    allergen2: 'Soy',
    riskLevel: { level: 'medium', description: 'Common ingredient crossover' },
    sharedEquipment: ['storage_containers', 'prep_table'],
    cleaningProtocol: 'Use separate storage, labeled clearly'
  }
};

/**
 * Generate FDA allergen declaration text
 */
export function generateAllergenDeclaration(
  allergens: FDAAllergen[],
  mayContain: FDAAllergen[] = [],
  region: 'US' | 'EU' = 'US'
): string {
  if (allergens.length === 0 && mayContain.length === 0) {
    return region === 'US' 
      ? 'Does not contain major allergens.' 
      : 'Contains no major allergens.';
  }

  let declaration = '';

  if (allergens.length > 0) {
    const allergenText = allergens.map(a => FDA_TOP_14_ALLERGENS[a]?.label || a).join(', ');
    if (region === 'US') {
      declaration += `Contains: ${allergenText}`;
    } else {
      declaration += `Contains: ${allergenText}`;
    }
  }

  if (mayContain.length > 0) {
    const mayContainText = mayContain.map(a => FDA_TOP_14_ALLERGENS[a]?.label || a).join(', ');
    if (declaration) {
      declaration += `. `;
    }
    if (region === 'US') {
      declaration += `May contain: ${mayContainText}`;
    } else {
      declaration += `May contain traces of: ${mayContainText}`;
    }
  }

  return declaration + '.';
}

/**
 * Check if two allergens have documented cross-contamination risk
 */
export function getCrossContaminationRisk(
  allergen1: FDAAllergen,
  allergen2: FDAAllergen
): CrossContaminationRisk | null {
  const key = [allergen1, allergen2].sort().join('-');
  return CROSS_CONTAMINATION_MATRIX[key] || null;
}

/**
 * Generate cross-contamination warning for recipe
 */
export function generateCrossContaminationWarning(
  allergens: FDAAllergen[]
): { warning: string; risks: CrossContaminationRisk[] } {
  const risks: CrossContaminationRisk[] = [];
  const seenPairs = new Set<string>();

  for (let i = 0; i < allergens.length; i++) {
    for (let j = i + 1; j < allergens.length; j++) {
      const risk = getCrossContaminationRisk(allergens[i], allergens[j]);
      if (risk) {
        const pairKey = [allergens[i], allergens[j]].sort().join('-');
        if (!seenPairs.has(pairKey)) {
          risks.push(risk);
          seenPairs.add(pairKey);
        }
      }
    }
  }

  let warning = '';
  if (risks.length > 0) {
    warning = `⚠️ Cross-contamination risk detected: ${risks.length} potential issue(s). `;
    warning += risks
      .map(r => `${r.allergen1} & ${r.allergen2} (${r.riskLevel.level})`)
      .join(', ');
    warning += '. Review preparation procedures.';
  }

  return { warning, risks };
}

/**
 * Validate supplier allergen certificates are current
 */
export function validateSupplierCerts(
  certs: SupplierAllergenCert[]
): { valid: SupplierAllergenCert[]; expired: SupplierAllergenCert[] } {
  const now = new Date();
  const valid: SupplierAllergenCert[] = [];
  const expired: SupplierAllergenCert[] = [];

  certs.forEach(cert => {
    if (cert.expiryDate > now) {
      valid.push(cert);
    } else {
      expired.push(cert);
    }
  });

  return { valid, expired };
}

/**
 * Check if all ingredients are supplier-certified as allergen-free
 */
export function areAllIngredientsCertified(
  ingredientNames: string[],
  supplierCerts: SupplierAllergenCert[]
): boolean {
  const { valid } = validateSupplierCerts(supplierCerts);
  const certifiedIngredients = new Set(valid.map(c => c.ingredientName.toLowerCase()));

  return ingredientNames.every(name =>
    certifiedIngredients.has(name.toLowerCase())
  );
}

/**
 * Generate FDA nutrition label format
 */
export interface NutritionFacts {
  servingSize: string;
  servingsPerContainer: number;
  calories: number;
  totalFat: number;
  saturatedFat: number;
  transFat: number;
  cholesterol: number;
  sodium: number;
  totalCarbs: number;
  dietaryFiber: number;
  sugars: number;
  protein: number;
  vitaminA?: number; // %DV
  vitaminC?: number; // %DV
  calcium?: number; // %DV
  iron?: number; // %DV
}

/**
 * Format nutrition label text (FDA compliant)
 */
export function formatFDANutritionLabel(nutrition: NutritionFacts): string {
  const fatCals = nutrition.totalFat * 9;
  const carbCals = nutrition.totalCarbs * 4;
  const proteinCals = nutrition.protein * 4;

  return `
NUTRITION FACTS
Serving Size: ${nutrition.servingSize}
Servings Per Container: ${nutrition.servingsPerContainer}

AMOUNT PER SERVING
Calories ${nutrition.calories}

% Daily Value*
Total Fat ${nutrition.totalFat}g ${getPercentDV('fat', nutrition.totalFat)}%
  Saturated Fat ${nutrition.saturatedFat}g ${getPercentDV('saturatedFat', nutrition.saturatedFat)}%
  Trans Fat ${nutrition.transFat}g
Cholesterol ${nutrition.cholesterol}mg ${getPercentDV('cholesterol', nutrition.cholesterol)}%
Sodium ${nutrition.sodium}mg ${getPercentDV('sodium', nutrition.sodium)}%
Total Carbohydrate ${nutrition.totalCarbs}g ${getPercentDV('carbs', nutrition.totalCarbs)}%
  Dietary Fiber ${nutrition.dietaryFiber}g ${getPercentDV('fiber', nutrition.dietaryFiber)}%
  Sugars ${nutrition.sugars}g
Protein ${nutrition.protein}g ${getPercentDV('protein', nutrition.protein)}%

Vitamin A ${nutrition.vitaminA || 0}% • Vitamin C ${nutrition.vitaminC || 0}%
Calcium ${nutrition.calcium || 0}% • Iron ${nutrition.iron || 0}%

* Percent Daily Values are based on a 2,000 calorie diet.
  `.trim();
}

/**
 * Calculate FDA %DV (Daily Value)
 */
function getPercentDV(nutrient: string, value: number): number {
  const dailyValues: Record<string, number> = {
    fat: 78,
    saturatedFat: 20,
    transFat: 0,
    cholesterol: 300,
    sodium: 2300,
    totalFiber: 28,
    fiber: 28,
    carbs: 275,
    protein: 50,
    vitaminA: 900,
    vitaminC: 90,
    calcium: 1300,
    iron: 18
  };

  const dv = dailyValues[nutrient];
  if (!dv) return 0;

  return Math.round((value / dv) * 100);
}
