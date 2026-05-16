import { clamp } from "./utils";
export type CommitteeMode = "single" | "dual" | "triple";
export type IssueSeverity = "info" | "warning" | "critical";
export interface CommitteeWeights {
  cost: number;
  stockout: number;
  waste: number;
  shelf: number;
  qc: number;
  labor: number;
}
export interface CommitteeConstraints {
  /** Maximum acceptable probability (0-1) of any stockout after planner + verifier. */ maxUnderOrderRisk: number;
  /** Whether perishable items must retain shelf life beyond the event horizon. */ enforceShelfLife: boolean;
  /** Shelf life buffer in hours required at the service start. */ minShelfLifeHours: number;
  /** Enforce T-24 lock on banquet production adjustments. */ enforceT24Lock: boolean;
  /** Hours before service where the lock becomes immutable. */ t24LockHours: number;
  /** Default auto over-order margin applied by the planner (e.g. 0.02 → 2%). */ overOrderBuffer: number;
}
export interface CommitteePolicy {
  weights: CommitteeWeights;
  constraints: CommitteeConstraints;
  /** Spend delta percentage vs planner proposal that triggers human review. */ escalateSpendDeltaPct: number;
  /** Score delta between agents that triggers human review. */ escalateDisagreementScore: number;
  /** Fraction of agents that must approve in triple mode. */ quorum: number;
  /** Waste percentage threshold used as soft target. */ targetWastePct: number;
  /** Enable the historian agent in triple mode. */ useHistoryAgent: boolean;
}
export interface CommitteeLogger {
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
}
export interface DemandItem {
  id: string;
  name: string;
  outletId?: string;
  eventId?: string;
  requiredQty: number;
  unit: string;
  neededBy: string;
  onHandQty?: number;
  parLevel?: number;
  shelfLifeHours?: number;
  prepMinutesPerUnit?: number;
  allergens?: string[];
  underOrderRisk?: number;
  wasteCostPerUnit?: number;
  category?: string;
  notes?: string;
}
export interface DemandPlanItem extends DemandItem {
  recommendedQty: number;
  plannedPurchaseQty: number;
  overageQty: number;
  projectedWasteQty: number;
  projectedWasteCost: number;
  adjustedRisk: number;
  vendorId?: string;
}
export interface InventorySnapshotItem {
  itemId: string;
  onHandQty: number;
  unitCost?: number;
  lotIds?: string[];
  shelfLifeHours?: number;
  lastCountedAt?: string;
}
export interface SupplierOption {
  id: string;
  supplierId: string;
  itemId: string;
  orderUnit: string;
  packSize: number;
  unitCost: number;
  leadTimeDays: number;
  shelfLifeHours?: number;
  allergens?: string[];
  minimumOrderQty?: number;
  currency?: string;
}
export interface HistoricalDemandSample {
  id: string;
  itemId: string;
  eventDate: string;
  fulfilledQty: number;
  wasteQty: number;
  guests: number;
  outletId?: string;
  notes?: string;
}
export interface CommitteeInputs {
  demand: DemandItem[];
  inventory: InventorySnapshotItem[];
  catalog: SupplierOption[];
  historical?: HistoricalDemandSample[];
  carts?: CartTemplate[];
  prepStations?: PrepStationProfile[];
  nowISO?: string;
}
export interface PrepStationProfile {
  id: string;
  name: string;
  maxConcurrentTasks: number;
  overtimeRate: number;
}
export interface PrepTask {
  id: string;
  demandId: string;
  stationId?: string;
  title: string;
  qty: number;
  unit: string;
  startAt: string;
  endAt: string;
  laborHours: number;
  overtimeRisk: number;
}
export interface CartTemplate {
  id: string;
  name: string;
  capacity: number;
  outletId?: string;
}
export interface CartPlan {
  id: string;
  cartTemplateId: string;
  demandIds: string[];
  labels: string[];
  status: "draft" | "kitting" | "holding" | "staged" | "service" | "complete";
}
export interface QualityGate {
  id: string;
  cartPlanId: string;
  gate: "prep" | "holding" | "dispatch" | "service";
  dueAt: string;
  completedAt?: string;
  passed?: boolean;
  notes?: string;
  riskScore: number;
}
export interface CommitteeNote {
  id: string;
  createdAt: string;
  agent: string;
  message: string;
  severity: IssueSeverity;
}
export interface CommitteeProposal {
  generatedAt: string;
  generatedBy: "planner" | "committee" | "historian";
  demand: DemandPlanItem[];
  purchaseOrders: CommitteePurchaseOrder[];
  prepTasks: PrepTask[];
  carts: CartPlan[];
  quality: QualityGate[];
  notes: CommitteeNote[];
}
export interface CommitteePurchaseOrderLine {
  id: string;
  itemId: string;
  qty: number;
  unit: string;
  unitCost?: number;
  currency?: string;
  leadTimeDays?: number;
  allergens?: string[];
  shelfLifeHours?: number;
  minimumOrderQty?: number;
}
export interface CommitteePurchaseOrder {
  id: string;
  supplierId: string;
  status: "draft" | "submitted" | "confirmed" | "in_transit" | "received";
  expectedDate: string;
  createdAt: string;
  submittedBy?: string;
  notes?: string;
  lines: CommitteePurchaseOrderLine[];
}
export interface CommitteeIssue {
  id: string;
  message: string;
  severity: IssueSeverity;
  code: string;
  affectedIds: string[];
  metrics?: Partial<CommitteeMetrics>;
  blocking?: boolean;
}
export type CommitteePatch =
  | {
      type: "adjustPurchaseOrderQuantity";
      purchaseOrderId: string;
      lineId: string;
      newQty: number;
      reason: string;
    }
  | {
      type: "adjustDemandRecommendation";
      demandId: string;
      newRecommendedQty: number;
      reason: string;
      newUnderOrderRisk?: number;
    }
  | { type: "addNote"; note: CommitteeNote }
  | {
      type: "updatePrepTaskWindow";
      taskId: string;
      startAt: string;
      endAt: string;
      reason: string;
    };
