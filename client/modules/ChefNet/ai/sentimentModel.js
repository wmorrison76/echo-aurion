/**
 * Ultra‑simple sentiment and category tagging.
 * Designed for on‑device summarization and heatmaps.
 */
const POSITIVE_WORDS = ["thank", "great", "awesome", "love", "appreciate", "proud", "support"];
const NEGATIVE_WORDS = ["tired", "burned", "exhausted", "angry", "frustrated", "hate", "overwhelmed"];

export function analyzeSentiment(text) {
  if (!text) return { polarity: 0, label: "neutral" };
  const lower = text.toLowerCase();
  let pos = 0;
  let neg = 0;
  POSITIVE_WORDS.forEach((w) => { if (lower.includes(w)) pos += 1; });
  NEGATIVE_WORDS.forEach((w) => { if (lower.includes(w)) neg += 1; });

  const polarity = pos - neg;
  let label = "neutral";
  if (polarity > 1) label = "positive";
  else if (polarity < -1) label = "negative";

  return { polarity, label };
}
