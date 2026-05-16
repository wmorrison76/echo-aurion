import { GripVertical, Link2, MinusCircle, PlusCircle, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "@/context/LanguageContext";
import type { SupplierQuoteMap } from "@/hooks/use-supplier-quotes";
import type { SupplierQuote } from "@/lib/supplier-pricing";
import type { IngredientRow } from "@/types/ingredients";
import { IngredientSelector } from "@/components/IngredientSelector";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getCurrentCostPerUnit } from "@/data/inventoryItems";
import { enrichIngredientWithYield, getYieldMethodsForIngredient } from "@/lib/yield-lookup";
import { isMisspelled } from "@/lib/culinary-fuzzy-match";

type IngredientsGridProps = {
  isDarkMode: boolean;
  ingredients: IngredientRow[];
  currencySymbol: string;
  totalCost: number;
  theoreticalVolumeLabel: string;
  activeCount: number;
  averageYield: number | null;
  methodOptions: string[];
  methodOptionsId: string;
  onFieldChange: (
    index: number,
    field: keyof IngredientRow,
  ) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFieldBlur: (
    index: number,
    field: "yield" | "cost",
  ) => (event: React.FocusEvent<HTMLInputElement>) => void;
  onAddRow: (index?: number) => void;
  onRemoveRow: (index: number) => void;
  onReorderRow: (from: number, to: number) => void;
  onGridKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onAddSubRecipe: () => void;
  onAddDivider: () => void;
  supplierQuotes?: SupplierQuoteMap;
  onApplySupplierQuote?: (index: number, quote: SupplierQuote) => void;
  onIngredientSelected?: (
    index: number,
    inventoryId: string,
    inventoryItem: any,
  ) => void;
};

const inputTone = (
  isDark: boolean,
  extra?: string,
  alignRight?: boolean,
  disabled?: boolean,
) =>
  `w-full rounded-lg border px-2.5 py-1.5 text-sm ${alignRight ? "text-right" : ""} ${
    isDark
      ? "border-[#c8a97e]/25 bg-slate-900/70 text-white/80 placeholder-[#c8a97e]/40 focus:ring-[#c8a97e]/60 focus:ring-offset-slate-950"
      : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:ring-sky-300/60 focus:ring-offset-white"
  } focus:outline-none focus:ring-2 focus:ring-offset-1 ${extra ?? ""} ${
    disabled ? "opacity-60" : ""
  }`;

