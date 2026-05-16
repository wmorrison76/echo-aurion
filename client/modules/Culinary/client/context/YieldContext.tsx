import React from "react";
import {
  collectPrepTokens,
  computeYieldPercent,
  createIngredientKey,
  createMethodKey,
  createPrepKey,
  extractIngredientMetadata,
  formatYieldPercent,
} from "@/lib/yield-calculations";
import type {
  DemandSample,
  ProcurementPlan,
} from "@/lib/predictive-procurement";

export type ChefYieldRecord = {
  id: string;
  ingredientName: string;
  ingredientKey: string;
  ingredientTokens: string[];
  prepDescription: string;
  prepKey: string;
  prepTokens: string[];
  method: string;
  methodKey: string;
  itemType: "ingredient" | "readyMade";
  readyMadeId?: string;
  readyMadeName?: string;
  tester?: string;
  testDate?: string;
  code?: string;
  notes?: string;
  inputQty: number;
  inputUnit: string;
  outputQty: number;
  outputUnit: string;
  outputPortions?: number;
  portionSize?: number;
  portionUnit?: string;
  batchSize?: number;
  batchUnit?: string;
  forecastPortions?: number;
  shrinkageBufferPercent?: number;
  leadTimeDays?: number;
  demandHistory?: DemandSample[];
  procurementPlan?: ProcurementPlan | null;
  yieldPercent: number | null;
  recordedAt: number;
};

type ChefYieldInput = {
  ingredientName: string;
  prepDescription?: string;
  method?: string;
  tester?: string;
  testDate?: string;
  code?: string;
  notes?: string;
  inputQty: number;
  inputUnit: string;
  outputQty: number;
  outputUnit: string;
  yieldPercent?: number | null;
  itemType?: "ingredient" | "readyMade";
  readyMadeId?: string;
  readyMadeName?: string;
  outputPortions?: number;
  portionSize?: number;
  portionUnit?: string;
  batchSize?: number;
  batchUnit?: string;
  forecastPortions?: number;
  shrinkageBufferPercent?: number;
  leadTimeDays?: number;
  demandHistory?: DemandSample[];
  procurementPlan?: ProcurementPlan | null;
};

type YieldQuery = {
  item: string;
  prep?: string;
  method?: string;
};

type ChefYieldMatch = {
  percent: number | null;
  method: string;
  note?: string;
  recordId: string;
  recordedAt: number;
};

type YieldStore = {
  records: ChefYieldRecord[];
  addRecord: (input: ChefYieldInput) => ChefYieldRecord;
  removeRecord: (id: string) => void;
  clearRecords: () => void;
  findBestMatch: (query: YieldQuery) => ChefYieldMatch | null;
  listForIngredient: (item: string) => ChefYieldRecord[];
  listForMethod: (method: string) => ChefYieldRecord[];
};

const STORAGE_KEY = "lab.yield.records.v1";

function clampPercent(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(9999, value));
}

