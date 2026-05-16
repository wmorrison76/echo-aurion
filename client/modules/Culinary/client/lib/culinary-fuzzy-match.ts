export interface FuzzyMatch {
  term: string;
  confidence: number;
  type: 'ingredient' | 'technique' | 'term' | 'definition';
  definition?: string;
  aliases?: string[];
}

// Comprehensive culinary dictionary
const CULINARY_DICTIONARY = {
  ingredients: [
    'Jumbo lump crab', 'crab', 'king crab', 'blue crab', 'snow crab',
    'Chives', 'scallions', 'green onions',
    'Egg', 'eggs', 'egg white', 'egg yolk',
    'Mayo', 'mayonnaise', 'hellmans',
    'Mustard', 'dijon mustard', 'whole grain mustard',
    'Butter', 'unsalted butter', 'clarified butter',
    'Cream', 'heavy cream', 'sour cream', 'crème fraîche',
    'Milk', 'whole milk', 'skim milk', 'buttermilk',
    'Flour', 'all-purpose flour', 'cake flour', 'bread flour',
    'Sugar', 'brown sugar', 'powdered sugar', 'caster sugar',
    'Salt', 'sea salt', 'kosher salt', 'fleur de sel',
    'Pepper', 'black pepper', 'white pepper', 'pink peppercorn',
    'Garlic', 'minced garlic', 'garlic clove',
    'Onion', 'yellow onion', 'white onion', 'red onion',
    'Tomato', 'cherry tomato', 'roma tomato', 'beefsteak tomato',
    'Basil', 'thai basil', 'holy basil', 'lemon basil',
    'Thyme', 'french thyme', 'lemon thyme',
    'Rosemary', 'dried rosemary',
    'Oregano', 'dried oregano',
    'Olive oil', 'extra virgin olive oil', 'light olive oil',
    'Vinegar', 'balsamic vinegar', 'white wine vinegar', 'rice vinegar',
  ],
  techniques: [
    'Diced', 'minced', 'chopped', 'sliced', 'julienned', 'brunoise',
    'Blanched', 'boiled', 'steamed', 'poached', 'simmered',
    'Grilled', 'roasted', 'baked', 'fried', 'sautéed', 'pan-fried',
    'Whipped', 'folded', 'stirred', 'whisked', 'beaten',
    'Marinated', 'pickled', 'cured', 'smoked',
    'Pureed', 'blended', 'liquefied',
    'Caramelized', 'reduced', 'emulsified',
    'Chiffonade', 'brunoise', 'paysanne', 'batonnet', 'allumette',
    'With breaking crab', 'thinly sliced', 'finely diced', 'coarsely chopped',
  ],
  preparations: [
    'Room temperature', 'chilled', 'ice cold', 'hot',
    'Fresh', 'raw', 'cooked', 'caramelized',
    'Whole', 'halved', 'quartered', 'sliced', 'diced',
    'Peeled', 'unpeeled', 'seeded', 'deveined',
    'Coarsely ground', 'finely ground', 'minced',
    'Method or prep notes',
  ],
};

function levenshteinDistance(a: string, b: string): number {
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
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

function calculateFuzzyScore(input: string, target: string): number {
  const inputLower = input.toLowerCase().trim();
  const targetLower = target.toLowerCase().trim();
  
  // Exact match
  if (inputLower === targetLower) return 1.0;
  
  // Prefix match (bonus)
  if (targetLower.startsWith(inputLower)) {
    return 0.95 - (inputLower.length > 0 ? 0 : 0.05);
  }
  
  // Contains match
  if (targetLower.includes(inputLower)) {
    return 0.8;
  }
  
  // Levenshtein distance
  const distance = levenshteinDistance(inputLower, targetLower);
  const maxLength = Math.max(inputLower.length, targetLower.length);
  
  if (maxLength === 0) return 1.0;
  
  const similarity = 1 - distance / maxLength;
  
  // Only consider matches with > 0.6 similarity
  return similarity > 0.6 ? similarity : 0;
}

export function fuzzyMatchCulinary(input: string, limit: number = 5): FuzzyMatch[] {
  if (!input || input.trim().length === 0) {
    return [];
  }
  
  const matches: FuzzyMatch[] = [];
  const seen = new Set<string>();
  
  // Search ingredients
  for (const ingredient of CULINARY_DICTIONARY.ingredients) {
    const score = calculateFuzzyScore(input, ingredient);
    if (score > 0.5 && !seen.has(ingredient.toLowerCase())) {
      matches.push({
        term: ingredient,
        confidence: score,
        type: 'ingredient',
      });
      seen.add(ingredient.toLowerCase());
    }
  }
  
  // Search techniques
  for (const technique of CULINARY_DICTIONARY.techniques) {
    const score = calculateFuzzyScore(input, technique);
    if (score > 0.5 && !seen.has(technique.toLowerCase())) {
      matches.push({
        term: technique,
        confidence: score,
        type: 'technique',
      });
      seen.add(technique.toLowerCase());
    }
  }
  
  // Search preparations
  for (const prep of CULINARY_DICTIONARY.preparations) {
    const score = calculateFuzzyScore(input, prep);
    if (score > 0.5 && !seen.has(prep.toLowerCase())) {
      matches.push({
        term: prep,
        confidence: score,
        type: 'preparations',
      });
      seen.add(prep.toLowerCase());
    }
  }
  
  // Sort by confidence (descending)
  return matches
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

export function isMisspelled(word: string, dictionary: string[] = []): boolean {
  const allTerms = [
    ...CULINARY_DICTIONARY.ingredients,
    ...CULINARY_DICTIONARY.techniques,
    ...CULINARY_DICTIONARY.preparations,
    ...dictionary,
  ];
  
  const wordLower = word.toLowerCase().trim();
  
  // Check for exact match
  if (allTerms.some(term => term.toLowerCase() === wordLower)) {
    return false;
  }
  
  // Check for fuzzy match with high confidence
  const matches = fuzzyMatchCulinary(word, 1);
  return matches.length === 0 || matches[0].confidence < 0.8;
}

export function getAutocompleteSuggestions(input: string, limit: number = 8): string[] {
  return fuzzyMatchCulinary(input, limit).map(match => match.term);
}
