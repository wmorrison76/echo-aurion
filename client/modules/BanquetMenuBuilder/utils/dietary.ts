/**
 * Dietary Utilities
 *
 * Helpers for working with dietary profiles:
 * - Deriving display tags from granular allergen data
 * - Aggregating allergens across multiple items
 * - Checking diet compatibility
 * - Building default/empty profiles
 *
 * The display tags (D/G/N/S/VE/VG) are a lossy projection of the
 * underlying allergen reality. These utilities convert between them
 * deterministically.
 */

import type {
  DietaryProfile,
  DietaryTag,
  Allergen,
} from '../BanquetMenuBuilder.types';

/**
 * Derive display tags from a granular dietary profile.
 * This ensures the display tags are always in sync with the underlying
 * allergen data — never manually set the tags, always derive them.
 */
export function deriveDisplayTags(profile: DietaryProfile): DietaryTag[] {
  const tags: DietaryTag[] = [];

  if (profile.allergens.milk) tags.push('D');
  if (profile.allergens.wheat) tags.push('G');
  if (profile.allergens.treeNuts.contains || profile.allergens.peanuts) tags.push('N');
  if (profile.allergens.shellfish.contains) tags.push('S');

  if (profile.dietCompatibility.vegan) tags.push('VE');
  else if (profile.dietCompatibility.vegetarian) tags.push('VG');

  return tags;
}

/**
 * Build a fresh dietary profile with all allergens marked as not-present.
 * Use as a starting point when constructing items — only flip the flags
 * that actually apply.
 */
export function emptyDietaryProfile(): DietaryProfile {
  return {
    tags: [],
    allergens: {
      milk: false,
      eggs: false,
      fish: { contains: false },
      shellfish: { contains: false },
      treeNuts: { contains: false },
      peanuts: false,
      wheat: false,
      soy: false,
      sesame: false,
      sulfites: false,
      crossContaminationRisk: false,
    },
    certifications: {
      kosher: 'none',
      halal: false,
      organic: false,
      nonGMO: false,
    },
    dietCompatibility: {
      vegan: false,
      vegetarian: false,
      pescatarian: false,
      glutenFree: false,
      dairyFree: false,
      keto: false,
      paleo: false,
      lowFodmap: false,
    },
  };
}

/**
 * Build a dietary profile with display tags + reasonable defaults.
 * Use this when you have the menu's tag string (like "D/G/N/VG") and
 * want to construct a profile from it.
 */
export function profileFromTags(tags: DietaryTag[]): DietaryProfile {
  const profile = emptyDietaryProfile();

  if (tags.includes('D')) profile.allergens.milk = true;
  if (tags.includes('G')) profile.allergens.wheat = true;
  if (tags.includes('N')) profile.allergens.treeNuts.contains = true;
  if (tags.includes('S')) profile.allergens.shellfish.contains = true;

  if (tags.includes('VE')) {
    profile.dietCompatibility.vegan = true;
    profile.dietCompatibility.vegetarian = true;
    profile.dietCompatibility.pescatarian = true;
    profile.dietCompatibility.dairyFree = true;
  } else if (tags.includes('VG')) {
    profile.dietCompatibility.vegetarian = true;
    profile.dietCompatibility.pescatarian = true;
  }

  // Auto-derive gluten-free
  if (!profile.allergens.wheat) {
    profile.dietCompatibility.glutenFree = true;
  }
  // Auto-derive dairy-free
  if (!profile.allergens.milk) {
    profile.dietCompatibility.dairyFree = true;
  }

  // Sync display tags
  profile.tags = deriveDisplayTags(profile);
  return profile;
}

/**
 * Aggregate allergens across a set of dietary profiles.
 * Returns a count of how many items contain each allergen.
 * Used for menu-level concentration warnings.
 */
export function aggregateAllergens(
  profiles: DietaryProfile[]
): Record<Allergen, { count: number; pct: number }> {
  const total = profiles.length;
  if (total === 0) {
    return {} as Record<Allergen, { count: number; pct: number }>;
  }

  const counts: Record<string, number> = {
    milk: 0,
    eggs: 0,
    fish: 0,
    shellfish: 0,
    treeNuts: 0,
    peanuts: 0,
    wheat: 0,
    soy: 0,
    sesame: 0,
    sulfites: 0,
  };

  profiles.forEach((p) => {
    if (p.allergens.milk) counts.milk++;
    if (p.allergens.eggs) counts.eggs++;
    if (p.allergens.fish.contains) counts.fish++;
    if (p.allergens.shellfish.contains) counts.shellfish++;
    if (p.allergens.treeNuts.contains) counts.treeNuts++;
    if (p.allergens.peanuts) counts.peanuts++;
    if (p.allergens.wheat) counts.wheat++;
    if (p.allergens.soy) counts.soy++;
    if (p.allergens.sesame) counts.sesame++;
    if (p.allergens.sulfites) counts.sulfites++;
  });

  const result = {} as Record<Allergen, { count: number; pct: number }>;
  Object.entries(counts).forEach(([allergen, count]) => {
    result[allergen as Allergen] = {
      count,
      pct: Math.round((count / total) * 100),
    };
  });
  return result;
}

/**
 * Check whether a profile is compatible with a specific diet.
 * Returns true if the item can be served to someone on that diet.
 */
export function isCompatibleWith(
  profile: DietaryProfile,
  diet: keyof DietaryProfile['dietCompatibility']
): boolean {
  return profile.dietCompatibility[diet] === true;
}

/**
 * Aggregate diet compatibility across a menu's items.
 * Returns the count of items compatible with each diet.
 */
export function aggregateDietCompatibility(
  profiles: DietaryProfile[]
): Record<keyof DietaryProfile['dietCompatibility'], number> {
  const result = {
    vegan: 0,
    vegetarian: 0,
    pescatarian: 0,
    glutenFree: 0,
    dairyFree: 0,
    keto: 0,
    paleo: 0,
    lowFodmap: 0,
  };

  profiles.forEach((p) => {
    Object.keys(result).forEach((diet) => {
      const key = diet as keyof typeof result;
      if (p.dietCompatibility[key]) result[key]++;
    });
  });

  return result;
}

/**
 * Check whether a menu has at least one item compatible with each
 * required diet. Returns the diets that are NOT covered.
 */
export function findUncoveredDiets(
  profiles: DietaryProfile[],
  requiredDiets: (keyof DietaryProfile['dietCompatibility'])[]
): (keyof DietaryProfile['dietCompatibility'])[] {
  const uncovered: (keyof DietaryProfile['dietCompatibility'])[] = [];
  requiredDiets.forEach((diet) => {
    const hasMatch = profiles.some((p) => p.dietCompatibility[diet]);
    if (!hasMatch) uncovered.push(diet);
  });
  return uncovered;
}

/**
 * Identify allergens that exceed a concentration threshold.
 * Default threshold: 40% of items contain the allergen.
 * Returns warnings worth surfacing in critique mode.
 */
export function findHighConcentrationAllergens(
  profiles: DietaryProfile[],
  thresholdPct = 40
): { allergen: Allergen; count: number; pct: number }[] {
  const aggregated = aggregateAllergens(profiles);
  const warnings: { allergen: Allergen; count: number; pct: number }[] = [];

  Object.entries(aggregated).forEach(([allergen, data]) => {
    if (data.pct >= thresholdPct) {
      warnings.push({
        allergen: allergen as Allergen,
        count: data.count,
        pct: data.pct,
      });
    }
  });

  return warnings.sort((a, b) => b.pct - a.pct);
}
