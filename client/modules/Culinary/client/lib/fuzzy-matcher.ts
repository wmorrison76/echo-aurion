/**
 * Unified fuzzy matching for ingredients
 * Handles partial word matches, stemming, and common variations
 */

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns 0-1 where 1 is perfect match
 */
export function levenshteinSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;

  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLen;
}

/**
 * Tokenize a string into words, handling common punctuation and prepositions
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[,;:()]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0 && !["and", "or", "the", "a", "an"].includes(token));
}

/**
 * Remove common singular/plural variations
 */
function normalizeWord(word: string): string {
  // Remove trailing 's' for plurals
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("s") && word.length > 2 && !["glass", "less", "grass", "mass", "pass"].includes(word)) {
    return word.slice(0, -1);
  }
  return word;
}

/**
 * Calculate token-based similarity
 * Handles partial word matches and word order variations
 */
export function tokenSimilarity(query: string, target: string): number {
  const queryTokens = tokenize(query).map(normalizeWord);
  const targetTokens = tokenize(target).map(normalizeWord);

  if (queryTokens.length === 0 || targetTokens.length === 0) {
    return levenshteinSimilarity(query, target);
  }

  // Count how many query tokens match target tokens
  let matches = 0;
  for (const qToken of queryTokens) {
    for (const tToken of targetTokens) {
      // Exact match or similarity > 0.8
      if (qToken === tToken || levenshteinSimilarity(qToken, tToken) > 0.8) {
        matches++;
        break;
      }
    }
  }

  // Score based on matched tokens
  const tokenScore = matches / Math.max(queryTokens.length, targetTokens.length);

  // Also include character-level similarity for refinement
  const charScore = levenshteinSimilarity(query, target);

  // Weight token score more heavily (80%) since it's more important for ingredient matching
  return tokenScore * 0.8 + charScore * 0.2;
}

/**
 * Advanced fuzzy matching for ingredient names
 * Returns score 0-1 where 1 is perfect match
 */
export function ingredientSimilarity(query: string, target: string): number {
  if (!query.trim() || !target.trim()) return 0;

  const qNorm = query.toLowerCase().trim();
  const tNorm = target.toLowerCase().trim();

  // Exact match
  if (qNorm === tNorm) return 1;

  // Check if query is contained in target or vice versa (important for partial matches)
  if (tNorm.includes(qNorm) || qNorm.includes(tNorm)) {
    // Weighted by what percentage of the longer string is contained
    const longerLen = Math.max(qNorm.length, tNorm.length);
    const shorterLen = Math.min(qNorm.length, tNorm.length);
    return 0.85 + (shorterLen / longerLen) * 0.15; // Range: 0.85-1.0
  }

  // Try token-based matching (handles word variations and order)
  const tokenScore = tokenSimilarity(query, target);

  // Return the token score, which should be more robust for ingredient names
  return tokenScore;
}

/**
 * Fuzzy search results
 */
export interface FuzzySearchResult<T> {
  item: T;
  score: number;
  matchType: "exact" | "contains" | "token" | "levenshtein";
}

/**
 * Fuzzy search in a list of items
 * @param query - Search query
 * @param items - Items to search through
 * @param getSearchText - Function to extract searchable text from item
 * @param minScore - Minimum score threshold (0-1)
 * @returns Sorted results by score (highest first)
 */
export function fuzzySearch<T>(
  query: string,
  items: T[],
  getSearchText: (item: T) => string,
  minScore: number = 0.6,
): FuzzySearchResult<T>[] {
  if (!query.trim()) return [];

  const normalizedQuery = query.toLowerCase().trim();
  const results: FuzzySearchResult<T>[] = [];

  for (const item of items) {
    const text = getSearchText(item);
    if (!text) continue;

    const normalizedText = text.toLowerCase();

    // Determine match type and calculate score
    let score: number;
    let matchType: "exact" | "contains" | "token" | "levenshtein";

    if (normalizedQuery === normalizedText) {
      score = 1;
      matchType = "exact";
    } else if (normalizedText.includes(normalizedQuery) || normalizedQuery.includes(normalizedText)) {
      // Containment match - calculate percentage
      const longerLen = Math.max(normalizedQuery.length, normalizedText.length);
      const shorterLen = Math.min(normalizedQuery.length, normalizedText.length);
      score = 0.85 + (shorterLen / longerLen) * 0.15;
      matchType = "contains";
    } else {
      // Token-based matching for word variations
      score = tokenSimilarity(query, text);
      matchType = score > 0.7 ? "token" : "levenshtein";
    }

    if (score >= minScore) {
      results.push({ item, score, matchType });
    }
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}
