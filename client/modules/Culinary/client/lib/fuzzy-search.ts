/**
 * Fuzzy Search Utility
 * Handles searching for terms with typos, alternate spellings, and language variants
 */

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching with typos
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score between 0-1
 * 1 = perfect match, 0 = completely different
 */
export function calculateSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}

/**
 * Common culinary term variants and alternate spellings
 */
const CULINARY_VARIANTS: Record<string, string[]> = {
  // French variants
  'brunoise': ['brunoise', 'brunoise', 'brunoise'],
  'julienne': ['julienne', 'juliene', 'julienne'],
  'beurre-blanc': ['beurre-blanc', 'beurre blanc', 'butter-white'],
  'béchamel': ['bechamel', 'béchamel', 'bechemel'],
  'béarnaise': ['bearnaise', 'béarnaise', 'bearnaise'],
  'fond': ['fond', 'fonds', 'fond'],
  'sauté': ['saute', 'sauté', 'sautee'],
  'mise-en-place': ['mise-en-place', 'mise en place', 'mise'],
  'mirepoix': ['mirepoix', 'mirpoix', 'mirepoix'],
  'roux': ['roux', 'rue', 'roo'],
  'béchamel': ['bechamel', 'behamel'],
  'chiffonade': ['chiffonade', 'chiffanade'],
  'demi-glace': ['demi-glace', 'demi glace', 'demiglace'],
  'hollandaise': ['hollandaise', 'hollandaise', 'hollondaise'],
  
  // Asian variants
  'umami': ['umami', 'umamee', 'umame'],
  'dashi': ['dashi', 'dashee', 'dasha'],
  'miso': ['miso', 'miso paste'],
  'wasabi': ['wasabi', 'wasabe', 'wasabee'],
  'tempura': ['tempura', 'tenpura', 'tempurah'],
  'panko': ['panko', 'panko breadcrumb', 'panco'],
  
  // Pastry variants
  'croissant': ['croissant', 'crescent', 'croissantt'],
  'pâte-brisée': ['pate-brisee', 'pâte-brisée', 'pate brisee'],
  'pâte-sucrée': ['pate-sucree', 'pâte-sucrée', 'pate sucree'],
  'choux': ['choux', 'choo', 'chu'],
  'ganache': ['ganache', 'ganash', 'ganache'],
  
  // General cooking
  'braise': ['braise', 'braize', 'braze'],
  'roast': ['roast', 'roste'],
  'poach': ['poach', 'poched'],
  'simmer': ['simmer', 'simmor', 'simer'],
  'boil': ['boil', 'biol'],
  'blanch': ['blanch', 'blanche', 'blanch'],
};

/**
 * Fuzzy search for a term in a list of candidates
 * Returns the best match if similarity > threshold
 */
export function fuzzySearchTerms(
  searchTerm: string,
  candidateTerms: string[],
  threshold: number = 0.75
): { term: string; score: number } | null {
  const normalized = searchTerm.toLowerCase().trim();

  // Check variants first
  for (const [primary, variants] of Object.entries(CULINARY_VARIANTS)) {
    if (variants.map(v => v.toLowerCase()).includes(normalized)) {
      return {
        term: primary,
        score: 1.0,
      };
    }
  }

  // Then do fuzzy matching
  let bestMatch: { term: string; score: number } | null = null;
  let bestScore = threshold;

  for (const candidate of candidateTerms) {
    const similarity = calculateSimilarity(normalized, candidate.toLowerCase());

    if (similarity > bestScore) {
      bestScore = similarity;
      bestMatch = {
        term: candidate,
        score: similarity,
      };
    }
  }

  return bestMatch;
}

/**
 * Fuzzy search with multiple candidate suggestions
 * Returns top N matches sorted by score
 */
export function fuzzySearchMultiple(
  searchTerm: string,
  candidateTerms: string[],
  limit: number = 5,
  threshold: number = 0.7
): Array<{ term: string; score: number }> {
  const normalized = searchTerm.toLowerCase().trim();
  const results: Array<{ term: string; score: number }> = [];

  // Check variants first
  for (const [primary, variants] of Object.entries(CULINARY_VARIANTS)) {
    if (variants.map(v => v.toLowerCase()).includes(normalized)) {
      results.push({
        term: primary,
        score: 1.0,
      });
    }
  }

  // Then do fuzzy matching on candidates
  for (const candidate of candidateTerms) {
    const similarity = calculateSimilarity(normalized, candidate.toLowerCase());

    if (similarity >= threshold) {
      results.push({
        term: candidate,
        score: similarity,
      });
    }
  }

  // Sort by score descending and return top results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Add a new variant for a term
 * Useful for building up language variants over time
 */
export function addTermVariant(primary: string, variant: string): void {
  if (!CULINARY_VARIANTS[primary]) {
    CULINARY_VARIANTS[primary] = [];
  }
  if (!CULINARY_VARIANTS[primary].includes(variant)) {
    CULINARY_VARIANTS[primary].push(variant);
  }
}

/**
 * Get all known variants for a term
 */
export function getTermVariants(term: string): string[] {
  const normalized = term.toLowerCase();
  
  // Check if this is already a primary term
  if (CULINARY_VARIANTS[normalized]) {
    return CULINARY_VARIANTS[normalized];
  }

  // Check if this is a variant of another term
  for (const [primary, variants] of Object.entries(CULINARY_VARIANTS)) {
    if (variants.map(v => v.toLowerCase()).includes(normalized)) {
      return [primary, ...variants];
    }
  }

  return [term];
}
