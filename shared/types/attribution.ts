/**
 * Genesis D — Cost Attribution Canon
 * Determines who pays COGS vs who gets credit (internal revenue / transfer credit),
 * with full audit and override support.
 */

export type CostFlowType =
  | "VENDOR_PURCHASE"
  | "INTERNAL_FULFILLMENT"
  | "INVENTORY_ADJUSTMENT"
  | "TRANSFER";

export type AttributionMode =
  | "RECEIVING_PAYS"
  | "PRODUCER_PAYS"
  | "SPLIT"
  | "CUSTOM";

export type SplitRule = {
  type: "PERCENT" | "FIXED";
  receivingShare: number;
  producerShare: number;
};

export type AttributionScope = {
  receivingLocationId?: string | null;
  producerLocationId?: string | null;

  flowType?: CostFlowType | null;
  vendorId?: string | null;

  ingredientId?: string | null;
  category?: string | null;
};

export type AttributionRule = {
  ruleId: string;
  name: string;

  enabled: boolean;
  priority: number;

  scope: AttributionScope;

  mode: AttributionMode;

  split?: SplitRule | null;

  creditProducer?: boolean;

  note?: string | null;

  createdAtISO: string;
  updatedAtISO: string;
};

export type AttributionDecision = {
  decisionId: string;
  decidedAtISO: string;

  appliedRuleId?: string | null;
  appliedRuleName?: string | null;

  mode: AttributionMode;
  creditProducer: boolean;

  receivingLocationId: string;
  producerLocationId?: string | null;

  totalCost: number;
  receivingCost: number;
  producerCost: number;

  scope: AttributionScope;

  explanation: string;
};

export type RuleChangeAudit = {
  auditId: string;
  changedAtISO: string;
  actorId?: string | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "TOGGLE" | "BULK_IMPORT";
  ruleId: string;
  before?: Partial<AttributionRule> | null;
  after?: Partial<AttributionRule> | null;
  note: string;
};
