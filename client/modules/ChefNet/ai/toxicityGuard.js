/**
 * Very lightweight, rule‑based toxicity / hate‑speech detector.
 * Replace with a call to a proper ML service or moderation API in production.
 */
const BAD_PATTERNS = [
  /\bidiot\b/i,
  /\bstupid\b/i,
  /\b(retard|retarded)\b/i,
  /\bkill\s+yourself\b/i,
  /\bhate\s+you\b/i,
  /\bslur\b/i,
];

const CATEGORY_HINTS = {
  harassment: [/\bidiot\b/i, /\bstupid\b/i],
  self_harm: [/\bkill\s+myself\b/i, /\bkill\s+yourself\b/i],
  violence: [/\bshoot\b/i, /\bstab\b/i],
};

export function scoreToxicity(text) {
  if (!text) return { isToxic: false, score: 0, categories: [] };
  let score = 0;
  const categories = new Set();

  BAD_PATTERNS.forEach((re) => {
    if (re.test(text)) score += 0.25;
  });

  Object.entries(CATEGORY_HINTS).forEach(([name, patterns]) => {
    if (patterns.some((re) => re.test(text))) categories.add(name);
  });

  score = Math.min(1, score);
  return { isToxic: score >= 0.5, score, categories: Array.from(categories) };
}

/**
 * Returns a user‑friendly moderation message if content should be blocked.
 */
export function getModerationMessage(result) {
  if (!result?.isToxic) return null;
  if (result.categories.includes("self_harm")) {
    return "This message looks like self‑harm or crisis language. Please reach out to a trusted person or helpline instead of posting it.";
  }
  if (result.categories.includes("violence")) {
    return "This message appears to contain threats or violent language. Please rephrase it more constructively.";
  }
  return "This message may include hate speech or harassing language. Try focusing on the behavior or situation, not the person.";
}
