import { DefaultCommitteeConfig } from "./types";
import type { CommitteeConfig, CommitteeMode, CommitteeWeights } from "./types";
function readEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process?.env && key in process.env) {
    const value = process.env[key];
    if (value != null) return value;
  }
  try {
    const meta = (
      import.meta as unknown as { env?: Record<string, string | undefined> }
    )?.env;
    if (meta && key in meta) {
      return meta[key];
    }
  } catch {
    /* no-op */
  }
  return undefined;
}
function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  return /^(1|true|yes|on)$/i.test(value.trim());
}
function parseNumber(value: string | undefined, fallback: number): number {
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function parseMode(
  value: string | undefined,
  fallback: CommitteeMode,
): CommitteeMode {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "dual" || normalized === "triple") {
    return normalized;
  }
  return fallback;
}
function parseWeights(
  overrides: Partial<CommitteeWeights> | undefined,
): CommitteeWeights {
  const base = DefaultCommitteeConfig.weights;
  return {
    wCost: overrides?.wCost ?? base.wCost,
    wWaste: overrides?.wWaste ?? base.wWaste,
    wStockout: overrides?.wStockout ?? base.wStockout,
    wShelf: overrides?.wShelf ?? base.wShelf,
    wQc: overrides?.wQc ?? base.wQc,
    wLabor: overrides?.wLabor ?? base.wLabor,
  };
}
export interface ResolveCommitteeConfigOptions {
  overrides?: Partial<CommitteeConfig>;
}
export function resolveCommitteeConfig(
  options?: ResolveCommitteeConfigOptions,
): CommitteeConfig {
  const envMode = readEnv("VITE_MAESTRO_COMMITTEE_MODE");
  const envHardStops = readEnv("VITE_MAESTRO_COMMITTEE_ENFORCE_HARD_STOPS");
  const envUnderOrder = readEnv("VITE_MAESTRO_COMMITTEE_UNDER_ORDER_THRESHOLD");
  const envEscalation = readEnv("VITE_MAESTRO_COMMITTEE_ESCALATION_DELTA_PCT");
  const weightKeys: Array<[keyof CommitteeWeights, string]> = [
    ["wCost", "VITE_MAESTRO_WEIGHT_COST"],
    ["wWaste", "VITE_MAESTRO_WEIGHT_WASTE"],
    ["wStockout", "VITE_MAESTRO_WEIGHT_STOCKOUT"],
    ["wShelf", "VITE_MAESTRO_WEIGHT_SHELF"],
    ["wQc", "VITE_MAESTRO_WEIGHT_QC"],
    ["wLabor", "VITE_MAESTRO_WEIGHT_LABOR"],
  ];
  const envWeights: Partial<CommitteeWeights> = {};
  for (const [key, envKey] of weightKeys) {
    const raw = readEnv(envKey);
    if (raw != null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        envWeights[key] = parsed;
      }
    }
  }
  const mergedOverrides = options?.overrides ?? {};
  const config: CommitteeConfig = {
    ...DefaultCommitteeConfig,
    ...mergedOverrides,
    mode: parseMode(
      envMode,
      mergedOverrides.mode ?? DefaultCommitteeConfig.mode,
    ),
    enforceHardStops: parseBoolean(
      envHardStops,
      mergedOverrides.enforceHardStops ??
        DefaultCommitteeConfig.enforceHardStops,
    ),
    underOrderThreshold: parseNumber(
      envUnderOrder,
      mergedOverrides.underOrderThreshold ??
        DefaultCommitteeConfig.underOrderThreshold,
    ),
    escalationSpendDeltaPct: parseNumber(
      envEscalation,
      mergedOverrides.escalationSpendDeltaPct ??
        DefaultCommitteeConfig.escalationSpendDeltaPct,
    ),
    weights: parseWeights({
      ...envWeights,
      ...(mergedOverrides.weights ?? {}),
    }),
  };
  if (mergedOverrides.normalizers) {
    config.normalizers = { ...(mergedOverrides.normalizers ?? {}) };
  }
  if (mergedOverrides.logger) {
    config.logger = mergedOverrides.logger;
  }
  return config;
}