export interface CommitteeCritique {
  agentId: "planner" | "risk" | "history";
  agentName: string;
  issues: CommitteeIssue[];
  fixes: CommitteePatch[];
  metrics: CommitteeMetrics;
  approve: boolean;
}
export interface CommitteeMetrics {
  totalSpend: number;
  stockoutProbability: number;
  projectedWasteCost: number;
  projectedWasteQty: number;
  shelfLifeViolations: number;
  qualityRisk: number;
  overtimeHours: number;
  score: number;
}
export interface HardConstraintResult {
  passed: boolean;
  violations: string[];
}
export type CommitteeDecisionStatus =
  | "approved"
  | "needs_human_review"
  | "blocked";
export interface CommitteeDecision {
  status: CommitteeDecisionStatus;
  finalProposal: CommitteeProposal;
  metrics: CommitteeMetrics;
  critiques: CommitteeCritique[];
  hardConstraints: HardConstraintResult;
}
export interface CommitteeRunAuditEntry {
  proposal: CommitteeProposal;
  critiques: CommitteeCritique[];
  metrics: CommitteeMetrics;
  status: CommitteeDecisionStatus;
  timestamp: string;
}
export interface CommitteeRunResult {
  context: CommitteeContext;
  initialProposal: CommitteeProposal;
  decision: CommitteeDecision;
  audit: CommitteeRunAuditEntry[];
}
export interface CommitteeContext {
  runId: string;
  mode: CommitteeMode;
  horizonHours: number;
  serviceDate?: string;
  startedAt: string;
  policy: CommitteePolicy;
  logger?: CommitteeLogger;
  metadata?: Record<string, unknown>;
}
export interface PlannerAgentResult {
  proposal: CommitteeProposal;
  diagnostics: CommitteeAgentDiagnostics;
}
export interface CommitteeAgentDiagnostics {
  metrics: CommitteeMetrics;
  durationMs: number;
}
export type RiskAgentResult = CommitteeCritique;
export type HistoryAgentResult = CommitteeCritique | null;
export interface CommitteeRunOptions {
  context?: Partial<CommitteeContext> & { runId: string };
  mode?: CommitteeMode;
}
export const DEFAULT_COMMITTEE_POLICY: CommitteePolicy = {
  weights: {
    cost: 0.35,
    stockout: 0.3,
    waste: 0.1,
    shelf: 0.1,
    qc: 0.1,
    labor: 0.05,
  },
  constraints: {
    maxUnderOrderRisk: 0.25,
    enforceShelfLife: true,
    minShelfLifeHours: 48,
    enforceT24Lock: true,
    t24LockHours: 24,
    overOrderBuffer: 0.02,
  },
  escalateSpendDeltaPct: 0.05,
  escalateDisagreementScore: 0.12,
  quorum: 0.67,
  targetWastePct: 0.03,
  useHistoryAgent: true,
};
export function createCommitteeContext(
  partial: Partial<Omit<CommitteeContext, "policy" | "startedAt">> & {
    runId: string;
    policy?: Partial<CommitteePolicy> & {
      weights?: Partial<CommitteeWeights>;
      constraints?: Partial<CommitteeConstraints>;
    };
  },
): CommitteeContext {
  const startedAt = new Date().toISOString();
  const policy = mergePolicy(partial.policy);
  return {
    runId: partial.runId,
    mode: partial.mode ?? "dual",
    horizonHours: partial.horizonHours ?? 48,
    serviceDate: partial.serviceDate,
    startedAt,
    policy,
    logger: partial.logger,
    metadata: partial.metadata ?? {},
  };
}
function mergePolicy(
  override?: Partial<CommitteePolicy> & {
    weights?: Partial<CommitteeWeights>;
    constraints?: Partial<CommitteeConstraints>;
  },
): CommitteePolicy {
  const base = DEFAULT_COMMITTEE_POLICY;
  if (!override) return base;
  return {
    weights: {
      cost: override.weights?.cost ?? base.weights.cost,
      stockout: override.weights?.stockout ?? base.weights.stockout,
      waste: override.weights?.waste ?? base.weights.waste,
      shelf: override.weights?.shelf ?? base.weights.shelf,
      qc: override.weights?.qc ?? base.weights.qc,
      labor: override.weights?.labor ?? base.weights.labor,
    },
    constraints: {
      maxUnderOrderRisk: clamp(
        override.constraints?.maxUnderOrderRisk ??
          base.constraints.maxUnderOrderRisk,
        0,
        1,
      ),
      enforceShelfLife:
        override.constraints?.enforceShelfLife ??
        base.constraints.enforceShelfLife,
      minShelfLifeHours:
        override.constraints?.minShelfLifeHours ??
        base.constraints.minShelfLifeHours,
      enforceT24Lock:
        override.constraints?.enforceT24Lock ?? base.constraints.enforceT24Lock,
      t24LockHours:
        override.constraints?.t24LockHours ?? base.constraints.t24LockHours,
      overOrderBuffer: clamp(
        override.constraints?.overOrderBuffer ??
          base.constraints.overOrderBuffer,
        0,
        0.2,
      ),
    },
    escalateSpendDeltaPct:
      override.escalateSpendDeltaPct ?? base.escalateSpendDeltaPct,
    escalateDisagreementScore:
      override.escalateDisagreementScore ?? base.escalateDisagreementScore,
    quorum: clamp(override.quorum ?? base.quorum, 0.5, 1),
    targetWastePct: clamp(
      override.targetWastePct ?? base.targetWastePct,
      0,
      0.2,
    ),
    useHistoryAgent: override.useHistoryAgent ?? base.useHistoryAgent,
  };
}
