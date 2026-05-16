/**
 * Price intelligence — size/abv-normalized price scoring & bands.
 * No external data required; you can layer vendor feeds later.
 */
export function pricePerLiter(priceUSD, size_ml){
  const p = Math.max(0, Number(priceUSD)||0);
  const ml = Math.max(1, Number(size_ml)||1);
  return p / (ml/1000);
}

export function proofPerDollar(priceUSD, abv){
  const p = Math.max(0, Number(priceUSD)||0);
  const A = Math.max(0, Number(abv)||0);
  return p ? (A*2)/p : 0; // proof per dollar
}

/** Rough fair banding by category; values chosen conservatively. */
const BANDS = {
  gin:     { low: 20, mid: 35, high: 55 },
  vodka:   { low: 18, mid: 32, high: 50 },
  whisky:  { low: 25, mid: 45, high: 80 },
  rum:     { low: 18, mid: 35, high: 60 },
  tequila: { low: 25, mid: 45, high: 85 },
  mezcal:  { low: 30, mid: 55, high: 95 },
  vermouth:{ low: 10, mid: 18, high: 30 },
  liqueur: { low: 18, mid: 35, high: 60 },
  unknown: { low: 15, mid: 30, high: 50 },
};

export function priceBand(category, priceUSD){
  const band = BANDS[String(category||"unknown").toLowerCase()] || BANDS.unknown;
  const p = Math.max(0, Number(priceUSD)||0);
  if (p <= band.low) return "low";
  if (p <= band.mid) return "fair";
  if (p <= band.high) return "premium";
  return "luxury";
}

export function inferPrice({ category, abv, size_ml }, referenceUSD){
  // If reference price is known, compute normalized metrics; else return hints.
  if (referenceUSD!=null){
    return {
      per_liter: pricePerLiter(referenceUSD, size_ml),
      proof_per_dollar: proofPerDollar(referenceUSD, abv),
      band: priceBand(category, referenceUSD),
    };
  }
  // Suggest a fair mid price if no reference is provided
  const band = ({
    gin:35, vodka:32, whisky:45, rum:35, tequila:45, mezcal:55,
    vermouth:18, liqueur:35, unknown:30
  })[String(category||"unknown").toLowerCase()] || 30;
  return { suggested_mid: band };
}
