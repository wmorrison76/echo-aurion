import type {
  GuardrailContext,
  GuardrailEvaluationResult,
  GuardrailOutcome,
  GuardrailRule,
  GuardrailSeverity,
} from "./guards";
import { DEFAULT_RULES, evaluateGuardrails } from "./guards";
export interface SentinelTransaction extends GuardrailContext {
  id: string;
  submittedAt: string;
}
export interface SentinelAlert {
  transactionId: string;
  vendor: string;
  amount: number;
  currency: string;
  severity: GuardrailSeverity;
  score: number;
  triggered: GuardrailOutcome[];
  narrative: string;
  context: GuardrailContext;
}
export interface SentinelSummaryStats {
  totalAmount: number;
  flaggedAmount: number;
  vendorsFlagged: number;
}
export interface SentinelSummary {
  totalTransactions: number;
  flaggedTransactions: number;
  highestSeverity: GuardrailSeverity;
  alerts: SentinelAlert[];
  stats: SentinelSummaryStats;
  narrative: string;
}
export interface SentinelOptions {
  rules?: GuardrailRule[];
}
const SEVERITY_RANK: Record<GuardrailSeverity, number> = {
  info: 0,
  warning: 1,
  critical: 2,
};
const SEVERITY_WEIGHT: Record<GuardrailSeverity, number> = {
  info: 1,
  warning: 5,
  critical: 12,
};
function computeScore(result: GuardrailEvaluationResult, amount: number) {
  const triggered = result.outcomes.filter((outcome) => outcome.triggered);
  if (triggered.length === 0) {
    return 0;
  }
  const base = triggered.reduce(
    (sum, outcome) => sum + SEVERITY_WEIGHT[outcome.severity],
    0,
  );
  const amountFactor = Math.min(5, Math.log10(Math.max(amount, 1)));
  return Number((base * (1 + amountFactor / 5)).toFixed(2));
}
function combineMessages(outcomes: GuardrailOutcome[]) {
  return outcomes
    .filter((outcome) => outcome.triggered && outcome.message)
    .map((outcome) => outcome.message)
    .join("");
}
export function analyzeWithEchoSentinel(
  transactions: SentinelTransaction[],
  options: SentinelOptions = {},
): SentinelSummary {
  const rules = options.rules ?? DEFAULT_RULES;
  let highestSeverity: GuardrailSeverity = "info";
  const alerts: SentinelAlert[] = [];
  let totalAmount = 0;
  let flaggedAmount = 0;
  const flaggedVendors = new Set<string>();
  for (const tx of transactions) {
    totalAmount += tx.amount;
    const result = evaluateGuardrails(tx, { rules });
    const score = computeScore(result, tx.amount);
    if (score > 0) {
      flaggedAmount += tx.amount;
      flaggedVendors.add(tx.vendor);
      if (SEVERITY_RANK[result.severity] > SEVERITY_RANK[highestSeverity]) {
        highestSeverity = result.severity;
      }
      const triggered = result.outcomes.filter((outcome) => outcome.triggered);
      alerts.push({
        transactionId: tx.id,
        vendor: tx.vendor,
        amount: tx.amount,
        currency: tx.currency,
        severity: result.severity,
        score,
        triggered,
        narrative:
          combineMessages(triggered) ||
          `${tx.vendor} triggered ${triggered.length} EchoSentinel control${triggered.length === 1 ? "" : "s"}.`,
        context: tx,
      });
    }
  }
  const flaggedTransactions = alerts.length;
  alerts.sort((a, b) => b.score - a.score);
  const narrative =
    flaggedTransactions === 0
      ? "EchoSentinel cleared all transactions without flags."
      : `${flaggedTransactions} transaction${flaggedTransactions === 1 ? "" : "s"} flagged covering ${flaggedVendors.size} vendor${flaggedVendors.size === 1 ? "" : "s"}; ${highestSeverity.toUpperCase()} review advised.`;
  return {
    totalTransactions: transactions.length,
    flaggedTransactions,
    highestSeverity,
    alerts,
    stats: { totalAmount, flaggedAmount, vendorsFlagged: flaggedVendors.size },
    narrative,
  };
}
