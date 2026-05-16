import React, { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useYieldStore } from "@/context/YieldContext";
import type { ChefYieldRecord } from "@/context/YieldContext";
import { READY_MADE_ITEMS, getReadyMadeItem } from "@/data/readyMadeItems";
import {
  areCompatibleUnits,
  computeYieldPercent,
  formatYieldPercent,
  normalizeUnit as normalizeUnitToken,
} from "@/lib/yield-calculations";
import {
  calculateProcurementPlan,
  type DemandSample,
} from "@/lib/predictive-procurement";

const clampPercent = (value: number): number => Math.max(0, Math.min(9999, value));

const defaultDate = (): string => {
  try {
    return new Date().toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

type YieldLabFormProps = {
  defaultInputQty: number;
  defaultInputUnit: string;
  recipeName: string;
  defaultMethod?: string;
  methodOptions?: string[];
  onClose: () => void;
  item?: string;
};

const inputClass =
  "rounded-md border bg-background px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/40";
const cardClass = "rounded-lg border bg-background/40 p-3";

const displayUnit = (value: string) => normalizeUnitToken(value).toUpperCase();

const formatNumber = (value: number, digits = 0): string => {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const YieldLabForm: React.FC<YieldLabFormProps> = ({
  defaultInputQty,
  defaultInputUnit,
  recipeName,
  defaultMethod = "",
  methodOptions = [],
  onClose,
  item,
}) => {
  const {
    addRecord,
    removeRecord,
    listForIngredient,
    listForMethod,
  } = useYieldStore();

  const [ingredientName, setIngredientName] = useState<string>(item?.trim() || "");
  const [code, setCode] = useState<string>("");
  const [method, setMethod] = useState<string>(defaultMethod.trim());
  const [tester, setTester] = useState<string>("");
  const [testDate, setTestDate] = useState<string>(defaultDate());
  const [inputQty, setInputQty] = useState<number>(
    Number.isFinite(defaultInputQty) && defaultInputQty > 0 ? defaultInputQty : 0,
  );
  const [inputUnit, setInputUnit] = useState<string>(
    displayUnit(defaultInputUnit || "G"),
  );
  const [measuredQty, setMeasuredQty] = useState<number>(0);
  const [measuredUnit, setMeasuredUnit] = useState<string>(
    displayUnit(defaultInputUnit || inputUnit || "G"),
  );
  const [notes, setNotes] = useState<string>("");
  const [itemType, setItemType] = useState<"ingredient" | "readyMade">("ingredient");
  const [readyMadeId, setReadyMadeId] = useState<string>("");
  const [outputPortions, setOutputPortions] = useState<number>(0);
  const [portionSize, setPortionSize] = useState<number>(0);
  const [portionUnit, setPortionUnit] = useState<string>(
    displayUnit(defaultInputUnit || inputUnit || "G"),
  );
  const [forecastPortions, setForecastPortions] = useState<number>(0);
  const [bufferPercent, setBufferPercent] = useState<number>(8);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(2);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedReadyMade = useMemo(
    () => (readyMadeId ? getReadyMadeItem(readyMadeId) : undefined),
    [readyMadeId],
  );

  useEffect(() => {
    if (item && item.trim()) {
      setIngredientName(item.trim());
    }
  }, [item]);

  useEffect(() => {
    setMethod(defaultMethod.trim());
  }, [defaultMethod]);

  useEffect(() => {
    setMeasuredUnit((prev) => prev || inputUnit);
  }, [inputUnit]);

  useEffect(() => {
    if (itemType !== "readyMade") {
      if (!portionUnit.trim()) {
        setPortionUnit(displayUnit(measuredUnit || inputUnit || "G"));
      }
      return;
    }
    const fallback = selectedReadyMade ?? READY_MADE_ITEMS[0];
    if (!fallback) return;
    if (!readyMadeId) setReadyMadeId(fallback.id);
    if (!ingredientName.trim()) setIngredientName(fallback.name);
    if (!method.trim()) setMethod("Ready-made integration");
    if (!inputQty) setInputQty(fallback.standardBatchQty);
    if (!inputUnit.trim()) setInputUnit(displayUnit(fallback.standardBatchUnit));
    if (!portionUnit.trim()) setPortionUnit(displayUnit(fallback.portionUnit));
    if (!portionSize) setPortionSize(fallback.portionSize);
    if (!forecastPortions) setForecastPortions(fallback.defaultPortions);
    if (!leadTimeDays || leadTimeDays <= 0) setLeadTimeDays(fallback.leadTimeDays);
  }, [
    itemType,
    selectedReadyMade,
    readyMadeId,
    ingredientName,
    method,
    inputQty,
    inputUnit,
    portionUnit,
    portionSize,
    forecastPortions,
    leadTimeDays,
    measuredUnit,
  ]);

  const activeIngredient = ingredientName.trim() || recipeName.trim();
  const normalizedInputUnit = normalizeUnitToken(inputUnit);
  const normalizedMeasuredUnit = normalizeUnitToken(measuredUnit);

  const ingredientHistory = useMemo(() => {
    if (!activeIngredient) return [];
    return listForIngredient(activeIngredient);
  }, [activeIngredient, listForIngredient]);

  const methodHistory = useMemo(() => {
    const trimmed = method.trim();
    if (!trimmed) return [];
    return listForMethod(trimmed);
  }, [method, listForMethod]);

  const mergedHistory = useMemo<ChefYieldRecord[]>(() => {
    const combined = [...ingredientHistory, ...methodHistory];
    const unique = new Map<string, ChefYieldRecord>();
    for (const record of combined) {
      if (!unique.has(record.id)) unique.set(record.id, record);
    }
    return Array.from(unique.values()).sort((a, b) => b.recordedAt - a.recordedAt);
  }, [ingredientHistory, methodHistory]);

  const methodSuggestions = useMemo(() => {
    const registry = new Set<string>();
    for (const option of methodOptions) {
      const trimmed = option.trim();
      if (trimmed) registry.add(trimmed);
    }
    for (const record of mergedHistory) {
      const trimmed = record.method?.trim();
      if (trimmed) registry.add(trimmed);
    }
    return Array.from(registry);
  }, [methodOptions, mergedHistory]);

  const computedYield = useMemo(() => {
    if (!Number.isFinite(inputQty) || inputQty <= 0) return null;
    if (!Number.isFinite(measuredQty) || measuredQty < 0) return null;
    if (!inputUnit || !measuredUnit) return null;
    const direct = computeYieldPercent(
      inputQty,
      normalizedInputUnit,
      measuredQty,
      normalizedMeasuredUnit,
    );
    if (direct != null && Number.isFinite(direct)) return clampPercent(direct);
    if (
      normalizedInputUnit === normalizedMeasuredUnit &&
      inputQty !== 0 &&
      Number.isFinite(measuredQty)
    ) {
      return clampPercent((measuredQty / inputQty) * 100);
    }
    if (areCompatibleUnits(inputUnit, measuredUnit) && inputQty !== 0) {
      return clampPercent((measuredQty / inputQty) * 100);
    }
    return null;
  }, [
    inputQty,
    measuredQty,
    inputUnit,
    measuredUnit,
    normalizedInputUnit,
    normalizedMeasuredUnit,
  ]);

  const incompatibleUnits = useMemo(() => {
    if (!inputUnit || !measuredUnit) return false;
    if (computedYield != null) return false;
    if (!Number.isFinite(inputQty) || inputQty <= 0) return false;
    if (!Number.isFinite(measuredQty) || measuredQty <= 0) return false;
    const sameToken = normalizedInputUnit === normalizedMeasuredUnit;
    return !sameToken && !areCompatibleUnits(inputUnit, measuredUnit);
  }, [
    computedYield,
    inputQty,
    measuredQty,
    inputUnit,
    measuredUnit,
    normalizedInputUnit,
    normalizedMeasuredUnit,
  ]);

  const readyMadeHistory = useMemo<DemandSample[]>(() => {
    if (!readyMadeId) return [];
    return mergedHistory
      .filter(
        (record) =>
          record.itemType === "readyMade" &&
          record.readyMadeId === readyMadeId &&
          (record.forecastPortions || record.outputPortions),
      )
      .map((record) => ({
        date: new Date(record.recordedAt).toISOString().slice(0, 10),
        portions: record.forecastPortions ?? record.outputPortions ?? 0,
      }))
      .filter((sample) => sample.portions > 0);
  }, [mergedHistory, readyMadeId]);

  const effectiveYield = useMemo(() => {
    if (computedYield != null) return computedYield;
    if (!readyMadeId) return selectedReadyMade?.defaultYieldPercent ?? null;
    const history = mergedHistory
      .filter(
        (record) =>
          record.itemType === "readyMade" &&
          record.readyMadeId === readyMadeId &&
          record.yieldPercent != null,
      )
      .map((record) => record.yieldPercent as number);
    if (history.length === 0) return selectedReadyMade?.defaultYieldPercent ?? null;
    return history.reduce((acc, value) => acc + value, 0) / history.length;
  }, [computedYield, mergedHistory, readyMadeId, selectedReadyMade]);

  const procurementPreview = useMemo(() => {
    if (itemType !== "readyMade") return null;
    if (effectiveYield == null || effectiveYield <= 0) return null;
    const targetPortionCount = Math.max(forecastPortions, outputPortions);
    if (!Number.isFinite(targetPortionCount) || targetPortionCount <= 0) return null;
    const resolvedPortionSize =
      portionSize > 0
        ? portionSize
        : selectedReadyMade?.portionSize ?? 0;
    const resolvedPortionUnit =
      portionUnit.trim() ||
      selectedReadyMade?.portionUnit ||
      measuredUnit ||
      inputUnit;
    if (!Number.isFinite(resolvedPortionSize) || resolvedPortionSize <= 0) return null;
    return calculateProcurementPlan({
      targetPortions: targetPortionCount,
      portionSize: resolvedPortionSize,
      portionUnit: resolvedPortionUnit,
      expectedYieldPercent: effectiveYield,
      inputUnit: displayUnit(inputUnit),
      shrinkageBufferPercent: bufferPercent,
      leadTimeDays,
      standardBatchQty: selectedReadyMade?.standardBatchQty,
      standardBatchUnit: selectedReadyMade?.standardBatchUnit,
      demandHistory: readyMadeHistory,
    });
  }, [
    itemType,
    effectiveYield,
    forecastPortions,
    outputPortions,
    portionSize,
    portionUnit,
    measuredUnit,
    inputUnit,
    bufferPercent,
    leadTimeDays,
    selectedReadyMade,
    readyMadeHistory,
  ]);

  const yieldDisplay = computedYield == null ? "—" : formatYieldPercent(computedYield);

  const handleClearFilter = () => setMethod("");

  const handleSave = () => {
    const focusIngredient = activeIngredient.trim();
    if (!focusIngredient) {
      setFormError("Enter the ingredient or component this yield represents.");
      return;
    }
    const trimmedMethod = method.trim();
    if (!trimmedMethod) {
      setFormError("Enter the method that was tested before saving.");
      return;
    }
    if (itemType === "readyMade" && !selectedReadyMade) {
      setFormError("Select a ready-made catalog item before saving.");
      return;
    }
    const yieldToPersist = computedYield ?? effectiveYield ?? null;
    if (yieldToPersist == null) {
      setFormError(
        "Enter compatible units or provide ready-made defaults so we can compute the yield %.",
      );
      return;
    }
    addRecord({
      ingredientName: focusIngredient,
      prepDescription: trimmedMethod,
      method: trimmedMethod,
      tester: tester.trim() || undefined,
      testDate: testDate?.trim() || undefined,
      code: code.trim() || undefined,
      notes: notes.trim() || undefined,
      inputQty,
      inputUnit: displayUnit(inputUnit),
      outputQty: measuredQty,
      outputUnit: displayUnit(measuredUnit),
      yieldPercent: yieldToPersist,
      itemType,
      readyMadeId:
        itemType === "readyMade"
          ? readyMadeId || selectedReadyMade?.id || undefined
          : undefined,
      readyMadeName:
        itemType === "readyMade"
          ? selectedReadyMade?.name || focusIngredient
          : undefined,
      outputPortions:
        itemType === "readyMade"
          ? outputPortions || forecastPortions || undefined
          : undefined,
      portionSize:
        itemType === "readyMade"
          ? portionSize || selectedReadyMade?.portionSize || undefined
          : undefined,
      portionUnit:
        itemType === "readyMade"
          ? (portionUnit.trim() ||
              selectedReadyMade?.portionUnit ||
              displayUnit(measuredUnit || inputUnit))
          : undefined,
      batchSize: itemType === "readyMade" ? inputQty : undefined,
      batchUnit:
        itemType === "readyMade" ? displayUnit(inputUnit) : undefined,
      forecastPortions:
        itemType === "readyMade"
          ? forecastPortions || outputPortions || undefined
          : undefined,
      shrinkageBufferPercent:
        itemType === "readyMade" ? bufferPercent : undefined,
      leadTimeDays: itemType === "readyMade" ? leadTimeDays : undefined,
      demandHistory: itemType === "readyMade" ? readyMadeHistory : undefined,
      procurementPlan:
        itemType === "readyMade" ? procurementPreview : null,
    });
    setFormError(null);
    onClose();
  };

  const handleLoadRecord = (record: ChefYieldRecord) => {
    setIngredientName(record.ingredientName);
    setMethod(record.method);
    setTester(record.tester ?? "");
    setTestDate(record.testDate ?? defaultDate());
    setCode(record.code ?? "");
    setInputQty(record.inputQty);
    setInputUnit(displayUnit(record.inputUnit));
    setMeasuredQty(record.outputQty);
    setMeasuredUnit(displayUnit(record.outputUnit));
    setNotes(record.notes ?? "");
    setFormError(null);
  };

  const handleDeleteRecord = (id: string) => {
    removeRecord(id);
  };

  return (
    <div className="space-y-4 text-sm">
      {formError && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-600">
          {formError}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-[minmax(16rem,1fr),minmax(18rem,1fr),minmax(10rem,1fr)]">
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Ingredient / component</span>
          <input
            value={ingredientName}
            onChange={(event) => setIngredientName(event.target.value)}
            className={inputClass}
            placeholder="e.g., Heirloom carrots (peeled)"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Method</span>
          <input
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            className={inputClass}
            list={methodSuggestions.length ? "yield-method-options" : undefined}
            placeholder="e.g., Fire roasted"
          />
          {methodSuggestions.length > 0 && (
            <datalist id="yield-method-options">
              {methodSuggestions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          )}
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Test code</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className={inputClass}
            placeholder="YLD-001"
          />
        </label>
      </div>

      <div className="rounded-lg border border-dashed bg-background/30 p-3">
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <input
            type="checkbox"
            checked={itemType === "readyMade"}
            onChange={(event) =>
              setItemType(event.target.checked ? "readyMade" : "ingredient")
            }
            className="h-4 w-4 rounded border-muted-foreground"
          />
          Link yield to ready-made catalog item
        </label>
        {itemType === "readyMade" && (
          <>
            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(16rem,1fr),minmax(12rem,0.8fr),minmax(10rem,0.6fr)]">
              <label className="grid gap-1">
                <span className="text-xs text-muted-foreground">Catalog item</span>
                <select
                  value={readyMadeId}
                  onChange={(event) => setReadyMadeId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Select ready-made</option>
                  {READY_MADE_ITEMS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-muted-foreground">Forecast portions</span>
                <input
                  type="number"
                  min={0}
                  value={forecastPortions}
                  onChange={(event) => setForecastPortions(Number(event.target.value))}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-muted-foreground">Buffer %</span>
                <input
                  type="number"
                  min={0}
                  value={bufferPercent}
                  onChange={(event) => setBufferPercent(Number(event.target.value))}
                  className={inputClass}
                />
              </label>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[repeat(4,minmax(8rem,1fr))]">
              <label className="grid gap-1">
                <span className="text-xs text-muted-foreground">Measured portions</span>
                <input
                  type="number"
                  min={0}
                  value={outputPortions}
                  onChange={(event) => setOutputPortions(Number(event.target.value))}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-muted-foreground">Portion size</span>
                <input
                  type="number"
                  min={0}
                  value={portionSize}
                  onChange={(event) => setPortionSize(Number(event.target.value))}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-muted-foreground">Portion unit</span>
                <input
                  value={portionUnit}
                  onChange={(event) => setPortionUnit(event.target.value.toUpperCase())}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-muted-foreground">Lead time (days)</span>
                <input
                  type="number"
                  min={0}
                  value={leadTimeDays}
                  onChange={(event) => setLeadTimeDays(Number(event.target.value))}
                  className={inputClass}
                />
              </label>
              <div className="grid gap-1">
                <span className="text-xs text-muted-foreground">Effective yield</span>
                <div className="rounded-md border bg-background px-2 py-2 text-sm font-semibold">
                  {effectiveYield != null ? `${formatYieldPercent(effectiveYield)}%` : "—"}
                </div>
              </div>
            </div>
            {selectedReadyMade?.description && (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {selectedReadyMade.description}
              </p>
            )}
            {procurementPreview && (
              <div className="mt-3 grid gap-2 rounded-md border bg-background/40 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span>Recommended input</span>
                  <span className="font-semibold">
                    {formatNumber(procurementPreview.recommendedInputQty, 2)}
                    {` ${procurementPreview.recommendedInputUnit}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Portions covered</span>
                  <span className="font-semibold">
                    {formatNumber(procurementPreview.expectedPortionsCovered)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Coverage window</span>
                  <span className="font-semibold">
                    {formatNumber(procurementPreview.coverageDays, 1)} days
                  </span>
                </div>
                <div>
                  Next availability {procurementPreview.nextAvailabilityDate || "—"}; review on
                  {" "}
                  {procurementPreview.reviewDate || "—"}.
                </div>
                {procurementPreview.warnings.length > 0 && (
                  <ul className="list-disc space-y-1 pl-4 text-[11px] text-amber-600">
                    {procurementPreview.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(12rem,1fr),minmax(12rem,1fr),minmax(10rem,0.8fr)]">
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Tester</span>
          <input
            value={tester}
            onChange={(event) => setTester(event.target.value)}
            className={inputClass}
            placeholder="Chef's name"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Test date</span>
          <input
            type="date"
            value={testDate}
            onChange={(event) => setTestDate(event.target.value)}
            className={inputClass}
          />
        </label>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Yield %</span>
          <div className="rounded-md border bg-background px-2 py-2 text-sm font-semibold">
            {yieldDisplay}
          </div>
          {incompatibleUnits && (
            <span className="text-xs text-amber-600">
              Enter matching weight or volume units to compute the yield accurately.
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className={cardClass}>
          <div className="text-xs font-semibold uppercase text-muted-foreground">Input</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Quantity</span>
              <input
                type="number"
                value={inputQty}
                onChange={(event) => setInputQty(Number(event.target.value))}
                className={inputClass}
                min={0}
                step="any"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Unit</span>
              <input
                value={inputUnit}
                onChange={(event) => setInputUnit(event.target.value.toUpperCase())}
                className={inputClass}
                placeholder="QTS"
              />
            </label>
          </div>
        </div>
        <div className={cardClass}>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Measured output
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Quantity</span>
              <input
                type="number"
                value={measuredQty}
                onChange={(event) => setMeasuredQty(Number(event.target.value))}
                className={inputClass}
                min={0}
                step="any"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Unit</span>
              <input
                value={measuredUnit}
                onChange={(event) => setMeasuredUnit(event.target.value.toUpperCase())}
                className={inputClass}
                placeholder="L"
              />
            </label>
          </div>
        </div>
      </div>

      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">Notes</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="rounded-md border bg-background px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Observations, prep adjustments, lab commentary"
        />
      </label>

      <div className="flex flex-wrap justify-end gap-3 text-sm">
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-muted-foreground hover:bg-muted"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-md border border-primary bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:opacity-90"
          onClick={handleSave}
        >
          Save test
        </button>
      </div>

      <div className="pt-2">
        <div className="flex items-center justify-between text-xs font-medium">
          <span>Recent chef yields</span>
          {method.trim() && methodHistory.length > 0 && (
            <button
              type="button"
              className="text-muted-foreground underline"
              onClick={handleClearFilter}
            >
              Clear method filter
            </button>
          )}
        </div>
        <div className="mt-2 max-h-56 overflow-auto rounded border">
          {mergedHistory.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No tests logged yet.</div>
          ) : (
            <table className="min-w-full text-xs">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="p-2 text-left">Ingredient</th>
                  <th className="p-2 text-left">Method</th>
                  <th className="p-2 text-left">Tester</th>
                  <th className="p-2 text-left">Input</th>
                  <th className="p-2 text-left">Measured</th>
                  <th className="p-2 text-right">Yield %</th>
                  <th className="p-2 text-right">Recorded</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mergedHistory.map((record) => (
                  <tr key={record.id} className="border-t">
                    <td className="p-2 align-top">{record.ingredientName}</td>
                    <td className="p-2 align-top">{record.method || "—"}</td>
                    <td className="p-2 align-top">{record.tester || "—"}</td>
                    <td className="p-2 align-top">
                      {record.inputQty} {displayUnit(record.inputUnit)}
                    </td>
                    <td className="p-2 align-top">
                      {record.outputQty} {displayUnit(record.outputUnit)}
                    </td>
                    <td className="p-2 text-right align-top">
                      {record.yieldPercent == null
                        ? "—"
                        : formatYieldPercent(record.yieldPercent)}
                    </td>
                    <td className="p-2 text-right align-top text-muted-foreground">
                      {formatDistanceToNow(record.recordedAt, { addSuffix: true })}
                    </td>
                    <td className="p-2 text-right align-top">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="rounded border px-2 py-1 hover:bg-muted"
                          onClick={() => handleLoadRecord(record)}
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          className="rounded border border-destructive px-2 py-1 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteRecord(record.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default YieldLabForm;
