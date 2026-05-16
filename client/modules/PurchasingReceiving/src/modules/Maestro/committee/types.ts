export type CommitteeMode = "dual" | "triple";
export interface RunContext {
  runId: string;
  scheduledAt: string;
  eventId?: string;
  outletId?: string;
  metadata?: Record<string, unknown>;
}
export interface ProposalDemandItem {
  recipeId: string;
  portions: number;
  earliestStart?: string;
  station?: string;
}
export interface ProposalPurchaseOrderLine {
  id: string;
  ingredientId: string;
  vendorItemId: string;
  quantity: number;
  uom: string;
  unitCost: number;
  deliveryDate: string;
}
export interface ProposalPrepTask {
  id: string;
  recipeId: string;
  station: string;
  startAt: string;
  endAt: string;
  portions: number;
  notes?: string;
}
export interface ProposalCartAssignment {
  id: string;
  label: string;
  stops: string[];
  contents: Array<{ recipeId: string; quantity: number; uom: string }>;
}
export interface ProposalQcGate {
  id: string;
  type: "temperature" | "allergen" | "handoff" | "custom";
  target: string;
  dueAt: string;
  instructions?: string;
}
export interface ProposalNotesEntry {
  role: "planner" | "risk" | "history" | "system";
  message: string;
  addedAt: string;
}
export interface CommitteeProposal {
  demand: ProposalDemandItem[];
  purchaseOrders: ProposalPurchaseOrderLine[];
  prepTasks: ProposalPrepTask[];
  carts: ProposalCartAssignment[];
  qc: ProposalQcGate[];
  notes: ProposalNotesEntry[];
}
export interface CommitteeIssue {
  code: string;
  message: string;
  severity: "info" | "warning" | "critical";
  affected?: string[];
}
export type ProposalFixOp =
  | { type: "replace"; path: string; value: unknown }
  | { type: "increment"; path: string; value: number }
  | { type: "append"; path: string; value: unknown }
  | { type: "remove"; path: string }
  | {
      type: "upsert";
      selector: { path: string; key: string; id: string };
      value: unknown;
    };
export interface ApplyFixResult {
  fix: ProposalFixOp;
  success: boolean;
  error?: string;
}
export interface CommitteeCritique {
  agent: "planner" | "risk" | "history";
  approve: boolean;
  issues: CommitteeIssue[];
  fixes: ProposalFixOp[];
  metrics?: Partial<CommitteeMetrics>;
  durationMs?: number;
}
export interface CommitteeMetrics {
  totalSpend: number;
  projectedWaste: number;
  stockoutRisk: number;
  shelfLifeViolations: number;
  qcFailureRisk: number;
  laborOvertimeHours: number;
}
export interface HardConstraintResult {
  code: string;
  violated: boolean;
  detail?: string;
}
export interface CommitteeDecision {
  state: "approved" | "blocked" | "escalate";
  initialProposal: CommitteeProposal;
  finalProposal: CommitteeProposal;
  critiques: CommitteeCritique[];
  metrics: CommitteeMetrics;
  baselineMetrics: CommitteeMetrics;
  hardConstraints: HardConstraintResult[];
  fixesApplied: ApplyFixResult[];
  score: CommitteeScore;
  reason?: string;
}
export interface CommitteeWeights {
  wCost: number;
  wWaste: number;
  wStockout: number;
  wShelf: number;
  wQc: number;
  wLabor: number;
}
export interface CommitteeConfig {
  mode: CommitteeMode;
  enforceHardStops: boolean;
  underOrderThreshold: number;
  weights: CommitteeWeights;
  escalationSpendDeltaPct: number;
  normalizers?: Partial<Record<keyof CommitteeMetrics, Normalizer<number>>>;
  logger?: CommitteeLogger;
}
export interface CommitteeLogger {
  onProposal?: (context: RunContext, proposal: CommitteeProposal) => void;
  onCritique?: (context: RunContext, critique: CommitteeCritique) => void;
  onDecision?: (context: RunContext, decision: CommitteeDecision) => void;
}
export interface PlannerAgent {
  propose: (context: RunContext) => Promise<CommitteeProposal>;
}
export interface RiskAgent {
  critique: (
    proposal: CommitteeProposal,
    context: RunContext,
  ) => Promise<CommitteeCritique>;
}
export interface HistoryAgent {
  critique: (
    proposal: CommitteeProposal,
    context: RunContext,
  ) => Promise<CommitteeCritique>;
}
export type AgentBundle = {
  planner: PlannerAgent;
  risk: RiskAgent;
  history?: HistoryAgent;
};
export type Normalizer<T> = (value: T) => number;
export type ConstraintEvaluator = (
  proposal: CommitteeProposal,
  metrics: CommitteeMetrics,
  config: CommitteeConfig,
) => HardConstraintResult;
export const DefaultCommitteeWeights: CommitteeWeights = {
  wCost: 0.35,
  wWaste: 0.2,
  wStockout: 0.2,
  wShelf: 0.15,
  wQc: 0.05,
  wLabor: 0.05,
};
export const DefaultCommitteeConfig: CommitteeConfig = {
  mode: "dual",
  enforceHardStops: true,
  underOrderThreshold: 0.0025,
  weights: DefaultCommitteeWeights,
  escalationSpendDeltaPct: 0.08,
};
export type CommitteeScore = {
  score: number;
  normalized: Partial<Record<keyof CommitteeMetrics, number>>;
};