const IngredientsGrid: React.FC<IngredientsGridProps> = ({
  isDarkMode,
  ingredients,
  currencySymbol,
  totalCost,
  theoreticalVolumeLabel,
  activeCount,
  averageYield,
  methodOptions,
  methodOptionsId,
  onFieldChange,
  onFieldBlur,
  onAddRow,
  onRemoveRow,
  onReorderRow,
  onGridKeyDown,
  onAddSubRecipe,
  onAddDivider,
  supplierQuotes,
  onApplySupplierQuote,
  onIngredientSelected,
}) => {
  const { t } = useTranslation();
  const [selectedSelectorRow, setSelectedSelectorRow] = useState<number | null>(null);
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState<number | null>(null);
  const [misspelledIngredients, setMisspelledIngredients] = useState<Set<number>>(new Set());

  // Inline fuzzy search state
  const [fuzzyResults, setFuzzyResults] = useState<any[]>([]);
  const [fuzzyActiveRow, setFuzzyActiveRow] = useState<number | null>(null);
  const [fuzzyHighlight, setFuzzyHighlight] = useState<number>(-1);
  const fuzzyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fuzzyDropdownRef = useRef<HTMLDivElement | null>(null);

  const doFuzzySearch = useCallback(async (query: string, rowIndex: number) => {
    if (!query || query.trim().length < 1) {
      setFuzzyResults([]);
      setFuzzyActiveRow(null);
      return;
    }
    try {
      // Call yield DB, ordering search, and vendor-invoice SKU lookup in parallel.
      // Vendor SKUs surface live invoice pricing so the recipe row can autofill cost
      // from the most recent invoice (iter253 / vendor_skus collection).
      const [yieldRes, orderRes, skuRes] = await Promise.all([
        fetch(`/api/yields/search?q=${encodeURIComponent(query)}&limit=8`).catch(() => null),
        fetch(`/api/ordering/search-ingredients?q=${encodeURIComponent(query)}&limit=5`).catch(() => null),
        fetch(`/api/vendor-skus/lookup?q=${encodeURIComponent(query)}&limit=6`, { credentials: "include" }).catch(() => null),
      ]);

      const yieldData = yieldRes?.ok ? await yieldRes.json() : { results: [] };
      const orderData = orderRes?.ok ? await orderRes.json() : { results: [] };
      const skuData = skuRes?.ok ? await skuRes.json() : { matches: [] };

      // Yield DB items are primary — mark them with _fromYieldDb
      const yieldItems = (yieldData.results || []).map((item: any) => ({
        ...item,
        id: item.id || `yield-${item.name}`,
        _fromYieldDb: true,
      }));

      // Ordering items as fallback (skip duplicates already in yield DB)
      const yieldNames = new Set(yieldItems.map((y: any) => y.name.toLowerCase()));
      const orderItems = (orderData.results || [])
        .filter((item: any) => !yieldNames.has((item.name || "").toLowerCase()))
        .map((item: any) => ({ ...item, _fromYieldDb: false }));

      // Vendor SKU rows: live invoice pricing. Normalize to the dropdown shape so
      // the existing renderer + selectFuzzyItem can consume them via _fromVendorSku.
      const skuItems = (skuData.matches || []).map((sku: any) => ({
        id: `sku-${sku.id}`,
        name: sku.description,
        unit: sku.current_uom || "EA",
        unit_cost: Number(sku.current_unit_price) || 0,
        category: sku.vendor_name,
        vendor_name: sku.vendor_name,
        vendor_sku: sku.item_code || sku.id,
        pack_size: sku.pack_size,
        last_invoice_number: sku.last_invoice_number,
        last_invoice_date: sku.last_invoice_date,
        _fromVendorSku: true,
      }));

      const merged = [...yieldItems, ...orderItems, ...skuItems].slice(0, 12);
      setFuzzyResults(merged);
      setFuzzyActiveRow(rowIndex);
      setFuzzyHighlight(-1);
    } catch { /* ignore */ }
  }, []);

  const selectFuzzyItem = useCallback((rowIndex: number, item: any) => {
    // Auto-fill ingredient name
    onFieldChange(rowIndex, "item")({
      target: { value: item.name },
    } as React.ChangeEvent<HTMLInputElement>);

    const qty = parseFloat(String(ingredients[rowIndex]?.qty).replace(/[^0-9.]/g, "")) || 1;

    if (item._fromYieldDb) {
      // ── Yield DB item: auto-fill yield %, unit, and cost from yield data ──
      if (item.yield_pct != null) {
        onFieldChange(rowIndex, "yield")({
          target: { value: String(item.yield_pct) },
        } as React.ChangeEvent<HTMLInputElement>);
      }
      if (item.unit) {
        onFieldChange(rowIndex, "unit")({
          target: { value: item.unit.toUpperCase() },
        } as React.ChangeEvent<HTMLInputElement>);
      }
      // Calculate cost: qty × AP cost per unit
      if (item.ap_cost_lb != null && item.ap_cost_lb > 0) {
        const totalCost = qty * item.ap_cost_lb;
        onFieldChange(rowIndex, "cost")({
          target: { value: totalCost.toFixed(2) },
        } as React.ChangeEvent<HTMLInputElement>);
      }
    } else if (item._fromVendorSku) {
      // ── Vendor SKU item: live pricing pulled from the most recent invoice ──
      if (item.unit) {
        onFieldChange(rowIndex, "unit")({
          target: { value: String(item.unit).toUpperCase() },
        } as React.ChangeEvent<HTMLInputElement>);
      }
      if (typeof item.unit_cost === "number" && item.unit_cost > 0) {
        const totalCost = qty * item.unit_cost;
        onFieldChange(rowIndex, "cost")({
          target: { value: totalCost.toFixed(2) },
        } as React.ChangeEvent<HTMLInputElement>);
      }
      // Stash supplier provenance on the row (these fields exist on IngredientRow).
      if (item.vendor_name) {
        onFieldChange(rowIndex, "supplierName")({
          target: { value: item.vendor_name },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
      }
      if (item.vendor_sku) {
        onFieldChange(rowIndex, "supplierSku")({
          target: { value: String(item.vendor_sku) },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
      }
      // costPerUnit is a numeric field on the row; surface it for downstream costing.
      if (typeof item.unit_cost === "number" && item.unit_cost > 0) {
        onFieldChange(rowIndex, "costPerUnit")({
          target: { value: item.unit_cost },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
      }
    } else {
      // ── Ordering/inventory item: use unit_cost ──
      if (item.unit_cost && item.unit_cost > 0) {
        const totalCost = qty * item.unit_cost;
        onFieldChange(rowIndex, "cost")({
          target: { value: totalCost.toFixed(2) },
        } as React.ChangeEvent<HTMLInputElement>);
      }
      if (item.unit) {
        onFieldChange(rowIndex, "unit")({
          target: { value: item.unit.toUpperCase() },
        } as React.ChangeEvent<HTMLInputElement>);
      }
    }

    // Clear fuzzy dropdown
    setFuzzyResults([]);
    setFuzzyActiveRow(null);
  }, [onFieldChange, ingredients]);

  // Close fuzzy dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fuzzyDropdownRef.current && !fuzzyDropdownRef.current.contains(e.target as Node)) {
        setFuzzyResults([]);
        setFuzzyActiveRow(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleIngredientSelect = (index: number, inventoryId: string, inventoryItem: any) => {
    try {
      // Update the ingredient item name from inventory
      onFieldChange(index, "item")({
        target: { value: inventoryItem.canonicalName || inventoryItem.name || inventoryItem.id },
      } as React.ChangeEvent<HTMLInputElement>);

      // Get the current cost per unit from the inventory item using the proper helper
      const costPerUnit = getCurrentCostPerUnit(inventoryItem);

      // Calculate total cost if quantity is available
      if (costPerUnit && ingredients[index]?.qty) {
        const qty = parseFloat(String(ingredients[index].qty).replace(/[^0-9.]/g, ""));
        if (!isNaN(qty) && qty > 0) {
          const totalCost = qty * costPerUnit;
          onFieldChange(index, "cost")({
            target: { value: totalCost.toFixed(2) },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      }

      // Auto-suggest yield if not already set
      const currentYield = ingredients[index]?.yield;
      if (!currentYield || currentYield === "") {
        const prep = ingredients[index]?.prep || "";
        const yieldInfo = enrichIngredientWithYield(
          inventoryItem.canonicalName || inventoryItem.name,
          currentYield,
          prep
        );

        if (yieldInfo.yieldSource === "auto-filled") {
          onFieldChange(index, "yield")({
            target: { value: String(yieldInfo.yield) },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      }

      // Set inventory link info via parent callback
      // This updates inventoryId, mappingConfidence, and costPerUnit in the parent state
      if (onIngredientSelected) {
        onIngredientSelected(index, inventoryId, inventoryItem);
      }

      console.debug(
        `Ingredient selected: ${inventoryItem.canonicalName} (${inventoryId}), cost per unit: ${costPerUnit}`
      );

      setSelectedSelectorRow(null);
    } catch (error) {
      console.error("Error selecting ingredient:", error);
      setSelectedSelectorRow(null);
    }
  };

  const handleDragStart = (index: number) => (event: React.DragEvent<HTMLButtonElement>) => {
    setDraggedRowIndex(index);
    event.dataTransfer.setData("text/plain", String(index));
    event.dataTransfer.effectAllowed = "move";
    if (event.dataTransfer.setDragImage) {
      const dragImage = new Image();
      dragImage.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      event.dataTransfer.setDragImage(dragImage, 0, 0);
    }
  };

  const handleDragEnd = () => {
    setDraggedRowIndex(null);
    setDragOverRowIndex(null);
  };

  const handleRowDragOver = (index: number) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverRowIndex(index);
  };

  const handleRowDragLeave = () => {
    setDragOverRowIndex(null);
  };

  const handleRowDrop = (targetIndex: number) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sourceIndex = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isNaN(sourceIndex)) return;
    setDraggedRowIndex(null);
    setDragOverRowIndex(null);
    onReorderRow(sourceIndex, targetIndex);
  };

  const handleContainerDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sourceIndex = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isNaN(sourceIndex)) return;
    setDraggedRowIndex(null);
    setDragOverRowIndex(null);
    onReorderRow(sourceIndex, ingredients.length);
  };

  return (
    <div
      className={`rounded-2xl border p-4 shadow-lg ${
        isDarkMode
          ? "bg-slate-950/50 border-[#c8a97e]/25 shadow-[#c8a97e]-500/10"
          : "bg-white border-slate-200 shadow-slate-300/40"
      }`}
      data-echo-key="section:add:ingredients"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            className={`text-lg font-semibold uppercase tracking-[0.28em] ${
              isDarkMode ? "text-[#c8a97e]" : "text-slate-700"
            }`}
          >
            Ingredients
          </h3>
          <p
            className={`mt-1 max-w-xl text-xs leading-relaxed ${
              isDarkMode ? "text-[#c8a97e]/50" : "text-slate-500"
            }`}
          >
            Track each component with quantity, unit, prep method, yield %, and cost to keep recipe costing and lab documentation aligned.
          </p>
        </div>
        <div
          className={`flex flex-col items-end text-xs ${
            isDarkMode ? "text-[#c8a97e]/80/80" : "text-slate-600"
          }`}
        >
          <span>
            {t("recipe.ingredients.activeItems", "Active items")}:{" "}
            <strong className={isDarkMode ? "text-white/80" : "text-slate-900"}>{activeCount}</strong>
          </span>
          <span>
            {t("recipe.ingredients.totalCost", "Total cost")}:{" "}
            <strong className={isDarkMode ? "text-white/80" : "text-slate-900"}>
              {currencySymbol}
              {totalCost.toFixed(2)}
            </strong>
          </span>
          <span>
            {t("recipe.ingredients.averageYield", "Avg yield")}:{" "}
            <strong className={isDarkMode ? "text-white/80" : "text-slate-900"}>
              {averageYield == null ? "—" : `${averageYield.toFixed(1)}%`}
            </strong>
          </span>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <div
          className="min-w-[960px] space-y-1"
          onDragOver={handleRowDragOver}
          onDrop={handleContainerDrop}
        >
          <div
            className={`grid grid-cols-[minmax(2.75rem,3.5rem),5rem,7ch,minmax(18rem,2fr),minmax(13.5rem,1.25fr),6.5ch,14.5ch,2.5rem] items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] ${
              isDarkMode ? "bg-slate-900/70 text-[#c8a97e]/80/70" : "bg-slate-100 text-slate-600"
            }`}
          >
            <span>#</span>
            <span>{t("recipe.ingredients.columns.qty", "Qty")}</span>
            <span>{t("recipe.ingredients.columns.unit", "Unit")}</span>
            <span>{t("recipe.ingredients.columns.item", "Ingredient")}</span>
            <span>{t("recipe.ingredients.columns.prep", "Method / Prep")}</span>
            <span>{t("recipe.ingredients.columns.yield", "Yield %")}</span>
            <span>{t("recipe.ingredients.columns.cost", "Cost")}</span>
            <span />
          </div>
          {ingredients.map((row, index) => {
            const isDivider = row.type === "divider";
            const rowKey = row.subId ?? `${index}`;
            const quotes = supplierQuotes?.[rowKey] ?? [];
            const rowTone = isDivider
              ? isDarkMode
                ? "border-[#c8a97e]/25 bg-[#c8a97e]/08"
                : "border-slate-300 bg-slate-100/80"
              : isDarkMode
                ? "border-[#c8a97e]/15 bg-slate-950/40 shadow-[0_12px_28px_-18px_rgba(34,211,238,0.45)]"
                : "border-slate-200 bg-white shadow-[0_12px_28px_-18px_rgba(15,23,42,0.35)]";

            if (isDivider) {
              return (
                <div
                  key={row.subId ?? `${index}-${row.item || "divider"}`}
                  className={`flex items-center gap-2.5 rounded-2xl border px-2.5 py-1.5 transition-all ${rowTone} ${
                    draggedRowIndex === index
                      ? isDarkMode
                        ? "opacity-40 bg-slate-900/20"
                        : "opacity-40 bg-slate-100/50"
                      : ""
                  } ${
                    dragOverRowIndex === index
                      ? isDarkMode
                        ? "ring-2 ring-[#c8a97e] bg-[#c8a97e]/08"
                        : "ring-2 ring-blue-400 bg-blue-50"
                      : ""
                  }`}
                  onDragOver={handleRowDragOver(index)}
                  onDragLeave={handleRowDragLeave}
                  onDrop={handleRowDrop(index)}
                  data-row-kind={row.type}
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      draggable
                      onDragStart={handleDragStart(index)}
                      onDragEnd={handleDragEnd}
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs transition-colors ${
                        isDarkMode
                          ? "border-[#c8a97e]/30 text-[#c8a97e]/80 hover:bg-[#c8a97e]/08"
                          : "border-slate-300 text-slate-500 hover:bg-slate-200/80"
                      } ${
                        draggedRowIndex === index
                          ? isDarkMode
                            ? "bg-[#c8a97e]/25 border-[#c8a97e]"
                            : "bg-blue-200 border-blue-400"
                          : ""
                      }`}
                      title={t("recipe.ingredients.dragHandle", "Drag to reorder")}
                      aria-label={t("recipe.ingredients.dragHandle", "Drag to reorder")}
                    >
                      <GripVertical className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <span className="text-xs font-semibold text-slate-500 dark:text-[#c8a97e]">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex flex-1 justify-center">
                    <input
                      data-row={index}
                      data-col={2}
                      value={row.item}
                      onChange={onFieldChange(index, "item")}
                      onKeyDown={onGridKeyDown}
                      className={`w-full max-w-[240px] rounded-full border px-4 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.4em] outline-none transition ${
                        isDarkMode
                          ? "border-[#c8a97e]/30 bg-[#c8a97e]/08 text-white/80 focus:border-[#c8a97e]"
                          : "border-slate-300/80 bg-slate-50 text-slate-600 focus:border-slate-500"
                      }`}
                      placeholder={t("recipe.ingredients.placeholders.step", "Step label")}
                    />
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => onRemoveRow(index)}
                      className={`rounded-full border p-1 transition ${
                        isDarkMode
                          ? "border-[#c8a97e]/25 text-[#c8a97e]/80 hover:bg-[#c8a97e]/08"
                          : "border-slate-300 text-slate-600 hover:bg-slate-100"
                      }`}
                      title={t("recipe.ingredients.removeRow", "Remove step")}
                      aria-label={t("recipe.ingredients.removeRow", "Remove step")}
                    >
                      <MinusCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={row.subId ?? `${index}-${row.item || "blank"}`}
                className={`grid grid-cols-[minmax(2.75rem,3.5rem),5rem,7ch,minmax(18rem,2fr),minmax(13.5rem,1.25fr),6.5ch,14.5ch,2.5rem] items-stretch gap-2.5 rounded-2xl border px-2.5 py-1.5 transition-all ${rowTone} ${
                  draggedRowIndex === index
                    ? isDarkMode
                      ? "opacity-40 bg-slate-900/20"
                      : "opacity-40 bg-slate-100/50"
                    : ""
                } ${
                  dragOverRowIndex === index
                    ? isDarkMode
                      ? "ring-2 ring-[#c8a97e] bg-[#c8a97e]/08"
                      : "ring-2 ring-blue-400 bg-blue-50"
                    : ""
                }`}
                onDragOver={handleRowDragOver(index)}
                onDragLeave={handleRowDragLeave}
                onDrop={handleRowDrop(index)}
                data-row-kind={row.type}
              >
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    draggable
                    onDragStart={handleDragStart(index)}
                    onDragEnd={handleDragEnd}
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs transition-colors ${
                      isDarkMode
                        ? "border-[#c8a97e]/30 text-[#c8a97e]/80 hover:bg-[#c8a97e]/08"
                        : "border-slate-300 text-slate-500 hover:bg-slate-200/80"
                    } ${
                      draggedRowIndex === index
                        ? isDarkMode
                          ? "bg-[#c8a97e]/25 border-[#c8a97e]"
                          : "bg-blue-200 border-blue-400"
                        : ""
                    }`}
                    title={t("recipe.ingredients.dragHandle", "Drag to reorder")}
                    aria-label={t("recipe.ingredients.dragHandle", "Drag to reorder")}
                  >
                    <GripVertical className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <span className="text-xs font-semibold text-slate-500 dark:text-[#c8a97e]">
                    {index + 1}
                  </span>
                </div>
                <input
                  data-row={index}
                  data-col={0}
                  value={row.qty}
                  onChange={onFieldChange(index, "qty")}
                  onKeyDown={onGridKeyDown}
                  disabled={isDivider}
                  className={inputTone(isDarkMode, "px-2", false, isDivider)}
                  placeholder={t("recipe.ingredients.placeholders.qty", "1 1/2")}
                />
                <input
                  data-row={index}
                  data-col={1}
                  value={row.unit}
                  onChange={onFieldChange(index, "unit")}
                  onKeyDown={onGridKeyDown}
                  className={inputTone(
                    isDarkMode,
                    "px-2 text-center uppercase",
                    false,
                  )}
                  placeholder={t("recipe.ingredients.placeholders.unit", "QTS")}
                />
                <div className="relative flex items-center gap-1">
                  <div className="relative flex-1">
                    <input
                      data-row={index}
                      data-col={2}
                      value={row.item}
                      onChange={(e) => {
                        onFieldChange(index, "item")(e);

                        // Trigger fuzzy search with debounce
                        if (fuzzyTimerRef.current) clearTimeout(fuzzyTimerRef.current);
                        fuzzyTimerRef.current = setTimeout(() => {
                          doFuzzySearch(e.target.value, index);
                        }, 150);

                        if (e.target.value.trim().length > 0) {
                          const misspelled = isMisspelled(e.target.value);
                          setMisspelledIngredients(prev => {
                            const next = new Set(prev);
                            if (misspelled) {
                              next.add(index);
                            } else {
                              next.delete(index);
                            }
                            return next;
                          });
                        } else {
                          setMisspelledIngredients(prev => {
                            const next = new Set(prev);
                            next.delete(index);
                            return next;
                          });
                          setFuzzyResults([]);
                          setFuzzyActiveRow(null);
                        }
                      }}
                      onFocus={() => {
                        if (row.item && row.item.trim().length > 0) {
                          doFuzzySearch(row.item, index);
                        }
                      }}
                      onKeyDown={(e) => {
                        // Handle arrow keys for fuzzy dropdown
                        if (fuzzyActiveRow === index && fuzzyResults.length > 0) {
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setFuzzyHighlight(prev => Math.min(prev + 1, fuzzyResults.length - 1));
                            return;
                          }
                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setFuzzyHighlight(prev => Math.max(prev - 1, 0));
                            return;
                          }
                          if (e.key === "Enter" && fuzzyHighlight >= 0) {
                            e.preventDefault();
                            selectFuzzyItem(index, fuzzyResults[fuzzyHighlight]);
                            return;
                          }
                          if (e.key === "Escape") {
                            setFuzzyResults([]);
                            setFuzzyActiveRow(null);
                            return;
                          }
                        }
                        onGridKeyDown(e);
                      }}
                      className={`${inputTone(isDarkMode, undefined, false, false)} ${
                        misspelledIngredients.has(index)
                          ? isDarkMode
                            ? "border-orange-400/50"
                            : "border-orange-300"
                          : ""
                      }`}
                      placeholder={t("recipe.ingredients.placeholders.item", "Ingredient")}
                      title={misspelledIngredients.has(index) ? "Possible misspelling - check culinary dictionary" : ""}
                      autoComplete="off"
                      data-testid={`ingredient-input-${index}`}
                    />
                    {/* Fuzzy search dropdown */}
                    {fuzzyActiveRow === index && fuzzyResults.length > 0 && (
                      <div
                        ref={fuzzyDropdownRef}
                        className={`absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border shadow-xl max-h-[220px] overflow-auto ${
                          isDarkMode
                            ? "bg-slate-900 border-[#c8a97e]/25 shadow-[#c8a97e]-500/10"
                            : "bg-white border-slate-200 shadow-slate-300/40"
                        }`}
                        data-testid={`ingredient-dropdown-${index}`}
                      >
                        {fuzzyResults.map((item, i) => (
                          <button
                            key={item.id || `fuzzy-${i}`}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectFuzzyItem(index, item);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors text-left ${
                              i === fuzzyHighlight
                                ? isDarkMode ? "bg-[#c8a97e]/15 text-white/80" : "bg-blue-50 text-blue-900"
                                : isDarkMode ? "text-white/80 hover:bg-slate-800" : "text-slate-900 hover:bg-slate-50"
                            } ${i > 0 ? (isDarkMode ? "border-t border-slate-800" : "border-t border-slate-100") : ""}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.name}</p>
                              <p className={`text-[10px] ${isDarkMode ? "text-[#c8a97e]/50" : "text-slate-500"}`}>
                                {item._fromYieldDb ? (
                                  <>
                                    Yield {item.yield_pct}% · Trim {item.trim_pct}%
                                    {item.cuts?.length > 0 && ` · ${item.cuts.length} cuts`}
                                    {item.category && ` · ${item.category}`}
                                  </>
                                ) : item._fromVendorSku ? (
                                  <>
                                    <span className={isDarkMode ? "text-amber-300" : "text-amber-700"}>
                                      {item.vendor_name}
                                    </span>
                                    {item.vendor_sku && ` · ${item.vendor_sku}`}
                                    {item.pack_size && ` · ${item.pack_size}`}
                                    {item.last_invoice_number && ` · Inv ${item.last_invoice_number}`}
                                    {item.last_invoice_date && ` · ${item.last_invoice_date}`}
                                  </>
                                ) : (
                                  <>
                                    {item.current_stock ?? 0} {item.unit} on hand
                                    {item.category && ` · ${item.category}`}
                                  </>
                                )}
                              </p>
                            </div>
                            {item._fromYieldDb ? (
                              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                  isDarkMode ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-100 text-emerald-700"
                                }`}>
                                  {item.yield_pct}%
                                </span>
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                  isDarkMode ? "bg-[#c8a97e]/12 text-[#c8a97e]" : "bg-slate-100 text-slate-700"
                                }`}>
                                  ${item.ap_cost_lb?.toFixed(2)}/{item.unit}
                                </span>
                              </div>
                            ) : item._fromVendorSku ? (
                              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                <span className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded uppercase ${
                                  isDarkMode ? "bg-amber-500/15 text-amber-300" : "bg-amber-100 text-amber-700"
                                }`}>
                                  Invoice
                                </span>
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                  isDarkMode ? "bg-[#c8a97e]/12 text-[#c8a97e]" : "bg-slate-100 text-slate-700"
                                }`}>
                                  ${item.unit_cost?.toFixed(2)}/{item.unit}
                                </span>
                              </div>
                            ) : item.unit_cost > 0 ? (
                              <span className={`text-xs font-medium ml-2 shrink-0 px-1.5 py-0.5 rounded ${
                                isDarkMode ? "bg-[#c8a97e]/12 text-[#c8a97e]" : "bg-slate-100 text-slate-700"
                              }`}>
                                ${item.unit_cost.toFixed(2)}/{item.unit}
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {misspelledIngredients.has(index) && (
                    <AlertCircle className={`h-4 w-4 shrink-0 ${
                      isDarkMode ? "text-orange-400" : "text-orange-500"
                    }`} title="Possible misspelling in culinary terms" />
                  )}
                  <Popover open={selectedSelectorRow === index} onOpenChange={(open) => setSelectedSelectorRow(open ? index : null)}>
                    <PopoverTrigger asChild>
                      <button
                        className={`shrink-0 p-1.5 rounded transition-colors ${
                          row.inventoryId
                            ? isDarkMode ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : isDarkMode ? "bg-slate-700/50 text-slate-400 hover:bg-slate-700" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                        }`}
                        title="Link to supplier"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72" align="start">
                      <IngredientSelector
                        suggestedText={row.item}
                        showPrice={true}
                        onSelect={(invId, item) => handleIngredientSelect(index, invId, item)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="relative w-full flex items-center gap-1">
                  <input
                    data-row={index}
                    data-col={3}
                    value={row.prep}
                    onChange={onFieldChange(index, "prep")}
                    onKeyDown={onGridKeyDown}
                    list={methodOptions.length ? methodOptionsId : undefined}
                    className={`${inputTone(isDarkMode, undefined, false, false)} flex-1`}
                    placeholder={t("recipe.ingredients.placeholders.prep", "Method or prep notes")}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <input
                    data-row={index}
                    data-col={4}
                    value={row.yield}
                    onChange={onFieldChange(index, "yield")}
                    onBlur={onFieldBlur(index, "yield")}
                    onKeyDown={onGridKeyDown}
                    className={inputTone(isDarkMode, "px-2 text-center", true, false)}
                    maxLength={6}
                    placeholder={t("recipe.ingredients.placeholders.yield", "100")}
                  />
                </div>
                <div className="relative flex w-full flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <span
                      className={`pointer-events-none text-sm font-semibold ${
                        isDarkMode ? "text-[#c8a97e]" : "text-slate-500"
                      }`}
                    >
                      {currencySymbol}
                    </span>
                    <input
                      data-row={index}
                      data-col={5}
                      value={row.cost}
                      onChange={onFieldChange(index, "cost")}
                      onBlur={onFieldBlur(index, "cost")}
                      onKeyDown={onGridKeyDown}
                      className={inputTone(isDarkMode, "px-2 text-right", false, false)}
                      maxLength={14}
                      placeholder={t("recipe.ingredients.placeholders.cost", "0.00")}
                    />
                  </div>
                  {quotes.length > 0 && (
                    <div
                      className={`rounded-lg border border-dashed p-2 ${
                        isDarkMode
                          ? "border-[#c8a97e]/15 bg-amber-500/5 text-white/80"
                          : "border-slate-300/70 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {quotes.slice(0, 2).map((quote) => {
                        const key = `${quote.sku}-${quote.supplierId}`;
                        const unitCostText = quote.unitCost != null
                          ? `${quote.currency} ${quote.unitCost.toFixed(2)} / ${quote.unitCostUnit ?? quote.packUnit}`
                          : `${quote.currency} ${quote.pricePerPack.toFixed(2)} per ${quote.packSize}${quote.packUnit}`;
                        const estimatedCostText =
                          quote.estimatedCost != null
                            ? `${currencySymbol}${quote.estimatedCost.toFixed(2)} for qty`
                            : `${quote.currency} ${quote.pricePerPack.toFixed(2)} pack`;
                        return (
                          <div key={key} className="flex items-start justify-between gap-2 text-[10px]">
                            <div className="space-y-1">
                              <div className="font-semibold">
                                {quote.supplierName}
                                <span className="ml-1 font-normal text-[9px] opacity-80">
                                  {unitCostText}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 text-[9px] opacity-75">
                                <span>LT {quote.leadTimeDays}d</span>
                                <span>Min {quote.minOrderPacks} pack{quote.minOrderPacks > 1 ? "s" : ""}</span>
                                <span>{estimatedCostText}</span>
                              </div>
                            </div>
                            {onApplySupplierQuote && quote.estimatedCost != null && (
                              <button
                                type="button"
                                onClick={() => onApplySupplierQuote(index, quote)}
                                className={`rounded-full px-2 py-1 text-[10px] font-semibold transition ${
                                  isDarkMode
                                    ? "border border-[#c8a97e]/40 text-white/80 hover:bg-[#c8a97e]/15"
                                    : "border border-slate-400 text-slate-700 hover:bg-slate-200"
                                }`}
                              >
                                Apply
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {quotes.length > 2 && (
                        <div className="mt-1 text-[9px] opacity-70">
                          +{quotes.length - 2} additional supplier option
                          {quotes.length - 2 > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => onRemoveRow(index)}
                    className={`rounded-full border p-1 transition ${
                      isDarkMode
                        ? "border-[#c8a97e]/25 text-[#c8a97e]/80 hover:bg-[#c8a97e]/08"
                        : "border-slate-300 text-slate-600 hover:bg-slate-100"
                    }`}
                    title={t("recipe.ingredients.removeRow", "Remove row")}
                    aria-label={t("recipe.ingredients.removeRow", "Remove row")}
                  >
                    <MinusCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {methodOptions.length > 0 && (
            <datalist id={methodOptionsId}>
              {methodOptions.map((method) => (
                <option key={method} value={method} />
              ))}
            </datalist>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className={isDarkMode ? "text-[#c8a97e]/80/75" : "text-slate-500"}>
          {t("recipe.ingredients.volumeLabel", "Theoretical volume captured")}:{" "}
          <span className="font-semibold text-slate-700 dark:text-white/80">
            {theoreticalVolumeLabel}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onAddRow()}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              isDarkMode
                ? "bg-[#c8a97e]/15 text-white/80 hover:bg-[#c8a97e]/25"
                : "bg-slate-900 text-white hover:bg-slate-700"
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            {t("recipe.ingredients.addIngredient", "Add ingredient")}
          </button>
          <button
            type="button"
            onClick={onAddSubRecipe}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition ${
              isDarkMode
                ? "border border-[#c8a97e]/25 text-[#c8a97e]/80 hover:bg-[#c8a97e]/08"
                : "border border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Link2 className="h-4 w-4" />
            {t("recipe.ingredients.addSubRecipe", "Add sub recipe")}
          </button>
          <button
            type="button"
            onClick={onAddDivider}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition ${
              isDarkMode
                ? "border border-[#c8a97e]/25 text-[#c8a97e]/80 hover:bg-[#c8a97e]/08"
                : "border border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            {t("recipe.ingredients.addDivider", "Add break")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IngredientsGrid;
