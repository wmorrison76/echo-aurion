/** * Risk Metrics Engine * Portfolio risk measurement, Sharpe ratio, downside risk, diversification */ import type { PortfolioAsset } from "../types/aurum-types"; /** * Sharpe Ratio * (Return - Risk-Free Rate) / Volatility * Higher = better risk-adjusted returns */
export function sharpeRatio(
  portfolioReturn: number,
  riskFreeRate: number,
  volatility: number,
): number {
  if (volatility === 0) return 0;
  return (portfolioReturn - riskFreeRate) / volatility;
} /** * Sortino Ratio (downside risk only) * (Return - Target Return) / Downside Deviation */
export function sortinoRatio(
  portfolioReturn: number,
  targetReturn: number,
  downsideDeviation: number,
): number {
  if (downsideDeviation === 0) return 0;
  return (portfolioReturn - targetReturn) / downsideDeviation;
} /** * Information Ratio * (Portfolio Return - Benchmark Return) / Tracking Error */
export function informationRatio(
  portfolioReturn: number,
  benchmarkReturn: number,
  trackingError: number,
): number {
  if (trackingError === 0) return 0;
  return (portfolioReturn - benchmarkReturn) / trackingError;
} /** * Calmar Ratio * Annual Return / Maximum Drawdown */
export function calmarRatio(annualReturn: number, maxDrawdown: number): number {
  if (maxDrawdown === 0) return 0;
  return annualReturn / Math.abs(maxDrawdown);
} /** * Downside Deviation * Volatility of returns below target return */
export function downsideDeviation(returns: number[], targetReturn = 0): number {
  const belowTarget = returns.filter((r) => r < targetReturn);
  if (belowTarget.length === 0) return 0;
  const sumSquaredDiff = belowTarget.reduce(
    (sum, r) => sum + Math.pow(r - targetReturn, 2),
    0,
  );
  return Math.sqrt(sumSquaredDiff / belowTarget.length);
} /** * Maximum Drawdown * Largest peak-to-trough decline */
export function maxDrawdown(returns: number[]): number {
  if (returns.length < 2) return 0;
  let cumReturn = 1;
  let peak = 1;
  let maxDD = 0;
  for (const r of returns) {
    cumReturn *= 1 + r;
    if (cumReturn > peak) {
      peak = cumReturn;
    }
    const dd = (peak - cumReturn) / peak;
    if (dd > maxDD) {
      maxDD = dd;
    }
  }
  return -maxDD; // Return as negative
} /** * Diversification Ratio */
export function diversificationRatio(
  assets: PortfolioAsset[],
  portfolioVolatility: number,
): number {
  if (portfolioVolatility === 0) return 0;
  const weightedVolatility = assets.reduce((sum, asset) => {
    const weight = asset.weight ?? 0;
    return sum + weight * asset.volatility;
  }, 0);
  return weightedVolatility / portfolioVolatility;
} /** * Beta - systematic risk */
export function beta(assetReturns: number[], marketReturns: number[]): number {
  if (assetReturns.length === 0 || marketReturns.length === 0) return 0;
  const n = Math.min(assetReturns.length, marketReturns.length);
  const assetMean = assetReturns.slice(0, n).reduce((a, v) => a + v, 0) / n;
  const marketMean = marketReturns.slice(0, n).reduce((a, v) => a + v, 0) / n;
  let covariance = 0;
  let marketVariance = 0;
  for (let i = 0; i < n; i++) {
    covariance +=
      (assetReturns[i] - assetMean) * (marketReturns[i] - marketMean);
    marketVariance += Math.pow(marketReturns[i] - marketMean, 2);
  }
  covariance /= n;
  marketVariance /= n;
  if (marketVariance === 0) return 0;
  return covariance / marketVariance;
} /** * Alpha - excess return above CAPM */
export function alpha(
  actualReturn: number,
  riskFreeRate: number,
  betaValue: number,
  marketReturn: number,
): number {
  const expectedReturn =
    riskFreeRate + betaValue * (marketReturn - riskFreeRate);
  return actualReturn - expectedReturn;
} /** * Correlation Coefficient */
export function correlation(returns1: number[], returns2: number[]): number {
  if (returns1.length === 0 || returns2.length === 0) return 0;
  const n = Math.min(returns1.length, returns2.length);
  const mean1 = returns1.slice(0, n).reduce((a, v) => a + v, 0) / n;
  const mean2 = returns2.slice(0, n).reduce((a, v) => a + v, 0) / n;
  let covariance = 0;
  let std1 = 0;
  let std2 = 0;
  for (let i = 0; i < n; i++) {
    covariance += (returns1[i] - mean1) * (returns2[i] - mean2);
    std1 += Math.pow(returns1[i] - mean1, 2);
    std2 += Math.pow(returns2[i] - mean2, 2);
  }
  covariance /= n;
  std1 = Math.sqrt(std1 / n);
  std2 = Math.sqrt(std2 / n);
  if (std1 === 0 || std2 === 0) return 0;
  return covariance / (std1 * std2);
} /** * Herfindahl Index (portfolio concentration) */
export function herfindahlIndex(assets: PortfolioAsset[]): number {
  return assets.reduce((sum, asset) => {
    const weight = asset.weight ?? 0;
    return sum + Math.pow(weight, 2);
  }, 0);
} /** * Tail Ratio */
export function tailRatio(returns: number[], percentile = 0.05): number {
  const sorted = [...returns].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * percentile);
  const leftTail = sorted.slice(0, idx);
  const rightTail = sorted.slice(sorted.length - idx);
  const leftAvg =
    leftTail.length > 0
      ? leftTail.reduce((a, v) => a + v, 0) / leftTail.length
      : 0;
  const rightAvg =
    rightTail.length > 0
      ? rightTail.reduce((a, v) => a + v, 0) / rightTail.length
      : 0;
  if (leftAvg === 0) return 0;
  return Math.abs(rightAvg / leftAvg);
} /** * Value at Risk (VaR) - simple percentile method */
export function valueAtRisk(returns: number[], confidenceLevel = 0.95): number {
  const sorted = [...returns].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * (1 - confidenceLevel));
  return sorted[idx];
} /** * Conditional Value at Risk (CVaR) */
export function conditionalValueAtRisk(
  returns: number[],
  confidenceLevel = 0.95,
): number {
  const sorted = [...returns].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * (1 - confidenceLevel));
  const tail = sorted.slice(0, idx + 1);
  return tail.reduce((a, v) => a + v, 0) / tail.length;
}
