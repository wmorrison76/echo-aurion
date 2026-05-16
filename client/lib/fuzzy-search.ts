export type FuzzyMatch<T> = {
  item: T;
  score: number;
};

const normalize = (value: string) => value.toLowerCase().trim();

const tokenize = (value: string) =>
  normalize(value)
    .replace(/[,;:()]/g, "")
    .split(/\s+/)
    .filter(Boolean);

const levenshtein = (a: string, b: string) => {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
};

const similarity = (query: string, target: string) => {
  const q = normalize(query);
  const t = normalize(target);
  if (!q || !t) return 0;
  if (q === t) return 1;
  if (t.includes(q) || q.includes(t)) {
    const longer = Math.max(q.length, t.length);
    const shorter = Math.min(q.length, t.length);
    return 0.85 + (shorter / longer) * 0.15;
  }
  const qTokens = tokenize(q);
  const tTokens = tokenize(t);
  let matches = 0;
  qTokens.forEach((token) => {
    tTokens.some((tToken) => {
      if (token === tToken) {
        matches += 1;
        return true;
      }
      return levenshtein(token, tToken) <= 2;
    });
  });
  const tokenScore = matches / Math.max(qTokens.length, tTokens.length, 1);
  const levScore = 1 - levenshtein(q, t) / Math.max(q.length, t.length);
  return tokenScore * 0.75 + levScore * 0.25;
};

export const fuzzyFilter = <T,>(
  query: string,
  items: T[],
  getLabel: (item: T) => string,
  minScore = 0.6,
): FuzzyMatch<T>[] => {
  const q = normalize(query);
  if (!q) return items.map((item) => ({ item, score: 1 }));
  return items
    .map((item) => ({ item, score: similarity(q, getLabel(item)) }))
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => b.score - a.score);
};
