/** Maestro committee config types and resolver (stub for PurchasingReceiving CommitteeConfigPanel). */

export type CommitteeMode = "dual" | "triple";

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
  escalationSpendDeltaPct: number;
  weights: CommitteeWeights;
}

export const DefaultCommitteeConfig: CommitteeConfig = {
  mode: "dual",
  enforceHardStops: false,
  underOrderThreshold: 0.05,
  escalationSpendDeltaPct: 0.1,
  weights: {
    wCost: 0.2,
    wWaste: 0.2,
    wStockout: 0.2,
    wShelf: 0.15,
    wQc: 0.15,
    wLabor: 0.1,
  },
};

export function resolveCommitteeConfig(options?: {
  overrides?: Partial<CommitteeConfig>;
}): CommitteeConfig {
  const overrides = options?.overrides ?? {};
  return {
    ...DefaultCommitteeConfig,
    ...overrides,
    weights: { ...DefaultCommitteeConfig.weights, ...overrides.weights },
  };
}
