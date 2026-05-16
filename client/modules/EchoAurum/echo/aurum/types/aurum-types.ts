/** * EchoAurum Type Definitions * Core interfaces for financial cognition, decision-making, and strategy */ export type CurrencyCode =
  "USD" | "EUR" | "GBP" | "JPY" | string;
export interface TimeSeriesPoint {
  date: string; // ISO 8601 value: number;
}
export interface DistributionStats {
  mean: number;
  stdDev: number;
  min?: number;
  max?: number;
  skewness?: number;
  kurtosis?: number;
  percentile5?: number; // VaR at 5% percentile95?: number;
}
export type RiskLevel = "low" | "medium" | "high" | "severe";
export interface CashFlow {
  period: number; // month or year index amount: number; description?: string;
}
export interface ScenarioInput {
  name: string;
  description?: string;
  cashFlows: CashFlow[];
  discountRate: number; // WACC or hurdle rate volatility?: number; // for Monte Carlo & options timeHorizon?: number; // years currency?: CurrencyCode; constraints?: Record<string, number | string | boolean>; assumptions?: string[];
}
export interface ScenarioResult {
  scenarioName: string;
  npv: number;
  irr?: number | null;
  paybackPeriod?: number | null;
  profitabilityIndex?: number;
  riskLevel: RiskLevel;
  downsideRisk?: number; // e.g. 5% VaR upsideCapture?: number; // upside opportunity monteCarlo?: DistributionStats; // simulated NPV distribution notes?: string[]; confidence: number; // 0-1 how confident in this estimate
}
export interface PortfolioAsset {
  id: string;
  name: string;
  expectedReturn: number;
  volatility: number;
  correlationRow?: number[]; // correlation with other assets weight?: number; minWeight?: number; maxWeight?: number;
}
export interface PortfolioOptimizationResult {
  assets: PortfolioAsset[];
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  diversificationRatio?: number;
  frontierPoint?: number; // index on efficient frontier
}
export type AurumObjective =
  | "maximize_npv"
  | "maximize_risk_adjusted_return"
  | "minimize_volatility"
  | "maximize_long_term_value"
  | "balance_growth_stability";
export interface DecisionOption {
  id: string;
  label: string;
  description?: string;
  scenario: ScenarioInput;
}
export interface DecisionRequest {
  id: string;
  context: string; // natural language description options: DecisionOption[]; objective: AurumObjective; riskTolerance: RiskLevel; timeHorizon?: number; constraints?: Record<string, number | string | boolean>; stakeholders?: string[]; comparisonMode?: 'side_by_side' | 'waterfall' | 'monte_carlo';
}
export interface DecisionExplanationStep {
  label: string;
  details: string;
  supportingData?: Record<string, any>;
}
export interface DecisionResponse {
  requestId: string;
  bestOptionId: string;
  ranking: { optionId: string; score: number; reason?: string }[];
  scenarioSummaries: Record<string, ScenarioResult>;
  explanation: DecisionExplanationStep[];
  assumptions: string[];
  confidence: number; // 0-1 sensitivityAnalysis?: SensitivityAnalysis; alternativeConsiderations?: string[]; timestamp: string;
}
export interface SensitivityAnalysis {
  parameter: string;
  baseline: number;
  scenarios: { value: number; impact: number }[];
} // Accounting & GL specific types
export interface GLAccount {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  subType?: string;
  isActive: boolean;
  parent?: string;
  normalBalance: "debit" | "credit";
  constraints?: {
    requiresCostCenter?: boolean;
    requiresVendor?: boolean;
    requiresProject?: boolean;
  };
}
export interface JournalEntryLine {
  accountCode: string;
  description: string;
  debitAmount?: number;
  creditAmount?: number;
  costCenter?: string;
  vendorId?: string;
}
export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  reference?: string;
  lines: JournalEntryLine[];
  status: "draft" | "posted" | "reversed";
  createdBy: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  gaapCompliance?: { isCompliant: boolean; violations?: string[] };
} // Knowledge Graph types
export type OntologyNodeType =
  | "ACCOUNT"
  | "ENTITY"
  | "METRIC"
  | "SCENARIO"
  | "DECISION"
  | "VENDOR"
  | "RULE"
  | "CONCEPT";
export interface OntologyNode {
  id: string;
  type: OntologyNodeType;
  label: string;
  description?: string;
  metadata?: Record<string, unknown>;
}
export interface OntologyEdge {
  id: string;
  from: string;
  to: string;
  relation: string;
  strength?: number; // 0-1 metadata?: Record<string, unknown>;
}
export interface AurumOntology {
  nodes: OntologyNode[];
  edges: OntologyEdge[];
  lastUpdated: string;
} // Behavioral Economics & Loss Aversion
export interface PreferenceProfile {
  riskAversion: number; // 0-1, where 1 = extremely risk-averse lossAversion: number; // typical range 2-2.5 (loss feels 2.5x worse than equivalent gain) discountRate: number; // personal time preference anchors?: Record<string, number>; // reference points that influence judgments
} // Strategic & Game Theory
export interface CompetitorAction {
  competitor: string;
  action: string;
  probability?: number;
  impact?: Record<string, number>;
}
export interface GameTheoryAnalysis {
  players: string[];
  strategies: Record<string, string[]>;
  nashEquilibrium?: Record<string, string>;
  yourPayoff: number;
  maxPayoff: number;
  minPayoff: number;
}
