import { useMemo } from "react";
import { useYieldStore } from "@/context/YieldContext";

export type YieldTimelinePoint = {
  date: string;
  yieldPercent: number | null;
  itemType: "ingredient" | "readyMade";
  label: string;
};

export type IngredientYieldSummary = {
  id: string;
  name: string;
  tests: number;
  averageYield: number;
  lastRecordedAt: number;
};

export type ReadyMadeSummary = {
  id: string;
  name: string;
  tests: number;
  averageYield: number;
  averagePortions?: number;
  typicalBatch?: number;
  typicalBatchUnit?: string;
  lastRecordedAt: number;
};

export type YieldAnalytics = {
  totalRecords: number;
  averageYield: number;
  trailing30DayAverage: number;
  uniqueIngredients: number;
  readyMadeCoverage: number;
  timeline: YieldTimelinePoint[];
  topIngredients: IngredientYieldSummary[];
  readyMadeSummaries: ReadyMadeSummary[];
};

const DAY_MS = 86_400_000;

export function useYieldAnalytics(): YieldAnalytics {
  const { records } = useYieldStore();

  return useMemo(() => {
    if (!records.length) {
      return {
        totalRecords: 0,
        averageYield: 0,
        trailing30DayAverage: 0,
        uniqueIngredients: 0,
        readyMadeCoverage: 0,
        timeline: [],
        topIngredients: [],
        readyMadeSummaries: [],
      } satisfies YieldAnalytics;
    }

    const totalYield = records.reduce((acc, record) => {
      if (record.yieldPercent == null) return acc;
      return acc + record.yieldPercent;
    }, 0);

    const yieldCount = records.reduce((acc, record) => {
      if (record.yieldPercent == null) return acc;
      return acc + 1;
    }, 0);

    const averageYield = yieldCount > 0 ? totalYield / yieldCount : 0;

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * DAY_MS;
    const trailing = records.filter(
      (record) => record.recordedAt >= thirtyDaysAgo && record.yieldPercent != null,
    );
    const trailingAverage =
      trailing.length > 0
        ?
            trailing.reduce((acc, record) => acc + (record.yieldPercent ?? 0), 0) /
          trailing.length
        : 0;

    const ingredientTotals = new Map<string, { name: string; tests: number; yield: number; last: number }>();
    const readyMadeTotals = new Map<
      string,
      {
        name: string;
        tests: number;
        yield: number;
        portions: number;
        batches: number;
        batchUnit?: string;
        last: number;
      }
    >();

    for (const record of records) {
      const key = record.ingredientKey || record.ingredientName;
      const current = ingredientTotals.get(key) ?? {
        name: record.ingredientName,
        tests: 0,
        yield: 0,
        last: 0,
      };
      ingredientTotals.set(key, {
        name: record.ingredientName,
        tests: current.tests + 1,
        yield: current.yield + (record.yieldPercent ?? 0),
        last: Math.max(current.last, record.recordedAt),
      });

      if (record.itemType === "readyMade" && record.readyMadeId) {
        const ready = readyMadeTotals.get(record.readyMadeId) ?? {
          name: record.readyMadeName ?? record.ingredientName,
          tests: 0,
          yield: 0,
          portions: 0,
          batches: 0,
          batchUnit: record.batchUnit,
          last: 0,
        };
        readyMadeTotals.set(record.readyMadeId, {
          name: record.readyMadeName ?? record.ingredientName,
          tests: ready.tests + 1,
          yield: ready.yield + (record.yieldPercent ?? 0),
          portions: ready.portions + (record.outputPortions ?? 0),
          batches: ready.batches + (record.batchSize ?? 0),
          batchUnit: record.batchUnit ?? ready.batchUnit,
          last: Math.max(ready.last, record.recordedAt),
        });
      }
    }

    const timeline = records
      .map<YieldTimelinePoint>((record) => ({
        date: new Date(record.recordedAt).toISOString(),
        yieldPercent: record.yieldPercent,
        itemType: record.itemType,
        label: record.method || record.readyMadeName || record.ingredientName,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const topIngredients = Array.from(ingredientTotals.entries())
      .map<IngredientYieldSummary>(([id, value]) => ({
        id,
        name: value.name,
        tests: value.tests,
        averageYield: value.tests > 0 ? value.yield / value.tests : 0,
        lastRecordedAt: value.last,
      }))
      .sort((a, b) => {
        if (b.tests === a.tests) return b.averageYield - a.averageYield;
        return b.tests - a.tests;
      })
      .slice(0, 6);

    const readyMadeSummaries = Array.from(readyMadeTotals.entries())
      .map<ReadyMadeSummary>(([id, value]) => ({
        id,
        name: value.name,
        tests: value.tests,
        averageYield: value.tests > 0 ? value.yield / value.tests : 0,
        averagePortions: value.tests > 0 ? value.portions / value.tests : undefined,
        typicalBatch: value.tests > 0 ? value.batches / value.tests : undefined,
        typicalBatchUnit: value.batchUnit,
        lastRecordedAt: value.last,
      }))
      .sort((a, b) => b.tests - a.tests);

    const readyMadeCoverage = readyMadeSummaries.length;

    return {
      totalRecords: records.length,
      averageYield,
      trailing30DayAverage: trailingAverage,
      uniqueIngredients: ingredientTotals.size,
      readyMadeCoverage,
      timeline,
      topIngredients,
      readyMadeSummaries,
    } satisfies YieldAnalytics;
  }, [records]);
}
