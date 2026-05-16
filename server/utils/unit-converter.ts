/**
 * Unit Conversion Utility
 * 
 * Handles conversion between different measurement units for ingredients
 * Supports mass (weight), volume, and count units
 */

export interface UnitConversion {
  from: string;
  to: string;
  factor: number; // Multiply from unit by factor to get to unit
}

// Mass conversions (to grams as base)
const MASS_TO_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
};

// Volume conversions (to milliliters as base)
const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
  tsp: 4.92892,
  teaspoon: 4.92892,
  teaspoons: 4.92892,
  tbsp: 14.7868,
  tablespoon: 14.7868,
  tablespoons: 14.7868,
  cup: 236.588,
  cups: 236.588,
  pt: 473.176,
  pint: 473.176,
  pints: 473.176,
  qt: 946.353,
  quart: 946.353,
  quarts: 946.353,
  gal: 3785.41,
  gallon: 3785.41,
  gallons: 3785.41,
  fl_oz: 29.5735,
  fluid_ounce: 29.5735,
  fluid_ounces: 29.5735,
};

// Count units (no conversion, just aggregation)
const COUNT_UNITS = new Set([
  'each',
  'piece',
  'pieces',
  'item',
  'items',
  'unit',
  'units',
  'case',
  'cases',
  'pack',
  'packs',
  'tray',
  'trays',
  'bunch',
  'bunches',
  'head',
  'heads',
  'clove',
  'cloves',
]);

/**
 * Normalize unit name (lowercase, remove spaces, handle plurals)
 */
function normalizeUnit(unit: string): string {
  if (!unit) return 'each';
  return unit.toLowerCase().trim().replace(/\s+/g, '_').replace(/s$/, '');
}

/**
 * Check if units are compatible (same category)
 */
export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  const norm1 = normalizeUnit(unit1);
  const norm2 = normalizeUnit(unit2);

  // Same unit
  if (norm1 === norm2) return true;

  // Both are mass units
  if (MASS_TO_GRAMS[norm1] && MASS_TO_GRAMS[norm2]) return true;

  // Both are volume units
  if (VOLUME_TO_ML[norm1] && VOLUME_TO_ML[norm2]) return true;

  // Both are count units
  if (COUNT_UNITS.has(norm1) && COUNT_UNITS.has(norm2)) return true;

  return false;
}

/**
 * Convert quantity from one unit to another
 */
export function convertUnit(quantity: number, fromUnit: string, toUnit: string): number {
  if (quantity === 0) return 0;
  if (fromUnit === toUnit) return quantity;

  const normFrom = normalizeUnit(fromUnit);
  const normTo = normalizeUnit(toUnit);

  // Same unit (after normalization)
  if (normFrom === normTo) return quantity;

  // Mass conversion
  const fromMass = MASS_TO_GRAMS[normFrom];
  const toMass = MASS_TO_GRAMS[normTo];
  if (fromMass && toMass) {
    return (quantity * fromMass) / toMass;
  }

  // Volume conversion
  const fromVol = VOLUME_TO_ML[normFrom];
  const toVol = VOLUME_TO_ML[normTo];
  if (fromVol && toVol) {
    return (quantity * fromVol) / toVol;
  }

  // Count units - no conversion possible if different
  if (COUNT_UNITS.has(normFrom) && COUNT_UNITS.has(normTo)) {
    // Try to convert between count units (e.g., case to each)
    // For now, return as-is (would need pack size info)
    return quantity;
  }

  // Incompatible units - throw error
  throw new Error(`Cannot convert from ${fromUnit} to ${toUnit} - incompatible unit types`);
}

/**
 * Normalize unit to standard form
 */
export function normalizeToStandardUnit(unit: string): string {
  const norm = normalizeUnit(unit);

  // Return standard form
  if (MASS_TO_GRAMS[norm]) {
    // Use grams for small quantities, kg for large
    return 'g';
  }
  if (VOLUME_TO_ML[norm]) {
    // Use ml for small quantities, l for large
    return 'ml';
  }
  if (COUNT_UNITS.has(norm)) {
    return 'each';
  }

  return unit; // Return original if unknown
}

/**
 * Get preferred unit for a quantity (automatically choose between g/kg, ml/l, etc.)
 */
export function getPreferredUnit(quantity: number, unit: string): string {
  const norm = normalizeUnit(unit);

  // Mass: use kg for quantities >= 1000g
  if (MASS_TO_GRAMS[norm]) {
    const grams = quantity * (MASS_TO_GRAMS[norm] || 1);
    return grams >= 1000 ? 'kg' : 'g';
  }

  // Volume: use l for quantities >= 1000ml
  if (VOLUME_TO_ML[norm]) {
    const ml = quantity * (VOLUME_TO_ML[norm] || 1);
    return ml >= 1000 ? 'l' : 'ml';
  }

  // Count: use original unit
  return unit;
}

/**
 * Try to convert and add quantities, handling unit conversion
 */
export function addQuantities(
  qty1: number,
  unit1: string,
  qty2: number,
  unit2: string
): { quantity: number; unit: string } {
  // If units are the same, just add
  if (unit1 === unit2 || normalizeUnit(unit1) === normalizeUnit(unit2)) {
    return { quantity: qty1 + qty2, unit: unit1 };
  }

  // Check if units are compatible
  if (!areUnitsCompatible(unit1, unit2)) {
    // Incompatible units - use first unit and log warning
    // In production, might want to throw or handle differently
    return { quantity: qty1 + qty2, unit: unit1 };
  }

  try {
    // Convert qty2 to unit1
    const convertedQty2 = convertUnit(qty2, unit2, unit1);
    const total = qty1 + convertedQty2;
    const preferredUnit = getPreferredUnit(total, unit1);

    // Convert total to preferred unit if different
    if (preferredUnit !== unit1) {
      const preferredQty = convertUnit(total, unit1, preferredUnit);
      return { quantity: preferredQty, unit: preferredUnit };
    }

    return { quantity: total, unit: unit1 };
  } catch (error) {
    // Conversion failed - use first unit
    return { quantity: qty1 + qty2, unit: unit1 };
  }
}
