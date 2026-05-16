import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InventoryLot, Ingredient } from "../data/schemas";
import { loadIngredientsMap, loadVendorCatalog } from "../services/fixtures";
import { useInventory } from "../hooks/useInventory";
import type { VendorCatalogEntry } from "../utils/vendors";
export interface InventoryLotsPanelProps {
  panelId: string;
  ingredientId?: string;
  onClose?: () => void;
  onMinimize?: () => void;
}
interface FilterState {
  search: string;
  vendorId: string | null;
  hideEmpty: boolean;
  showExpiredOnly: boolean;
}
interface VendorLookups {
  byId: Map<string, VendorCatalogEntry>;
}
export function InventoryLotsPanel({
  panelId,
  ingredientId,
  onClose,
  onMinimize,
}: InventoryLotsPanelProps) {
  const { lots, loading, error, refresh } = useInventory();
  const [ingredients, setIngredients] = useState<Record<string, Ingredient>>(
    {},
  );
  const [vendors, setVendors] = useState<VendorCatalogEntry[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    vendorId: null,
    hideEmpty: true,
    showExpiredOnly: false,
  });
  const [sortKey, setSortKey] = useState<"createdAt" | "qty" | "cost">(
    "createdAt",
  );
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const vendorLookups = useMemo<VendorLookups>(() => {
    const byId = new Map<string, VendorCatalogEntry>();
    vendors.forEach((entry) => byId.set(entry.vendorId, entry));
    return { byId };
  }, [vendors]);
  const dataLoaded = useRef(false);
  useEffect(() => {
    if (dataLoaded.current) return;
    dataLoaded.current = true;
    let active = true;
    (async () => {
      try {
        const [ingredientMap, vendorCatalog] = await Promise.all([
          loadIngredientsMap(),
          loadVendorCatalog(),
        ]);
        if (!active) return;
        setIngredients(ingredientMap);
        setVendors(vendorCatalog);
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!ingredientId) return;
    const ingredient = ingredients[ingredientId];
    if (!ingredient) return;
    setFilters((prev) => ({ ...prev, search: ingredient.name }));
  }, [ingredientId, ingredients]);
  const filteredLots = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const today = new Date();
    const filterVendor = filters.vendorId;
    return lots
      .filter((lot) => {
        if (filters.hideEmpty && lot.qtyOnHandBase <= 0) {
          return false;
        }
        if (filterVendor && lot.source.vendorId !== filterVendor) {
          return false;
        }
        const ingredient = ingredients[lot.ingredientId];
        const matchText = [
          ingredient?.name,
          ingredient?.spec,
          lot.source.poId,
          lot.source.poLineId,
        ]
          .filter(Boolean)
          .join("")
          .toLowerCase();
        if (search && !matchText.includes(search)) {
          return false;
        }
        if (filters.showExpiredOnly) {
          if (!lot.expDate) return false;
          const expDate = new Date(lot.expDate);
          if (!(expDate < today)) {
            return false;
          }
        }
        return true;
      })
      .slice()
      .sort((a, b) => compareLots(a, b, sortKey, sortDir));
  }, [filters, lots, ingredients, sortKey, sortDir]);
  const summary = useMemo(() => {
    const totalLots = filteredLots.length;
    const totalQty = filteredLots.reduce(
      (sum, lot) => sum + lot.qtyOnHandBase,
      0,
    );
    const totalValue = filteredLots.reduce(
      (sum, lot) => sum + lot.qtyOnHandBase * lot.unitCostPerBase,
      0,
    );
    const expired = filteredLots.filter((lot) => isExpired(lot.expDate)).length;
    return { totalLots, totalQty, totalValue, expired };
  }, [filteredLots]);
  const uniqueVendors = useMemo(() => {
    const ids = new Set<string>();
    filteredLots.forEach((lot) => ids.add(lot.source.vendorId));
    return Array.from(ids)
      .map((id) => ({ id, name: vendorLookups.byId.get(id)?.vendorName ?? id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredLots, vendorLookups]);
  const handleSort = useCallback((key: typeof sortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDir((prevDir) => (prevDir === 1 ? -1 : 1));
        return prevKey;
      }
      setSortDir(-1);
      return key;
    });
  }, []);
  const handleSearchChange = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  }, []);
  const handleVendorChange = useCallback((value: string) => {
    setFilters((prev) => ({
      ...prev,
      vendorId: value === "all" ? null : value,
    }));
  }, []);
  const handleToggleHideEmpty = useCallback(() => {
    setFilters((prev) => ({ ...prev, hideEmpty: !prev.hideEmpty }));
  }, []);
  const handleToggleExpired = useCallback(() => {
    setFilters((prev) => ({ ...prev, showExpiredOnly: !prev.showExpiredOnly }));
  }, []);
  return (
    <div className="flex h-full flex-col rounded-2xl border border-sky-400/40 bg-card text-slate-100 shadow-[0_0_40px_rgba(56,189,248,0.18)]">
      {" "}
      <header className="flex items-center justify-between gap-3 border-b border-sky-400/25 px-6 py-4">
        {" "}
        <div>
          {" "}
          <div className="text-[11px] uppercase tracking-[0.35em] text-sky-200/80">
            {" "}
            Panel {panelId}{" "}
          </div>{" "}
          <h2 className="text-xl font-semibold text-sky-100">Inventory Lots</h2>{" "}
          <p className="mt-1 text-xs text-sky-100/70">
            {" "}
            Review on-hand lots, expiry exposure, and vendor sourcing.{" "}
          </p>{" "}
        </div>{" "}
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-sky-100/70">
          {" "}
          <button
            type="button"
            className="rounded-md border border-sky-400/40 px-3 py-1 transition hover:border-sky-200/70"
            onClick={() => void refresh()}
            disabled={loading}
          >
            {" "}
            Refresh{" "}
          </button>{" "}
          <button
            type="button"
            className="rounded-md border border-sky-400/40 px-3 py-1 transition hover:border-sky-200/70"
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
          <div className="flex h-full items-center justify-center text-sm text-sky-100/70">
            {" "}
            Loading lots…{" "}
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-red-300">
            {" "}
            <span>Unable to load inventory lots.</span>{" "}
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
            <div className="border-b border-sky-400/20 bg-card px-6 py-4">
              {" "}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {" "}
                <Metric label="Lots" value={summary.totalLots} />{" "}
                <Metric
                  label="Qty (base)"
                  value={summary.totalQty}
                  precision={2}
                />{" "}
                <Metric
                  label="Extended Value"
                  value={summary.totalValue}
                  precision={2}
                  prefix="$"
                />{" "}
                <Metric
                  label="Expired Lots"
                  value={summary.expired}
                  highlight
                />{" "}
              </div>{" "}
              <div className="mt-6 grid gap-4 lg:grid-cols-4">
                {" "}
                <label className="lg:col-span-2">
                  {" "}
                  <div className="text-xs uppercase tracking-[0.3em] text-sky-200/70">
                    {" "}
                    Search{" "}
                  </div>{" "}
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(event) => handleSearchChange(event.target.value)}
                    placeholder="Ingredient, spec, PO reference"
                    className="mt-2 w-full rounded-xl border border-sky-400/30 bg-card px-3 py-2 text-sm text-sky-100 focus:border-sky-200 focus:outline-none"
                  />{" "}
                </label>{" "}
                <label>
                  {" "}
                  <div className="text-xs uppercase tracking-[0.3em] text-sky-200/70">
                    {" "}
                    Vendor{" "}
                  </div>{" "}
                  <select
                    className="mt-2 w-full rounded-xl border border-sky-400/30 bg-card px-3 py-2 text-sm text-sky-100 focus:border-sky-200 focus:outline-none"
                    value={filters.vendorId ?? "all"}
                    onChange={(event) => handleVendorChange(event.target.value)}
                  >
                    {" "}
                    <option value="all">All vendors</option>{" "}
                    {vendors.map((vendor) => (
                      <option key={vendor.vendorId} value={vendor.vendorId}>
                        {" "}
                        {vendor.vendorName}{" "}
                      </option>
                    ))}{" "}
                  </select>{" "}
                </label>{" "}
                <div className="flex flex-col justify-end gap-2 text-xs text-sky-100/80">
                  {" "}
                  <label className="inline-flex items-center gap-2">
                    {" "}
                    <input
                      type="checkbox"
                      checked={filters.hideEmpty}
                      onChange={handleToggleHideEmpty}
                    />{" "}
                    Hide empty lots{" "}
                  </label>{" "}
                  <label className="inline-flex items-center gap-2">
                    {" "}
                    <input
                      type="checkbox"
                      checked={filters.showExpiredOnly}
                      onChange={handleToggleExpired}
                    />{" "}
                    Show expired only{" "}
                  </label>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
            <div className="flex-1 overflow-auto">
              {" "}
              <table className="min-w-full text-sm">
                {" "}
                <thead className="sticky top-0 bg-card text-[11px] uppercase tracking-[0.25em] text-sky-200/70">
                  {" "}
                  <tr>
                    {" "}
                    <SortableHeader
                      label="Ingredient"
                      active={sortKey === "createdAt"}
                      onClick={() => handleSort("createdAt")}
                      direction={sortKey === "createdAt" ? sortDir : undefined}
                    />{" "}
                    <th className="px-4 py-3 text-left">Vendor</th>{" "}
                    <SortableHeader
                      label="Base Qty"
                      active={sortKey === "qty"}
                      onClick={() => handleSort("qty")}
                      direction={sortKey === "qty" ? sortDir : undefined}
                      align="right"
                    />{" "}
                    <SortableHeader
                      label="Unit Cost"
                      active={sortKey === "cost"}
                      onClick={() => handleSort("cost")}
                      direction={sortKey === "cost" ? sortDir : undefined}
                      align="right"
                    />{" "}
                    <th className="px-4 py-3 text-left">Expiry</th>{" "}
                    <th className="px-4 py-3 text-left">Source</th>{" "}
                  </tr>{" "}
                </thead>{" "}
                <tbody>
                  {" "}
                  {filteredLots.map((lot) => (
                    <LotRow
                      key={lot.id}
                      lot={lot}
                      ingredient={ingredients[lot.ingredientId] ?? null}
                      vendor={
                        vendorLookups.byId.get(lot.source.vendorId) ?? null
                      }
                    />
                  ))}{" "}
                  {!filteredLots.length && (
                    <tr>
                      {" "}
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-sm text-sky-200/70"
                      >
                        {" "}
                        No lots match the current filters.{" "}
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
      className={`rounded-xl border ${highlight ? "border-amber-400/60" : "border-sky-400/30"} bg-card p-4`}
    >
      {" "}
      <div className="text-[11px] uppercase tracking-[0.3em] text-sky-200/70">
        {" "}
        {label}{" "}
      </div>{" "}
      <div
        className={`mt-2 text-xl font-semibold ${highlight ? "text-amber-200" : "text-sky-100"}`}
      >
        {" "}
        {prefix} {value.toFixed(precision)}{" "}
      </div>{" "}
    </div>
  );
}
interface SortableHeaderProps {
  label: string;
  active: boolean;
  direction?: 1 | -1;
  onClick: () => void;
  align?: "left" | "right";
}
function SortableHeader({
  label,
  active,
  direction,
  onClick,
  align = "left",
}: SortableHeaderProps) {
  return (
    <th className={`px-4 py-3 text-${align}`}>
      {" "}
      <button
        type="button"
        className={`inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.25em] ${active ? "text-sky-100" : "text-sky-200/70"}`}
        onClick={onClick}
      >
        {" "}
        {label} {active && <span>{direction === -1 ? "↓" : "↑"}</span>}{" "}
      </button>{" "}
    </th>
  );
}
interface LotRowProps {
  lot: InventoryLot;
  ingredient: Ingredient | null;
  vendor: VendorCatalogEntry | null;
}
function LotRow({ lot, ingredient, vendor }: LotRowProps) {
  const expired = isExpired(lot.expDate);
  return (
    <tr className="border-b border-sky-400/10">
      {" "}
      <td className="px-4 py-4 align-top">
        {" "}
        <div className="font-semibold text-sky-100">
          {" "}
          {ingredient?.name ?? lot.ingredientId}{" "}
        </div>{" "}
        <div className="mt-1 text-xs text-sky-200/70">
          {" "}
          {ingredient?.spec ?? "No spec recorded"}{" "}
        </div>{" "}
        <div className="mt-2 text-[10px] uppercase tracking-[0.25em] text-sky-300/60">
          {" "}
          Lot ID {lot.id}{" "}
        </div>{" "}
      </td>{" "}
      <td className="px-4 py-4 align-top text-xs text-sky-100">
        {" "}
        <div className="font-medium">
          {" "}
          {vendor?.vendorName ?? lot.source.vendorId}{" "}
        </div>{" "}
        <div className="text-[10px] uppercase tracking-[0.25em] text-sky-200/60">
          {" "}
          PO {lot.source.poId}{" "}
        </div>{" "}
      </td>{" "}
      <td className="px-4 py-4 align-top text-right text-sky-100">
        {" "}
        {lot.qtyOnHandBase.toFixed(2)}{" "}
      </td>{" "}
      <td className="px-4 py-4 align-top text-right text-sky-100">
        {" "}
        ${lot.unitCostPerBase.toFixed(2)}{" "}
      </td>{" "}
      <td
        className={`px-4 py-4 align-top text-xs ${expired ? "text-amber-300" : "text-sky-200/80"}`}
      >
        {" "}
        {lot.expDate ? formatDate(lot.expDate) : "—"}{" "}
      </td>{" "}
      <td className="px-4 py-4 align-top text-xs text-sky-200/70">
        {" "}
        <div>PO Line {lot.source.poLineId}</div>{" "}
        <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-sky-200/50">
          {" "}
          Created {formatDateTime(lot.createdAt)}{" "}
        </div>{" "}
      </td>{" "}
    </tr>
  );
}
function compareLots(
  a: InventoryLot,
  b: InventoryLot,
  key: "createdAt" | "qty" | "cost",
  dir: 1 | -1,
) {
  switch (key) {
    case "qty":
      return dir * (a.qtyOnHandBase - b.qtyOnHandBase);
    case "cost":
      return dir * (a.unitCostPerBase - b.unitCostPerBase);
    case "createdAt":
    default:
      return dir * a.createdAt.localeCompare(b.createdAt);
  }
}
function formatDate(iso?: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString();
}
function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}
function isExpired(iso?: string) {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date < now;
}