function readFromStorage(): ChefYieldRecord[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => ({
        ...entry,
        itemType: entry.itemType === "readyMade" ? "readyMade" : "ingredient",
        readyMadeId: entry.readyMadeId ?? undefined,
        readyMadeName: entry.readyMadeName ?? undefined,
        outputPortions: toNumberOrUndefined(entry.outputPortions),
        portionSize: toNumberOrUndefined(entry.portionSize),
        portionUnit:
          typeof entry.portionUnit === "string"
            ? String(entry.portionUnit).trim().toUpperCase()
            : undefined,
        batchSize: toNumberOrUndefined(entry.batchSize),
        batchUnit:
          typeof entry.batchUnit === "string"
            ? String(entry.batchUnit).trim().toUpperCase()
            : undefined,
        forecastPortions: toNumberOrUndefined(entry.forecastPortions),
        shrinkageBufferPercent: toNumberOrUndefined(entry.shrinkageBufferPercent),
        leadTimeDays: toNumberOrUndefined(entry.leadTimeDays),
        demandHistory: Array.isArray(entry.demandHistory)
          ? entry.demandHistory
              .map((sample: DemandSample) => ({
                date: String(sample.date),
                portions: Number(sample.portions) || 0,
              }))
              .filter((sample: DemandSample) => sample.date.length >= 8)
          : undefined,
        procurementPlan: entry.procurementPlan ?? null,
        inputUnit:
          typeof entry.inputUnit === "string"
            ? String(entry.inputUnit).trim().toUpperCase()
            : "",
        outputUnit:
          typeof entry.outputUnit === "string"
            ? String(entry.outputUnit).trim().toUpperCase()
            : "",
        recordedAt: Number(entry.recordedAt ?? Date.now()),
        yieldPercent: clampPercent(entry.yieldPercent),
      }))
      .filter((entry) => typeof entry.id === "string" && entry.id.length > 0);
  } catch (error) {
    console.warn("Failed to read yield records", error);
    return [];
  }
}

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value == null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function writeToStorage(records: ChefYieldRecord[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.warn("Failed to persist yield records", error);
  }
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function intersectionSize(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  return a.reduce((acc, token) => (setB.has(token) ? acc + 1 : acc), 0);
}

const YieldContext = React.createContext<YieldStore | null>(null);

export function YieldProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = React.useState<ChefYieldRecord[]>(() =>
    readFromStorage(),
  );

  React.useEffect(() => {
    writeToStorage(records);
  }, [records]);

  const addRecord = React.useCallback((input: ChefYieldInput) => {
    const ingredientName = input.ingredientName.trim();
    const prepDescription = input.prepDescription?.trim() ?? "";
    const method = input.method?.trim() ?? prepDescription;
    const ingredientMeta = extractIngredientMetadata(ingredientName);
    const prepTokens = collectPrepTokens(ingredientName, prepDescription);
    const methodKey = createMethodKey(method);
    const prepKey = createPrepKey(prepDescription);
    const ingredientKey = createIngredientKey(ingredientName);
    const itemType: "ingredient" | "readyMade" =
      input.itemType === "readyMade" ? "readyMade" : "ingredient";
    const readyMadeName =
      itemType === "readyMade"
        ? input.readyMadeName?.trim() || ingredientName
        : undefined;
    const computedPercent =
      input.yieldPercent != null
        ? clampPercent(input.yieldPercent)
        : computeYieldPercent(
            Number(input.inputQty),
            input.inputUnit,
            Number(input.outputQty),
            input.outputUnit,
          );

    const record: ChefYieldRecord = {
      id: uid(),
      ingredientName,
      ingredientKey,
      ingredientTokens: ingredientMeta.tokens,
      prepDescription,
      prepKey,
      prepTokens,
      method,
      methodKey,
      itemType,
      readyMadeId: input.readyMadeId?.trim() || undefined,
      readyMadeName,
      tester: input.tester?.trim() || undefined,
      testDate: input.testDate?.trim() || undefined,
      code: input.code?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      inputQty: Number(input.inputQty) || 0,
      inputUnit: input.inputUnit.trim().toUpperCase(),
      outputQty: Number(input.outputQty) || 0,
      outputUnit: input.outputUnit.trim().toUpperCase(),
      outputPortions: toNumberOrUndefined(input.outputPortions),
      portionSize: toNumberOrUndefined(input.portionSize),
      portionUnit: input.portionUnit?.trim().toUpperCase() || undefined,
      batchSize: toNumberOrUndefined(input.batchSize),
      batchUnit: input.batchUnit?.trim().toUpperCase() || undefined,
      forecastPortions: toNumberOrUndefined(input.forecastPortions),
      shrinkageBufferPercent: toNumberOrUndefined(input.shrinkageBufferPercent),
      leadTimeDays: toNumberOrUndefined(input.leadTimeDays),
      demandHistory: input.demandHistory,
      procurementPlan: input.procurementPlan ?? null,
      yieldPercent: computedPercent,
      recordedAt: Date.now(),
    };

    setRecords((prev) => [record, ...prev].slice(0, 500));
    return record;
  }, []);

  const removeRecord = React.useCallback((id: string) => {
    setRecords((prev) => prev.filter((record) => record.id !== id));
  }, []);

  const clearRecords = React.useCallback(() => {
    setRecords([]);
  }, []);

  const findBestMatch = React.useCallback(
    (query: YieldQuery): ChefYieldMatch | null => {
      if (!records.length) return null;
      const meta = extractIngredientMetadata(query.item);
      const prepTokens = collectPrepTokens(query.item, query.prep ?? "");
      const prepKey = createPrepKey(query.prep ?? "");
      const methodKey = createMethodKey(query.method ?? query.prep ?? "");
      let bestScore = 0;
      let bestRecord: ChefYieldRecord | null = null;
      const now = Date.now();

      for (const record of records) {
        if (!record.yieldPercent && record.yieldPercent !== 0) continue;
        let score = 0;

        const sharedName = intersectionSize(meta.tokens, record.ingredientTokens);
        score += sharedName * 6;
        if (record.ingredientKey === meta.key && meta.key) score += 8;
        const sharedDescriptors = intersectionSize(prepTokens, record.prepTokens);
        score += sharedDescriptors * 3;
        if (record.prepKey && record.prepKey === prepKey && prepKey) score += 5;
        if (record.methodKey && record.methodKey === methodKey && methodKey)
          score += 6;
        else if (
          record.methodKey &&
          methodKey &&
          (methodKey.includes(record.methodKey) ||
            record.methodKey.includes(methodKey))
        )
          score += 3;

        // recency boost (max +4 within 18 months)
        const ageDays = (now - record.recordedAt) / 86400000;
        const recencyBoost = Math.max(0, 4 - ageDays / 180);
        score += recencyBoost;

        if (score > bestScore) {
          bestScore = score;
          bestRecord = record;
        }
      }

      if (!bestRecord || bestScore < 6) return null;
      return {
        percent: bestRecord.yieldPercent,
        method: bestRecord.method,
        note:
          bestRecord.notes ||
          (bestRecord.yieldPercent != null
            ? `${formatYieldPercent(bestRecord.yieldPercent)}% recorded`
            : undefined),
        recordId: bestRecord.id,
        recordedAt: bestRecord.recordedAt,
      };
    },
    [records],
  );

  const listForIngredient = React.useCallback(
    (item: string) => {
      if (!records.length) return [];
      const meta = extractIngredientMetadata(item);
      return records
        .filter((record) => {
          if (record.ingredientKey === meta.key) return true;
          const shared = intersectionSize(meta.tokens, record.ingredientTokens);
          return shared >= Math.min(2, meta.tokens.length);
        })
        .sort((a, b) => b.recordedAt - a.recordedAt);
    },
    [records],
  );

  const listForMethod = React.useCallback(
    (method: string) => {
      if (!records.length) return [];
      const key = createMethodKey(method);
      return records
        .filter((record) =>
          record.methodKey
            ? record.methodKey === key || record.method.includes(method)
            : false,
        )
        .sort((a, b) => b.recordedAt - a.recordedAt);
    },
    [records],
  );

  const value = React.useMemo<YieldStore>(
    () => ({
      records,
      addRecord,
      removeRecord,
      clearRecords,
      findBestMatch,
      listForIngredient,
      listForMethod,
    }),
    [
      records,
      addRecord,
      removeRecord,
      clearRecords,
      findBestMatch,
      listForIngredient,
      listForMethod,
    ],
  );

  return <YieldContext.Provider value={value}>{children}</YieldContext.Provider>;
}

export function useYieldStore() {
  const ctx = React.useContext(YieldContext);
  if (!ctx) throw new Error("useYieldStore must be used within YieldProvider");
  return ctx;
}

export function useOptionalYieldStore() {
  return React.useContext(YieldContext);
}

export type { ChefYieldInput, ChefYieldMatch, YieldQuery, YieldStore };
