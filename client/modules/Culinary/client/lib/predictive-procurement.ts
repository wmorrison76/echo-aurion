import { convertToBaseUnit, normalizeUnit } from "@/lib/yield-calculations";

export type DemandSample = {
  date: string;
  portions: number;
};

export type ProcurementPlan = {
  recommendedInputQty: number;
  recommendedInputUnit: string;
  recommendedBatches: number;
  expectedPortionsCovered: number;
  coverageDays: number;
  bufferPercent: number;
  averageDailyDemand: number;
  warnings: string[];
  nextAvailabilityDate?: string;
  reviewDate?: string;
};

type ProcurementParams = {
  targetPortions: number;
  portionSize: number;
  portionUnit: string;
  expectedYieldPercent: number;
  inputUnit: string;
  shrinkageBufferPercent?: number;
  leadTimeDays?: number;
  standardBatchQty?: number;
  standardBatchUnit?: string;
  demandHistory?: DemandSample[];
};

const DAY_MS = 86_400_000;

export function calculateProcurementPlan({
  targetPortions,
  portionSize,
  portionUnit,
  expectedYieldPercent,
  inputUnit,
  shrinkageBufferPercent = 5,
  leadTimeDays = 2,
  standardBatchQty,
  standardBatchUnit,
  demandHistory = [],
}: ProcurementParams): ProcurementPlan | null {
  if (!Number.isFinite(targetPortions) || targetPortions <= 0) return null;
  if (!Number.isFinite(portionSize) || portionSize <= 0) return null;
  if (!Number.isFinite(expectedYieldPercent) || expectedYieldPercent <= 0) return null;

  const normalizedPortionUnit = normalizeUnit(portionUnit || "");
  const portionBase = convertToBaseUnit(portionSize, normalizedPortionUnit);
  const inputBase = convertToBaseUnit(1, inputUnit);
  if (!portionBase || !inputBase) return null;
  if (portionBase.dimension !== inputBase.dimension)
    return {
      recommendedInputQty: Math.round((targetPortions * portionSize) / (expectedYieldPercent / 100)),
      recommendedInputUnit: inputUnit.toUpperCase(),
      recommendedBatches: 1,
      expectedPortionsCovered: Math.round(targetPortions),
      coverageDays: estimateCoverageDays(targetPortions, demandHistory),
      bufferPercent: shrinkageBufferPercent,
      averageDailyDemand: computeAverageDailyDemand(demandHistory),
      warnings: [
        "Portion units do not match input units. Recommendation is based on direct ratio without conversion.",
      ],
      nextAvailabilityDate: formatDate(Date.now() + leadTimeDays * DAY_MS),
      reviewDate: formatDate(Date.now() + Math.max(leadTimeDays - 1, 1) * DAY_MS),
    };

  const requiredOutputBase = portionBase.value * targetPortions;
  const requiredInputBase = requiredOutputBase / (expectedYieldPercent / 100);
  const requiredInputQty = requiredInputBase / inputBase.value;
  const recommendedInputQty = requiredInputQty * (1 + shrinkageBufferPercent / 100);

  const batchUnit = standardBatchUnit || inputUnit;
  const batchQty = standardBatchQty || 0;
  const recommendedBatches = batchQty > 0 ? Math.max(1, Math.ceil(recommendedInputQty / batchQty)) : 1;

  const yieldFactor = expectedYieldPercent / 100;
  const totalOutputBase = recommendedInputQty * inputBase.value * yieldFactor;
  const expectedPortionsCovered = Math.floor(totalOutputBase / portionBase.value);

  const averageDailyDemand = computeAverageDailyDemand(demandHistory);
  const coverageDays = averageDailyDemand > 0 ? expectedPortionsCovered / averageDailyDemand : 0;

  return {
    recommendedInputQty: roundToPrecision(recommendedInputQty, 3),
    recommendedInputUnit: inputUnit.toUpperCase(),
    recommendedBatches,
    expectedPortionsCovered,
    coverageDays: roundToPrecision(coverageDays, 2),
    bufferPercent: shrinkageBufferPercent,
    averageDailyDemand,
    warnings: [],
    nextAvailabilityDate: formatDate(Date.now() + leadTimeDays * DAY_MS),
    reviewDate: formatDate(Date.now() + Math.max(leadTimeDays - 1, 1) * DAY_MS),
  };
}

function computeAverageDailyDemand(samples: DemandSample[]): number {
  if (!samples.length) return 0;
  const totals = new Map<string, number>();
  for (const sample of samples) {
    const key = sample.date.slice(0, 10);
    totals.set(key, (totals.get(key) ?? 0) + Math.max(sample.portions, 0));
  }
  const values = Array.from(totals.values());
  if (!values.length) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return roundToPrecision(sum / values.length, 2);
}

function estimateCoverageDays(portions: number, samples: DemandSample[]): number {
  const averageDaily = computeAverageDailyDemand(samples);
  if (averageDaily <= 0) return 0;
  return roundToPrecision(portions / averageDaily, 2);
}

function roundToPrecision(value: number, precision: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function formatDate(timestamp: number): string {
  try {
    return new Date(timestamp).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}
