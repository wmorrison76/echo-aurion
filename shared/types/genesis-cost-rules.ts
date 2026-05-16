/**
 * Cost Rules Effective-Dated Types (Patch E)
 * Mirror the vendor-effective-dated pattern for cost attribution rules
 */

export interface CostAttributionRule {
  ruleId: string;
  outletId: string;
  outletName: string;
  attributionMode: "SOURCE_PAYS" | "REQUESTING_OUTLET_PAYS" | "SPLIT";
  splitPercentage?: number;
  priority: number;
}

export interface CostRuleChange {
  changeId: string;
  outletId: string;
  effectiveDateISO: string; // YYYY-MM-DD
  patch: Partial<Omit<CostAttributionRule, "outletId">>;
  memo: string;
  createdAt: string; // ISO
  createdBy?: string;
}

export interface CostRulesVersion {
  versionId: string;
  asOfDateISO: string; // YYYY-MM-DD
  rules: CostAttributionRule[];
  generatedAt: string; // ISO
}
