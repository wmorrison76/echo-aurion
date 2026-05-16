// Simple spell check using common misspellings dictionary
// This is a lightweight implementation that doesn't require external APIs

const COMMON_MISSPELLINGS: Record<string, string> = {
  "teh": "the",
  "recieve": "receive",
  "beleive": "believe",
  "occured": "occurred",
  "neccessary": "necessary",
  "seperate": "separate",
  "havent": "haven't",
  "dont": "don't",
  "cant": "can't",
  "wont": "won't",
  "shouldnt": "shouldn't",
  "couldnt": "couldn't",
  "wouldnt": "wouldn't",
  "didnt": "didn't",
  "isnt": "isn't",
  "arent": "aren't",
  "wasnt": "wasn't",
  "werent": "weren't",
  "doesnt": "doesn't",
  "im": "I'm",
  "its": "it's",
  "theres": "there's",
  "wheres": "where's",
  "whos": "who's",
  "youre": "you're",
  "hes": "he's",
  "shes": "she's",
  "lets": "let's",
  "thats": "that's",
  "vistior": "visitor",
  "restaraunt": "restaurant",
  "definately": "definitely",
  "accomodate": "accommodate",
  "wich": "which",
  "spaghetti": "spaghetti",
  "vegatarian": "vegetarian",
  "excelent": "excellent",
  "delicous": "delicious",
};

export interface SpellCheckResult {
  word: string;
  suggestions: string[];
  index: number;
}

export function checkSpelling(text: string): SpellCheckResult[] {
  if (!text) return [];

  const results: SpellCheckResult[] = [];
  const words = text.match(/\b\w+\b/g) || [];
  let currentIndex = 0;

  words.forEach((word) => {
    const lowerWord = word.toLowerCase();
    const index = text.indexOf(word, currentIndex);

    if (COMMON_MISSPELLINGS[lowerWord]) {
      results.push({
        word,
        suggestions: [COMMON_MISSPELLINGS[lowerWord]],
        index,
      });
    }

    currentIndex = index + word.length;
  });

  return results;
}

export function suggestCorrections(text: string, misspelledWord: string): string[] {
  const suggestions: string[] = [];

  // Direct match
  if (COMMON_MISSPELLINGS[misspelledWord.toLowerCase()]) {
    suggestions.push(COMMON_MISSPELLINGS[misspelledWord.toLowerCase()]);
  }

  // Similar words (basic Levenshtein-like approach)
  const lower = misspelledWord.toLowerCase();
  const maxDistance = 2;

  Object.entries(COMMON_MISSPELLINGS).forEach(([key, value]) => {
    const distance = levenshteinDistance(lower, key);
    if (distance > 0 && distance <= maxDistance) {
      suggestions.push(value);
    }
  });

  return [...new Set(suggestions)].slice(0, 3); // Return unique suggestions, max 3
}

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
