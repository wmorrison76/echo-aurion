import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import type { PurchaseOrder, PurchaseOrderLine } from "../data/schemas";
import type { Ingredient } from "../data/schemas";
import type { InventoryLot } from "../data/schemas";
import type {
  VendorCatalogEntry,
  VendorCatalogEntry as Vendor,
} from "../utils/vendors";
import { loadIngredientsMap, loadVendorCatalog } from "../services/fixtures";
import { useReceiving } from "../hooks/useReceiving";
import { roundCurrency } from "../utils/cost";
export interface ReceivingPanelProps {
  panelId: string;
  onClose?: () => void;
  onMinimize?: () => void;
}
interface ReceiptFormLine {
  qtyPacks: number;
  unitCostPerPack: number;
  expDate?: string;
  vendorRef?: string;
}
interface VendorLookups {
  byId: Map<string, Vendor>;
  itemById: Map<string, Vendor["items"][number]>;
}
export function ReceivingPanel({
  panelId,
  onClose,
  onMinimize,
}: ReceivingPanelProps) {
  const { orders, lots, receive } = useReceiving();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [formLines, setFormLines] = useState<Record<string, ReceiptFormLine>>(
    {},
  );
  const [receivedAt, setReceivedAt] = useState<string>(() =>
    toInputDateTime(new Date().toISOString()),
  );
  const [ingredients, setIngredients] = useState<Record<string, Ingredient>>(
    {},
  );
  const [vendorCatalog, setVendorCatalog] = useState<VendorCatalogEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const dataLoaded = useRef(false);
  useEffect(() => {
    if (dataLoaded.current) return;
    dataLoaded.current = true;
    let active = true;
    (async () => {
      setLoadingData(true);
      try {
        const [ingredientMap, catalog] = await Promise.all([
          loadIngredientsMap(),
          loadVendorCatalog(),
        ]);
        if (!active) return;
        setIngredients(ingredientMap);
        setVendorCatalog(catalog);
      } finally {
        if (active) {
          setLoadingData(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  const orderList = useMemo(() => {
    return Object.values(orders)
      .slice()
      .sort((a, b) => {
        const priority = statusPriority(b.status) - statusPriority(a.status);
        if (priority !== 0) return priority;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [orders]);
  useEffect(() => {
    if (!orderList.length) {
      setSelectedOrderId(null);
      return;
    }
    setSelectedOrderId((current) => {
      if (current && orderList.some((po) => po.id === current)) {
        return current;
      }
      const next =
        orderList.find((po) => po.status === "SUBMITTED") ?? orderList[0];
      return next?.id ?? null;
    });
  }, [orderList]);
  const selectedOrder = useMemo<PurchaseOrder | null>(() => {
    if (!selectedOrderId) return null;
    return orderList.find((po) => po.id === selectedOrderId) ?? null;
  }, [orderList, selectedOrderId]);
  useEffect(() => {
    if (!selectedOrder) {
      setFormLines({});
      return;
    }
    const defaults: Record<string, ReceiptFormLine> = {};
    selectedOrder.lines.forEach((line) => {
      const remaining = Math.max(
        0,
        roundCurrency(line.qty - (line.receivedQty ?? 0)),
      );
      defaults[line.id] = {
        qtyPacks: remaining,
        unitCostPerPack: line.unitCost,
        expDate: undefined,
        vendorRef: undefined,
      };
    });
    setFormLines(defaults);
    setReceivedAt(toInputDateTime(new Date().toISOString()));
    setError(null);
    setSuccess(null);
  }, [selectedOrderId, selectedOrder]);
  const vendorLookups = useMemo<VendorLookups>(() => {
    const byId = new Map<string, Vendor>();
    const itemById = new Map<string, Vendor["items"][number]>();
    vendorCatalog.forEach((entry) => {
      byId.set(entry.vendorId, entry);
      entry.items.forEach((item) => {
        itemById.set(item.id, item);
      });
    });
    return { byId, itemById };
  }, [vendorCatalog]);
  const lotsForOrder = useMemo<InventoryLot[]>(() => {
    if (!selectedOrder) return [];
    return lots.filter((lot) => lot.source.poId === selectedOrder.id);
  }, [lots, selectedOrder]);
  const outstandingSummary = useMemo(() => {
    if (!selectedOrder) return { outstanding: 0, received: 0, total: 0 };
    const total = selectedOrder.lines.reduce((sum, line) => sum + line.qty, 0);
    const receivedTotal = selectedOrder.lines.reduce(
      (sum, line) => sum + (line.receivedQty ?? 0),
      0,
    );
    return {
      outstanding: Math.max(0, roundCurrency(total - receivedTotal)),
      received: roundCurrency(receivedTotal),
      total: roundCurrency(total),
    };
  }, [selectedOrder]);
  const handleQtyChange = useCallback((lineId: string, value: number) => {
    setFormLines((prev) => {
      const current = prev[lineId];
      if (!current) return prev;
      const qty = Number.isFinite(value)
        ? Math.max(0, roundCurrency(value))
        : 0;
      if (qty === current.qtyPacks) return prev;
      return { ...prev, [lineId]: { ...current, qtyPacks: qty } };
    });
  }, []);
  const handleCostChange = useCallback((lineId: string, value: number) => {
    setFormLines((prev) => {
      const current = prev[lineId];
      if (!current) return prev;
      const cost = Number.isFinite(value)
        ? Math.max(0, roundCurrency(value))
        : 0;
      if (cost === current.unitCostPerPack) return prev;
      return { ...prev, [lineId]: { ...current, unitCostPerPack: cost } };
    });
  }, []);
  const handleExpDateChange = useCallback((lineId: string, value: string) => {
    setFormLines((prev) => {
      const current = prev[lineId];
      if (!current) return prev;
      return {
        ...prev,
        [lineId]: { ...current, expDate: value ? value : undefined },
      };
    });
  }, []);
  const handleVendorRefChange = useCallback((lineId: string, value: string) => {
    setFormLines((prev) => {
      const current = prev[lineId];
      if (!current) return prev;
      return {
        ...prev,
        [lineId]: { ...current, vendorRef: value ? value : undefined },
      };
    });
  }, []);
  const handleReceive = useCallback(async () => {
    if (!selectedOrder) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const linesPayload = selectedOrder.lines
        .map((line) => {
          const entry = formLines[line.id];
          if (!entry) return null;
          const qty = Math.max(0, entry.qtyPacks);
          if (!Number.isFinite(qty) || qty <= 0) return null;
          return {
            poLineId: line.id,
            qtyPacks: qty,
            unitCostPerPack: entry.unitCostPerPack,
            expDate:
              entry.expDate && entry.expDate.length >= 10
                ? entry.expDate
                : undefined,
            vendorRef: entry.vendorRef,
          };
        })
        .filter((line): line is NonNullable<typeof line> => line != null);
      if (!linesPayload.length) {
        setError("Enter at least one quantity to receive.");
        return;
      }
      const payload = {
        poId: selectedOrder.id,
        receivedAt: receivedAt ? new Date(receivedAt).toISOString() : undefined,
        lines: linesPayload,
      };
      await receive(payload);
      setSuccess("Receipt recorded successfully.");
      setFormLines((prev) => {
        const next: Record<string, ReceiptFormLine> = {};
        Object.keys(prev).forEach((lineId) => {
          next[lineId] = { ...prev[lineId], qtyPacks: 0 };
        });
        return next;
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [formLines, receive, receivedAt, selectedOrder]);
  if (!selectedOrder && !orderList.length) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-border bg-background text-foreground shadow-[0_18px_40px_rgba(15,23,42,0.12)] transition dark:border-emerald-400/40 dark:bg-card dark:text-emerald-100 dark:shadow-[0_0_45px_rgba(16,185,129,0.32)]">
        {" "}
        <header className="flex items-center justify-between border-b border-border px-4 py-3 dark:border-emerald-400/25">
          {" "}
          <div>
            {" "}
            <div className="text-[11px] uppercase tracking-[0.35em] text-emerald-500/70 dark:text-emerald-200/70">
              {" "}
              Panel {panelId}{" "}
            </div>{" "}
            <h2 className="text-lg font-semibold text-emerald-700 dark:text-emerald-100">
              {" "}
              Receiving{" "}
            </h2>{" "}
          </div>{" "}
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-emerald-600/70 dark:text-emerald-100/70">
            {" "}
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1 text-foreground transition dark:border-emerald-400/40 dark:text-emerald-100"
              onClick={onMinimize}
            >
              {" "}
              Minimize{" "}
            </button>{" "}
            <button
              type="button"
              className="rounded-md border border-red-500/50 px-3 py-1 text-red-600 transition dark:border-red-400/40 dark:text-red-200"
              onClick={onClose}
            >
              {" "}
              Close{" "}
            </button>{" "}
          </div>{" "}
        </header>{" "}
        <div className="flex flex-1 items-center justify-center text-sm text-emerald-600/70 dark:text-emerald-200/70">
          {" "}
          No purchase orders available for receiving yet.{" "}
        </div>{" "}
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-[0_20px_45px_rgba(15,23,42,0.12)] transition dark:border-emerald-400/45 dark:bg-card dark:text-emerald-100 dark:shadow-[0_0_50px_rgba(16,185,129,0.34)]">
      {" "}
      <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-4 dark:border-emerald-400/25">
        {" "}
        <div>
          {" "}
          <div className="text-[11px] uppercase tracking-[0.35em] text-emerald-600/80 dark:text-emerald-200/80">
            {" "}
            Panel {panelId}{" "}
          </div>{" "}
          <h2 className="text-xl font-semibold text-emerald-700 dark:text-emerald-100">
            Receiving
          </h2>{" "}
          <p className="mt-1 text-xs text-emerald-600/70 dark:text-emerald-100/70">
            {" "}
            Match deliveries to submitted purchase orders and capture lot
            details.{" "}
          </p>{" "}
        </div>{" "}
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-emerald-600/70 dark:text-emerald-100/70">
          {" "}
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1 text-foreground transition hover:border-slate-500/50 dark:border-emerald-400/40 dark:text-emerald-100 dark:hover:border-emerald-200/70"
            onClick={onMinimize}
          >
            {" "}
            Minimize{" "}
          </button>{" "}
          <button
            type="button"
            className="rounded-md border border-red-500/50 px-3 py-1 text-red-600 transition hover:border-red-400/60 dark:border-red-400/40 dark:text-red-200 dark:hover:border-red-200/70"
            onClick={onClose}
          >
            {" "}
            Close{" "}
          </button>{" "}
        </div>{" "}
      </header>{" "}
      <div className="flex min-h-0 flex-1">
        {" "}
        <aside className="hidden w-72 shrink-0 border-r border-border bg-slate-50 md:block dark:border-emerald-400/20 dark:bg-card">
          {" "}
          <div className="px-4 py-3 text-xs uppercase tracking-[0.3em] text-emerald-600/70 dark:text-emerald-200/70">
            {" "}
            Open Orders{" "}
          </div>{" "}
          <div className="flex h-[calc(100%-3.5rem)] flex-col overflow-y-auto">
            {" "}
            {loadingData && (
              <div className="px-4 py-6 text-xs text-emerald-500/60 dark:text-emerald-200/60">
                {" "}
                Loading vendor catalog…{" "}
              </div>
            )}{" "}
            {!loadingData && !orderList.length && (
              <div className="px-4 py-6 text-xs text-emerald-500/60 dark:text-emerald-200/60">
                {" "}
                No purchase orders available.{" "}
              </div>
            )}{" "}
            <div className="flex-1 space-y-2 px-3 pb-6">
              {" "}
              {orderList.map((order) => {
                const vendor = vendorLookups.byId.get(order.vendorId);
                const isActive = order.id === selectedOrderId;
                const outstanding = Math.max(
                  0,
                  roundCurrency(
                    order.lines.reduce((sum, line) => sum + line.qty, 0) -
                      order.lines.reduce(
                        (sum, line) => sum + (line.receivedQty ?? 0),
                        0,
                      ),
                  ),
                );
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${isActive ? "border-emerald-400/80 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.25)]" : "border-emerald-400/10 bg-card hover:border-emerald-300/40 hover:bg-emerald-500/10"}`}
                  >
                    {" "}
                    <div className="text-[11px] uppercase tracking-[0.3em] text-emerald-500/60 dark:text-emerald-200/60">
                      {" "}
                      {order.status}{" "}
                    </div>{" "}
                    <div className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-100">
                      {" "}
                      {vendor?.vendorName ?? order.vendorId}{" "}
                    </div>{" "}
                    <div className="mt-1 text-xs text-emerald-600/70 dark:text-emerald-200/70">
                      {" "}
                      {new Date(order.createdAt).toLocaleString()} • Outstanding
                      {""} {outstanding.toFixed(2)} packs{" "}
                    </div>{" "}
                  </button>
                );
              })}{" "}
            </div>{" "}
          </div>{" "}
        </aside>{" "}
        <main className="flex-1 overflow-y-auto">
          {" "}
          <div className="p-6">
            {" "}
            {error && (
              <div className="mb-4 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {" "}
                {error}{" "}
              </div>
            )}{" "}
            {success && (
              <div className="mb-4 rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {" "}
                {success}{" "}
              </div>
            )}{" "}
            {!selectedOrder && (
              <div className="rounded-2xl border border-emerald-400/20 bg-card px-6 py-12 text-center text-sm text-emerald-200/70">
                {" "}
                Select a purchase order to begin receiving.{" "}
              </div>
            )}{" "}
            {selectedOrder && (
              <div className="space-y-6">
                {" "}
                <section className="rounded-2xl border border-emerald-400/30 bg-card p-5">
                  {" "}
                  <header className="flex flex-col gap-4 border-b border-emerald-400/20 pb-4 lg:flex-row lg:items-center lg:justify-between">
                    {" "}
                    <div>
                      {" "}
                      <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                        {" "}
                        Vendor{" "}
                      </div>{" "}
                      <div className="text-lg font-semibold text-emerald-100">
                        {" "}
                        {vendorLookups.byId.get(selectedOrder.vendorId)
                          ?.vendorName ?? selectedOrder.vendorId}{" "}
                      </div>{" "}
                      <div className="mt-1 text-xs text-emerald-200/70">
                        {" "}
                        Created {formatDate(selectedOrder.createdAt)}{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="grid grid-cols-1 gap-3 text-sm text-emerald-100 sm:grid-cols-3">
                      {" "}
                      <MetricTile
                        label="Ordered Packs"
                        value={outstandingSummary.total}
                        accent="border-emerald-400/30"
                      />{" "}
                      <MetricTile
                        label="Received Packs"
                        value={outstandingSummary.received}
                        accent="border-emerald-400/30"
                      />{" "}
                      <MetricTile
                        label="Outstanding"
                        value={outstandingSummary.outstanding}
                        accent="border-amber-400/40"
                      />{" "}
                    </div>{" "}
                  </header>{" "}
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {" "}
                    <label className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                      {" "}
                      Receipt Timestamp{" "}
                      <input
                        type="datetime-local"
                        className="mt-2 w-full rounded-xl border border-emerald-400/30 bg-card px-3 py-2 text-sm text-emerald-100 focus:border-emerald-200 focus:outline-none"
                        value={receivedAt}
                        onChange={(event) => setReceivedAt(event.target.value)}
                      />{" "}
                    </label>{" "}
                    <div className="rounded-xl border border-emerald-400/20 bg-card p-4 text-sm text-emerald-100/80">
                      {" "}
                      <div className="text-[11px] uppercase tracking-[0.3em] text-emerald-200/60">
                        {" "}
                        Lots recorded{" "}
                      </div>{" "}
                      <div className="mt-2 text-emerald-100">
                        {" "}
                        {lotsForOrder.length}{" "}
                      </div>{" "}
                      <div className="mt-2 max-h-32 overflow-y-auto text-xs text-emerald-200/70">
                        {" "}
                        {lotsForOrder.length ? (
                          <ul className="space-y-1">
                            {" "}
                            {lotsForOrder.map((lot) => (
                              <li key={lot.id}>
                                {" "}
                                {ingredients[lot.ingredientId]?.name ??
                                  lot.ingredientId}
                                {""} · {lot.qtyOnHandBase.toFixed(2)} base @ ${" "}
                                {lot.unitCostPerBase.toFixed(2)}{" "}
                              </li>
                            ))}{" "}
                          </ul>
                        ) : (
                          <span>No lots recorded yet.</span>
                        )}{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                </section>{" "}
                <section className="rounded-2xl border border-emerald-400/30 bg-card">
                  {" "}
                  <div className="flex items-center justify-between border-b border-emerald-400/20 px-5 py-3">
                    {" "}
                    <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                      {" "}
                      Line Items{" "}
                    </div>{" "}
                    <div className="text-[11px] uppercase tracking-[0.3em] text-emerald-200/60">
                      {" "}
                      Enter delivered pack counts and lot info.{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="overflow-x-auto">
                    {" "}
                    <table className="min-w-full text-sm">
                      {" "}
                      <thead className="bg-card text-[11px] uppercase tracking-[0.25em] text-emerald-200/70">
                        {" "}
                        <tr>
                          {" "}
                          <th className="px-5 py-3 text-left">
                            Ingredient
                          </th>{" "}
                          <th className="px-3 py-3 text-left">Vendor SKU</th>{" "}
                          <th className="px-3 py-3 text-right">Ordered</th>{" "}
                          <th className="px-3 py-3 text-right">Received</th>{" "}
                          <th className="px-3 py-3 text-right">Receive Now</th>{" "}
                          <th className="px-3 py-3 text-right">Unit Cost</th>{" "}
                          <th className="px-3 py-3 text-left">Exp. Date</th>{" "}
                          <th className="px-3 py-3 text-left">
                            Vendor Ref
                          </th>{" "}
                        </tr>{" "}
                      </thead>{" "}
                      <tbody>
                        {" "}
                        {selectedOrder.lines.map((line) => (
                          <ReceivingRow
                            key={line.id}
                            line={line}
                            ingredient={ingredients[line.ingredientId] ?? null}
                            vendorItem={
                              vendorLookups.itemById.get(line.vendorItemId) ??
                              null
                            }
                            entry={
                              formLines[line.id] ?? {
                                qtyPacks: 0,
                                unitCostPerPack: line.unitCost,
                              }
                            }
                            onQtyChange={handleQtyChange}
                            onCostChange={handleCostChange}
                            onExpChange={handleExpDateChange}
                            onRefChange={handleVendorRefChange}
                          />
                        ))}{" "}
                        {!selectedOrder.lines.length && (
                          <tr>
                            {" "}
                            <td
                              colSpan={8}
                              className="px-5 py-8 text-center text-sm text-emerald-200/70"
                            >
                              {" "}
                              No lines on this purchase order.{" "}
                            </td>{" "}
                          </tr>
                        )}{" "}
                      </tbody>{" "}
                    </table>{" "}
                  </div>{" "}
                  <div className="flex justify-end border-t border-emerald-400/20 px-5 py-4">
                    {" "}
                    <button
                      type="button"
                      className="rounded-md border border-emerald-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100 transition hover:border-emerald-200"
                      onClick={handleReceive}
                      disabled={submitting}
                    >
                      {" "}
                      {submitting ? "Recording…" : "Record Receipt"}{" "}
                    </button>{" "}
                  </div>{" "}
                </section>{" "}
              </div>
            )}{" "}
          </div>{" "}
        </main>{" "}
      </div>{" "}
    </div>
  );
}
interface ReceivingRowProps {
  line: PurchaseOrderLine;
  ingredient: Ingredient | null;
  vendorItem: VendorCatalogEntry["items"][number] | null;
  entry: ReceiptFormLine;
  onQtyChange: (lineId: string, value: number) => void;
  onCostChange: (lineId: string, value: number) => void;
  onExpChange: (lineId: string, value: string) => void;
  onRefChange: (lineId: string, value: string) => void;
}
function ReceivingRow({
  line,
  ingredient,
  vendorItem,
  entry,
  onQtyChange,
  onCostChange,
  onExpChange,
  onRefChange,
}: ReceivingRowProps) {
  const ordered = roundCurrency(line.qty);
  const received = roundCurrency(line.receivedQty ?? 0);
  const remaining = Math.max(0, roundCurrency(ordered - received));
  return (
    <tr className="border-b border-emerald-400/10">
      {" "}
      <td className="px-5 py-4 align-top">
        {" "}
        <div className="font-semibold text-emerald-100">
          {" "}
          {ingredient?.name ?? line.ingredientId}{" "}
        </div>{" "}
        <div className="text-xs text-emerald-200/70">
          {" "}
          {vendorItem
            ? `${vendorItem.packSizeQty} ${vendorItem.packSizeUom}`
            : "Pack details unavailable"}{" "}
        </div>{" "}
      </td>{" "}
      <td className="px-3 py-4 align-top text-xs text-emerald-100">
        {" "}
        <div className="font-mono text-sm">{vendorItem?.sku ?? "—"}</div>{" "}
        <div className="text-[11px] uppercase tracking-[0.3em] text-emerald-200/60">
          {" "}
          {vendorItem?.description ?? ""}{" "}
        </div>{" "}
      </td>{" "}
      <td className="px-3 py-4 align-top text-right text-emerald-100">
        {" "}
        {ordered.toFixed(2)}{" "}
      </td>{" "}
      <td className="px-3 py-4 align-top text-right text-emerald-100">
        {" "}
        {received.toFixed(2)}{" "}
      </td>{" "}
      <td className="px-3 py-4 align-top text-right">
        {" "}
        <input
          type="number"
          step="0.01"
          min={0}
          value={entry.qtyPacks}
          onChange={(event) =>
            onQtyChange(line.id, Number.parseFloat(event.target.value))
          }
          className="w-24 rounded-md border border-emerald-400/30 bg-card px-2 py-1 text-right text-sm text-emerald-100 focus:border-emerald-200 focus:outline-none"
        />{" "}
        <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-emerald-200/50">
          {" "}
          Remaining {remaining.toFixed(2)}{" "}
        </div>{" "}
      </td>{" "}
      <td className="px-3 py-4 align-top text-right">
        {" "}
        <input
          type="number"
          step="0.01"
          min={0}
          value={entry.unitCostPerPack}
          onChange={(event) =>
            onCostChange(line.id, Number.parseFloat(event.target.value))
          }
          className="w-28 rounded-md border border-emerald-400/30 bg-card px-2 py-1 text-right text-sm text-emerald-100 focus:border-emerald-200 focus:outline-none"
        />{" "}
      </td>{" "}
      <td className="px-3 py-4 align-top">
        {" "}
        <input
          type="date"
          value={entry.expDate ?? ""}
          onChange={(event) => onExpChange(line.id, event.target.value)}
          className="w-32 rounded-md border border-emerald-400/30 bg-card px-2 py-1 text-sm text-emerald-100 focus:border-emerald-200 focus:outline-none"
        />{" "}
      </td>{" "}
      <td className="px-3 py-4 align-top">
        {" "}
        <input
          type="text"
          value={entry.vendorRef ?? ""}
          onChange={(event) => onRefChange(line.id, event.target.value)}
          placeholder="Invoice # / Lot"
          className="w-36 rounded-md border border-emerald-400/30 bg-card px-2 py-1 text-sm text-emerald-100 focus:border-emerald-200 focus:outline-none"
        />{" "}
      </td>{" "}
    </tr>
  );
}
interface MetricTileProps {
  label: string;
  value: number;
  accent: string;
}
function MetricTile({ label, value, accent }: MetricTileProps) {
  return (
    <div className={`rounded-xl border ${accent} bg-card p-4`}>
      {" "}
      <div className="text-[11px] uppercase tracking-[0.3em] text-emerald-200/70">
        {" "}
        {label}{" "}
      </div>{" "}
      <div className="mt-2 text-xl font-semibold text-emerald-100">
        {" "}
        {value.toFixed(2)}{" "}
      </div>{" "}
    </div>
  );
}
function statusPriority(status: PurchaseOrder["status"]): number {
  switch (status) {
    case "SUBMITTED":
      return 5;
    case "PARTIAL":
      return 4;
    case "DRAFT":
      return 3;
    case "RECEIVED":
      return 2;
    case "CLOSED":
      return 1;
    default:
      return 0;
  }
}
function toInputDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}
