import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StockTxn, Ingredient, PurchaseOrder } from "../data/schemas";
import { useInventory } from "../hooks/useInventory";
import {
  loadIngredientsMap,
  loadVendorCatalog,
  loadRecipesMap,
} from "../services/fixtures";
import type { VendorCatalogEntry } from "../utils/vendors";
import type { Recipe } from "../data/schemas";
import { getPurchRecState } from "../state/purchRec.store";
export interface StockLedgerPanelProps {
  panelId: string;
  onClose?: () => void;
  onMinimize?: () => void;
}
interface FilterState {
  search: string;
  type: StockTxn["type"] | "ALL";
  from: string;
  to: string;
  includeAdjustments: boolean;
}
interface LookupState {
  ingredients: Record<string, Ingredient>;
  vendors: Map<string, VendorCatalogEntry>;
  recipes: Record<string, Recipe>;
}
export function StockLedgerPanel({
  panelId,
  onClose,
  onMinimize,
}: StockLedgerPanelProps) {
  const { ledger, loading, error, refresh } = useInventory();
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    type: "ALL",
    from: "",
    to: "",
    includeAdjustments: true,
  });
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [lookups, setLookups] = useState<LookupState>({
    ingredients: {},
    vendors: new Map(),
    recipes: {},
  });
  const dataLoaded = useRef(false);
  useEffect(() => {
    if (dataLoaded.current) return;
    dataLoaded.current = true;
    let active = true;
    (async () => {
      try {
        const [ingredientMap, vendorCatalog, recipeMap] = await Promise.all([
          loadIngredientsMap(),
          loadVendorCatalog(),
          loadRecipesMap(),
        ]);
        if (!active) return;
        const vendorMap = new Map<string, VendorCatalogEntry>();
        vendorCatalog.forEach((entry) => vendorMap.set(entry.vendorId, entry));
        setLookups({
          ingredients: ingredientMap,
          vendors: vendorMap,
          recipes: recipeMap,
        });
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  const purchaseOrders = useMemo(() => getPurchRecState().orders, [ledger]);
  const filteredLedger = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const fromDate = filters.from ? new Date(filters.from) : null;
    const toDate = filters.to ? new Date(filters.to) : null;
    return ledger
      .filter((entry) => {
        if (filters.type !== "ALL" && entry.type !== filters.type) {
          return false;
        }
        if (!filters.includeAdjustments && entry.type === "ADJUST") {
          return false;
        }
        if (fromDate) {
          const created = new Date(entry.createdAt);
          if (created < fromDate) {
            return false;
          }
        }
        if (toDate) {
          const created = new Date(entry.createdAt);
          if (created > toDate) {
            return false;
          }
        }
        if (search) {
          const ingredient = lookups.ingredients[entry.ingredientId];
          const vendorName = entry.ref.poId
            ? resolveVendorName(entry.ref.poId, purchaseOrders, lookups.vendors)
            : "";
          const recipeName = entry.ref.recipeId
            ? (lookups.recipes[entry.ref.recipeId]?.name ?? "")
            : "";
          const text = [
            ingredient?.name,
            ingredient?.spec,
            vendorName,
            entry.ref.note,
            entry.ref.poId,
            recipeName,
          ]
            .filter(Boolean)
            .join("")
            .toLowerCase();
          if (!text.includes(search)) {
            return false;
          }
        }
        return true;
      })
      .slice()
      .sort((a, b) => sortDir * a.createdAt.localeCompare(b.createdAt));
  }, [ledger, filters, lookups, sortDir, purchaseOrders]);
  const summary = useMemo(() => {
    let inbound = 0;
    let outbound = 0;
    let adjustments = 0;
    filteredLedger.forEach((entry) => {
      if (entry.type === "RECEIVE") {
        inbound += entry.qtyBase;
      } else if (entry.type === "ISSUE") {
        outbound += Math.abs(entry.qtyBase);
      } else if (entry.type === "ADJUST") {
        adjustments += entry.qtyBase;
      }
    });
    const net = inbound - outbound + adjustments;
    const value = filteredLedger.reduce(
      (sum, entry) => sum + entry.qtyBase * entry.unitCostPerBase,
      0,
    );
    return {
      entries: filteredLedger.length,
      inbound,
      outbound,
      adjustments,
      net,
      value,
    };
  }, [filteredLedger]);
  const handleTypeChange = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, type: value as FilterState["type"] }));
  }, []);
  const handleSearchChange = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  }, []);
  const handleDateChange = useCallback((key: "from" | "to", value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);
  const toggleAdjustments = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      includeAdjustments: !prev.includeAdjustments,
    }));
  }, []);
  const toggleSortDir = useCallback(() => {
    setSortDir((prev) => (prev === -1 ? 1 : -1));
  }, []);
  return (
    <div className="flex h-full flex-col rounded-2xl border border-purple-400/40 bg-card text-slate-100 shadow-[0_0_40px_rgba(192,132,252,0.18)]">
      {" "}
      <header className="flex items-center justify-between gap-3 border-b border-purple-400/25 px-6 py-4">
        {" "}
        <div>
          {" "}
          <div className="text-[11px] uppercase tracking-[0.35em] text-purple-200/80">
            {" "}
            Panel {panelId}{" "}
          </div>{" "}
          <h2 className="text-xl font-semibold text-purple-100">
            {" "}
            Stock Ledger{" "}
          </h2>{" "}
          <p className="mt-1 text-xs text-purple-100/70">
            {" "}
            Trace inbound receipts, issues, and adjustments across
            inventory.{" "}
          </p>{" "}
        </div>{" "}
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-purple-100/70">
          {" "}
          <button
            type="button"
            className="rounded-md border border-purple-400/40 px-3 py-1 transition hover:border-purple-200/70"
            onClick={() => void refresh()}
            disabled={loading}
          >
            {" "}
            Refresh{" "}
          </button>{" "}
          <button
            type="button"
            className="rounded-md border border-purple-400/40 px-3 py-1 transition hover:border-purple-200/70"
            onClick={onMinimize}
          >
            {" "}
            Minimize{" "}
          </button>{" "}
          <button
            type="button"
            className="rounded-md border border-red-400/40 px-3 py-1 text-red-200 transition hover:border-red-200/70"
            onClick={onClose}
          >
            {" "}
            Close{" "}
          </button>{" "}
        </div>{" "}
      </header>{" "}
      <div className="flex-1 overflow-hidden">
        {" "}
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-purple-100/70">
            {" "}
            Loading ledger…{" "}
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-red-300">
            {" "}
            <span>Unable to load stock ledger.</span>{" "}
            <span className="text-xs text-red-200/80">{error.message}</span>{" "}
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-md border border-red-300/40 px-3 py-1 text-red-100 transition hover:border-red-200/70"
            >
              {" "}
              Retry{" "}
            </button>{" "}
          </div>
        ) : (
          <div className="flex h-full flex-col overflow-hidden">
            {" "}
            <div className="border-b border-purple-400/20 bg-card px-6 py-4">
              {" "}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                {" "}
                <Metric label="Entries" value={summary.entries} />{" "}
                <Metric label="Inbound" value={summary.inbound} precision={2} />{" "}
                <Metric
                  label="Outbound"
                  value={summary.outbound}
                  precision={2}
                />{" "}
                <Metric
                  label="Adjustments"
                  value={summary.adjustments}
                  precision={2}
                />{" "}
                <Metric
                  label="Net"
                  value={summary.net}
                  precision={2}
                  highlight={summary.net < 0}
                />{" "}
                <Metric
                  label="Value"
                  value={summary.value}
                  precision={2}
                  prefix="$"
                />{" "}
              </div>{" "}
              <div className="mt-6 grid gap-4 lg:grid-cols-4">
                {" "}
                <label className="lg:col-span-2">
                  {" "}
                  <div className="text-xs uppercase tracking-[0.3em] text-purple-200/70">
                    {" "}
                    Search{" "}
                  </div>{" "}
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(event) => handleSearchChange(event.target.value)}
                    placeholder="Ingredient, vendor, recipe, note"
                    className="mt-2 w-full rounded-xl border border-purple-400/30 bg-card px-3 py-2 text-sm text-purple-100 focus:border-purple-200 focus:outline-none"
                  />{" "}
                </label>{" "}
                <label>
                  {" "}
                  <div className="text-xs uppercase tracking-[0.3em] text-purple-200/70">
                    {" "}
                    Type{" "}
                  </div>{" "}
                  <select
                    className="mt-2 w-full rounded-xl border border-purple-400/30 bg-card px-3 py-2 text-sm text-purple-100 focus:border-purple-200 focus:outline-none"
                    value={filters.type}
                    onChange={(event) => handleTypeChange(event.target.value)}
                  >
                    {" "}
                    <option value="ALL">All</option>{" "}
                    <option value="RECEIVE">Receipts</option>{" "}
                    <option value="ISSUE">Issues</option>{" "}
                    <option value="ADJUST">Adjustments</option>{" "}
                  </select>{" "}
                </label>{" "}
                <div className="flex flex-col justify-end gap-2 text-xs text-purple-100/80">
                  {" "}
                  <label className="inline-flex items-center gap-2">
                    {" "}
                    <input
                      type="checkbox"
                      checked={filters.includeAdjustments}
                      onChange={toggleAdjustments}
                    />{" "}
                    Include adjustments{" "}
                  </label>{" "}
                  <button
                    type="button"
                    className="self-start rounded-md border border-purple-400/40 px-3 py-1 text-xs uppercase tracking-[0.25em] text-purple-100 transition hover:border-purple-200"
                    onClick={toggleSortDir}
                  >
                    {" "}
                    Sort {sortDir === -1 ? "↓ Newest" : "↑ Oldest"}{" "}
                  </button>{" "}
                </div>{" "}
              </div>{" "}
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {" "}
                <label>
                  {" "}
                  <div className="text-xs uppercase tracking-[0.3em] text-purple-200/70">
                    {" "}
                    From{" "}
                  </div>{" "}
                  <input
                    type="date"
                    value={filters.from}
                    onChange={(event) =>
                      handleDateChange("from", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-purple-400/30 bg-card px-3 py-2 text-sm text-purple-100 focus:border-purple-200 focus:outline-none"
                  />{" "}
                </label>{" "}
                <label>
                  {" "}
                  <div className="text-xs uppercase tracking-[0.3em] text-purple-200/70">
                    {" "}
                    To{" "}
                  </div>{" "}
                  <input
                    type="date"
                    value={filters.to}
                    onChange={(event) =>
                      handleDateChange("to", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-purple-400/30 bg-card px-3 py-2 text-sm text-purple-100 focus:border-purple-200 focus:outline-none"
                  />{" "}
                </label>{" "}
              </div>{" "}
            </div>{" "}
            <div className="flex-1 overflow-auto">
              {" "}
              <table className="min-w-full text-sm">
                {" "}
                <thead className="sticky top-0 bg-card text-[11px] uppercase tracking-[0.25em] text-purple-200/70">
                  {" "}
                  <tr>
                    {" "}
                    <th className="px-4 py-3 text-left">Timestamp</th>{" "}
                    <th className="px-4 py-3 text-left">Ingredient</th>{" "}
                    <th className="px-4 py-3 text-left">Type</th>{" "}
                    <th className="px-4 py-3 text-right">Qty (base)</th>{" "}
                    <th className="px-4 py-3 text-right">Unit Cost</th>{" "}
                    <th className="px-4 py-3 text-right">Value</th>{" "}
                    <th className="px-4 py-3 text-left">Reference</th>{" "}
                  </tr>{" "}
                </thead>{" "}
                <tbody>
                  {" "}
                  {filteredLedger.map((entry) => (
                    <LedgerRow
                      key={entry.id}
                      entry={entry}
                      ingredient={
                        lookups.ingredients[entry.ingredientId] ?? null
                      }
                      vendor={lookupVendor(
                        entry,
                        lookups.vendors,
                        purchaseOrders,
                      )}
                      recipe={
                        entry.ref.recipeId
                          ? (lookups.recipes[entry.ref.recipeId] ?? null)
                          : null
                      }
                    />
                  ))}{" "}
                  {!filteredLedger.length && (
                    <tr>
                      {" "}
                      <td
                        colSpan={7}
                        className="px-6 py-12 text-center text-sm text-purple-200/70"
                      >
                        {" "}
                        No ledger entries match the current filters.{" "}
                      </td>{" "}
                    </tr>
                  )}{" "}
                </tbody>{" "}
              </table>{" "}
            </div>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
}
interface MetricProps {
  label: string;
  value: number;
  precision?: number;
  prefix?: string;
  highlight?: boolean;
}
function Metric({
  label,
  value,
  precision = 0,
  prefix = "",
  highlight = false,
}: MetricProps) {
  return (
    <div
      className={`rounded-xl border ${highlight ? "border-rose-400/60" : "border-purple-400/30"} bg-card p-4`}
    >
      {" "}
      <div className="text-[11px] uppercase tracking-[0.3em] text-purple-200/70">
        {" "}
        {label}{" "}
      </div>{" "}
      <div
        className={`mt-2 text-xl font-semibold ${highlight ? "text-rose-200" : "text-purple-100"}`}
      >
        {" "}
        {prefix} {value.toFixed(precision)}{" "}
      </div>{" "}
    </div>
  );
}
interface LedgerRowProps {
  entry: StockTxn;
  ingredient: Ingredient | null;
  vendor: VendorCatalogEntry | null;
  recipe: Recipe | null;
}
function LedgerRow({ entry, ingredient, vendor, recipe }: LedgerRowProps) {
  const value = entry.qtyBase * entry.unitCostPerBase;
  const typeLabel = formatType(entry.type);
  const qtyClass =
    entry.type === "RECEIVE"
      ? "text-emerald-200"
      : entry.type === "ISSUE"
        ? "text-rose-200"
        : "text-amber-200";
  return (
    <tr className="border-b border-purple-400/10">
      {" "}
      <td className="px-4 py-4 align-top text-xs text-purple-200/80">
        {" "}
        {formatDateTime(entry.createdAt)}{" "}
      </td>{" "}
      <td className="px-4 py-4 align-top">
        {" "}
        <div className="font-semibold text-purple-100">
          {" "}
          {ingredient?.name ?? entry.ingredientId}{" "}
        </div>{" "}
        <div className="mt-1 text-xs text-purple-200/70">
          {" "}
          {ingredient?.spec ?? "No spec recorded"}{" "}
        </div>{" "}
      </td>{" "}
      <td className="px-4 py-4 align-top text-xs text-purple-100">
        {" "}
        {typeLabel}{" "}
      </td>{" "}
      <td
        className={`px-4 py-4 align-top text-right font-semibold ${qtyClass}`}
      >
        {" "}
        {entry.qtyBase.toFixed(2)}{" "}
      </td>{" "}
      <td className="px-4 py-4 align-top text-right text-purple-100">
        {" "}
        ${entry.unitCostPerBase.toFixed(2)}{" "}
      </td>{" "}
      <td className="px-4 py-4 align-top text-right text-purple-100">
        {" "}
        ${value.toFixed(2)}{" "}
      </td>{" "}
      <td className="px-4 py-4 align-top text-xs text-purple-200/70">
        {" "}
        {entry.ref.poId && <div>PO {entry.ref.poId}</div>}{" "}
        {vendor && <div>Vendor {vendor.vendorName}</div>}{" "}
        {recipe && <div>Recipe {recipe.name}</div>}{" "}
        {entry.ref.note && (
          <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-purple-200/50">
            {" "}
            {entry.ref.note}{" "}
          </div>
        )}{" "}
      </td>{" "}
    </tr>
  );
}
function formatType(type: StockTxn["type"]) {
  switch (type) {
    case "RECEIVE":
      return "Receipt";
    case "ISSUE":
      return "Issue";
    case "ADJUST":
      return "Adjust";
    default:
      return type;
  }
}
function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}
function resolveVendorName(
  poId: string,
  orders: Record<string, PurchaseOrder>,
  vendorMap: Map<string, VendorCatalogEntry>,
) {
  const po = orders[poId];
  if (!po) return "";
  return vendorMap.get(po.vendorId)?.vendorName ?? po.vendorId;
}
function lookupVendor(
  entry: StockTxn,
  vendorMap: Map<string, VendorCatalogEntry>,
  orders: Record<string, PurchaseOrder>,
) {
  if (!entry.ref.poId) return null;
  const po = orders[entry.ref.poId];
  if (!po) return null;
  return vendorMap.get(po.vendorId) ?? null;
}
