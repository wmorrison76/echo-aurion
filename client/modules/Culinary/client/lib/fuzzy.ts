const MAX_SUGGESTION_LIMIT = 12;

const nonAlphaNumeric = /[^a-z0-9]+/gi;

export type FuzzyMatchOptions = {
  limit?: number;
  threshold?: number;
};

export type FuzzyResult = {
  value: string;
  score: number;
};

function normalize(input: string): string {
  return input.trim().toLowerCase().replace(nonAlphaNumeric, " ").replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  const matrix = Array.from({ length: aLen + 1 }, () => new Array(bLen + 1).fill(0));
  for (let i = 0; i <= aLen; i += 1) matrix[i]![0] = i;
  for (let j = 0; j <= bLen; j += 1) matrix[0]![j] = j;

  for (let i = 1; i <= aLen; i += 1) {
    for (let j = 1; j <= bLen; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }

  return matrix[aLen]![bLen]!;
}

function prefixBonus(query: string, candidate: string): number {
  if (!query || !candidate) return 0;
  const idx = candidate.indexOf(query);
  if (idx === 0) return 0.2;
  if (idx > 0) return 0.1;
  return 0;
}

function containedBonus(query: string, candidate: string): number {
  if (!query || !candidate) return 0;
  const words = candidate.split(" ");
  if (words.some((word) => word === query)) return 0.15;
  if (candidate.includes(query)) return 0.05;
  return 0;
}

export function fuzzyScore(query: string, candidate: string): number {
  const normalizedQuery = normalize(query);
  const normalizedCandidate = normalize(candidate);
  if (!normalizedCandidate) return 0;
  if (!normalizedQuery) return 0.25;

  if (normalizedQuery === normalizedCandidate) {
    return 1;
  }

  const distance = levenshtein(normalizedQuery, normalizedCandidate);
  const maxLength = Math.max(normalizedQuery.length, normalizedCandidate.length);
  const base = 1 - distance / Math.max(1, maxLength);
  const bonus = prefixBonus(normalizedQuery, normalizedCandidate) + containedBonus(normalizedQuery, normalizedCandidate);
  return Math.max(0, Math.min(1, base + bonus));
}

export function fuzzyMatch(query: string, candidates: string[], options: FuzzyMatchOptions = {}): FuzzyResult[] {
  const { limit = 6, threshold = 0.35 } = options;
  if (!candidates.length) return [];
  const cappedLimit = Math.max(1, Math.min(limit, MAX_SUGGESTION_LIMIT));

  const scored = candidates
    .map((value) => ({ value, score: fuzzyScore(query, value) }))
    .filter((entry) => entry.score >= threshold)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, cappedLimit);
}

export function buildDictionary(values: Iterable<string>): string[] {
  const seen = new Set<string>();
  for (const raw of values) {
    const cleaned = normalize(String(raw || ""));
    if (!cleaned) continue;
    const formatted = cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
    if (!seen.has(formatted)) {
      seen.add(formatted);
    }
  }
  return Array.from(seen);
}
