/** * Statistical Validation Service * Provides rigorous statistical analysis of experimental data */ interface StatisticalSummary {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  range: number;
  standardDeviation: number;
  variance: number;
  coefficientOfVariation: number;
  standardError: number;
  q1: number;
  q3: number;
  iqr: number;
}
interface OutlierAnalysis {
  outliers: number[];
  outlierIndices: number[];
  method: "iqr" | "zscore";
  count: number;
  percent: number;
}
interface ComparisonResult {
  mean_difference: number;
  percent_difference: number;
  tStatistic: number;
  effectSize_cohens_d: number;
  effectSize_interpretation: string;
  pooledStandardError: number;
  upperCI_95: number;
  lowerCI_95: number;
}
interface ReproducibilityScore {
  score: number; // 0-100 interpretation: string; consistency_level:"excellent" |"good" |"acceptable" |"poor";
}
export interface ValidationDetails {
  results: StatisticalSummary;
  baseline: StatisticalSummary;
  outlierAnalysis: OutlierAnalysis;
  comparison: ComparisonResult;
  reproducibility: ReproducibilityScore;
  assumptions: { normality_check: string; equal_variance: boolean };
} /** * Calculate basic statistical summary */
function calculateSummary(data: number[]): StatisticalSummary {
  if (data.length === 0) {
    throw new Error("Data array is empty");
  }
  const sorted = [...data].sort((a, b) => a - b);
  const n = data.length;
  const sum = data.reduce((a, b) => a + b, 0);
  const mean = sum / n; // Calculate standard deviation const squaredDiffs = data.map((x) => (x - mean) ** 2); const variance = squaredDiffs.reduce((a, b) => a + b, 0) / n; const standardDeviation = Math.sqrt(variance); // Percentiles const q1Index = Math.floor(n * 0.25); const q3Index = Math.floor(n * 0.75); const medianIndex = Math.floor(n * 0.5); return { count: n, mean, median: sorted[medianIndex], min: sorted[0], max: sorted[n - 1], range: sorted[n - 1] - sorted[0], standardDeviation, variance, coefficientOfVariation: (standardDeviation / mean) * 100, standardError: standardDeviation / Math.sqrt(n), q1: sorted[q1Index], q3: sorted[q3Index], iqr: sorted[q3Index] - sorted[q1Index], };
} /** * Identify outliers using IQR method and Z-score */
function detectOutliers(
  data: number[],
  summary: StatisticalSummary,
): OutlierAnalysis {
  const outliers: number[] = [];
  const outlierIndices: number[] = []; // IQR method (primary) const lowerBound = summary.q1 - 1.5 * summary.iqr; const upperBound = summary.q3 + 1.5 * summary.iqr; data.forEach((value, index) => { if (value < lowerBound || value > upperBound) { outliers.push(value); outlierIndices.push(index); } }); return { outliers, outlierIndices, method:"iqr", count: outliers.length, percent: (outliers.length / data.length) * 100, };
} /** * Cohen's d effect size calculation */
function calculateCohensD(
  results: StatisticalSummary,
  baseline: StatisticalSummary,
): string {
  // Pooled standard deviation const n1 = results.count; const n2 = baseline.count; const sp = Math.sqrt( ((n1 - 1) * Math.pow(results.standardDeviation, 2) + (n2 - 1) * Math.pow(baseline.standardDeviation, 2)) / (n1 + n2 - 2), ); // Cohen's d const d = (results.mean - baseline.mean) / sp; if (Math.abs(d) < 0.2) return"negligible"; if (Math.abs(d) < 0.5) return"small"; if (Math.abs(d) < 0.8) return"medium"; return"large";
} /** * Calculate reproducibility score based on CV and consistency */
function calculateReproducibility(data: number[]): ReproducibilityScore {
  const summary = calculateSummary(data);
  const cv = summary.coefficientOfVariation;
  let score = 100;
  let interpretation = "Excellent reproducibility";
  let consistency_level: "excellent" | "good" | "acceptable" | "poor" =
    "excellent"; // Coefficient of Variation thresholds if (cv < 5) { score = 95; interpretation ="Excellent - Less than 5% variation"; consistency_level ="excellent"; } else if (cv < 10) { score = 85; interpretation ="Good - 5-10% variation (typical for food)"; consistency_level ="good"; } else if (cv < 20) { score = 70; interpretation ="Acceptable - 10-20% variation (high for food)"; consistency_level ="acceptable"; } else { score = 40; interpretation ="Poor - Over 20% variation (inconsistent)"; consistency_level ="poor"; } return { score, interpretation, consistency_level, };
} /** * Main validation function */
export function validateExperimentalResults(
  results: number[],
  baseline: number[],
  sampleSize_minimum: number = 3,
): ValidationDetails & { isValid: boolean; confidenceScore: number } {
  // Validate input if ( results.length < sampleSize_minimum || baseline.length < sampleSize_minimum ) { throw new Error( `Insufficient data: need minimum ${sampleSize_minimum} samples, got ${results.length} results and ${baseline.length} baseline`, ); } // Calculate summaries const resultsSummary = calculateSummary(results); const baselineSummary = calculateSummary(baseline); // Detect outliers const outlierAnalysis = detectOutliers(results, resultsSummary); // Calculate comparison metrics const meanDifference = resultsSummary.mean - baselineSummary.mean; const percentDifference = (meanDifference / baselineSummary.mean) * 100; // t-statistic for independent samples const pooledStd = Math.sqrt( ((results.length - 1) * Math.pow(resultsSummary.standardDeviation, 2) + (baseline.length - 1) * Math.pow(baselineSummary.standardDeviation, 2)) / (results.length + baseline.length - 2), ); const standardError = pooledStd * Math.sqrt(1 / results.length + 1 / baseline.length); const tStat = (resultsSummary.mean - baselineSummary.mean) / standardError; // 95% Confidence Interval const critical_t = 1.96; // Approximately for large samples const ci_margin = critical_t * standardError; // Reproducibility const reproducibility = calculateReproducibility(results); // Calculate confidence score let confidenceScore = 100; // Reduce confidence for outliers if (outlierAnalysis.count > 0) { confidenceScore -= Math.min(20, outlierAnalysis.count * 8); } // Reduce confidence for poor reproducibility if (reproducibility.score < 60) { confidenceScore -= 25; } // Reduce confidence if sample size is minimal if (results.length < 5) { confidenceScore -= 10; } confidenceScore = Math.max(0, Math.min(100, confidenceScore)); const isValid = confidenceScore >= 70 && outlierAnalysis.count === 0 && results.length >= sampleSize_minimum; return { results: resultsSummary, baseline: baselineSummary, outlierAnalysis, comparison: { mean_difference: meanDifference, percent_difference: percentDifference, tStatistic: tStat, effectSize_cohens_d: Math.abs( tStat / Math.sqrt(results.length + baseline.length), ), // Approximation effectSize_interpretation: calculateCohensD( resultsSummary, baselineSummary, ), pooledStandardError: standardError, upperCI_95: resultsSummary.mean + ci_margin, lowerCI_95: resultsSummary.mean - ci_margin, }, reproducibility, assumptions: { normality_check: results.length < 5 ?"Unable to assess (small sample)" :"Assumed normal (large n)", equal_variance: Math.abs( resultsSummary.standardDeviation - baselineSummary.standardDeviation, ) / Math.max( resultsSummary.standardDeviation, baselineSummary.standardDeviation, ) < 0.5, }, isValid, confidenceScore, };
} /** * Estimate timeline based on similar experiments */
export function estimateTimeline(
  similarExperiments: Array<{ title: string; daysToCompletion: number }>,
): {
  estimatedDays: number;
  range: { min: number; max: number };
  median: number;
  confidence: string;
} {
  if (similarExperiments.length === 0) {
    return {
      estimatedDays: 21,
      range: { min: 14, max: 30 },
      median: 21,
      confidence: "low (no historical data)",
    };
  }
  const days = similarExperiments.map((e) => e.daysToCompletion);
  const sorted = [...days].sort((a, b) => a - b);
  const avg = days.reduce((a, b) => a + b, 0) / days.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const std =
    Math.sqrt(
      days.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / days.length,
    ) || 0;
  return {
    estimatedDays: Math.round(avg),
    range: {
      min: Math.max(1, Math.round(avg - std)),
      max: Math.round(avg + std),
    },
    median: Math.round(median),
    confidence: `high (${similarExperiments.length} similar experiments)`,
  };
} /** * Calculate cost impact based on ingredient volatility */
export function calculateCostImpact(
  ingredients: Array<{
    name: string;
    costPer100g: number;
    volatilityPercent: number;
  }>,
  batchSize: number = 100, // grams
): {
  estimatedCost: number;
  costRange: { min: number; max: number };
  volatilityLevel: "stable" | "moderate" | "high" | "critical";
  riskAssessment: string;
} {
  const totalCost =
    ingredients.reduce((sum, ing) => sum + ing.costPer100g, 0) *
    (batchSize / 100);
  const volatilityRisk = Math.max(
    ...ingredients.map((i) => i.volatilityPercent),
  );
  let volatilityLevel: "stable" | "moderate" | "high" | "critical" = "stable";
  if (volatilityRisk < 5) volatilityLevel = "stable";
  else if (volatilityRisk < 15) volatilityLevel = "moderate";
  else if (volatilityRisk < 30) volatilityLevel = "high";
  else volatilityLevel = "critical";
  const costRange = {
    min: totalCost * (1 - volatilityRisk / 100),
    max: totalCost * (1 + volatilityRisk / 100),
  };
  let riskAssessment = "Ingredient costs stable - proceed with confidence";
  if (volatilityLevel === "critical") {
    riskAssessment = "HIGH RISK: Lock in supplier pricing now or delay start";
  } else if (volatilityLevel === "high") {
    riskAssessment =
      "MEDIUM-HIGH RISK: Negotiate volume discounts with suppliers";
  } else if (volatilityLevel === "moderate") {
    riskAssessment = "MODERATE RISK: Monitor prices weekly";
  }
  return {
    estimatedCost: Math.round(totalCost * 100) / 100,
    costRange: {
      min: Math.round(costRange.min * 100) / 100,
      max: Math.round(costRange.max * 100) / 100,
    },
    volatilityLevel,
    riskAssessment,
  };
}
