import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { PurchaseOrder, PurchaseOrderLine } from "../data/schemas";
import { loadIngredientsMap, loadVendorCatalog } from "../services/fixtures";
import type { OrderGuideRow } from "../services/orderGuide.service";
import { usePurchaseOrder } from "../hooks/usePurchaseOrder";
import type { Ingredient, VendorItem } from "../data/schemas";
import type { VendorCatalogEntry } from "../utils/vendors";
import { extendedCost, roundCurrency } from "../utils/cost";
export interface OrderFormDrawerProps {
  isOpen: boolean;
  panelId?: string;
  seedRows?: OrderGuideRow[] | null;
  onClose?: () => void;
  onMinimize?: () => void;
}
interface VendorLookups {
  byId: Map<string, VendorCatalogEntry>;
  itemById: Map<string, VendorItem>;
}
interface OrderTotals {
  subtotal: number;
  lineCount: number;
  receivedPacks: number;
}
export function OrderFormDrawer({
  isOpen,
  panelId = "ORD-1",
  seedRows,
  onClose,
  onMinimize,
}: OrderFormDrawerProps) {
  const {
    purchaseOrders,
    generateFromGuide,
    saveOrder,
    submitOrder,
    setStatus,
  } = usePurchaseOrder();
  const [ingredients, setIngredients] = useState<Record<string, Ingredient>>(
    {},
  );
  const [vendorCatalog, setVendorCatalog] = useState<VendorCatalogEntry[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<PurchaseOrder | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const seedFingerprint = useMemo(() => {
    if (!seedRows?.length) return "";
    return seedRows
      .map(
        (row) =>
          `${row.ingredient.id}:${row.vendorItem?.id ?? "novendor"}:${row.suggestedPacks.toFixed(4)}`,
      )
      .sort()
      .join("|");
  }, [seedRows]);
  const lastSeedFingerprint = useRef<string>("");
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
  useEffect(() => {
    if (!isOpen) {
      setActiveOrderId(null);
      setLocalOrder(null);
      setDirty(false);
      lastSeedFingerprint.current = "";
      return;
    }
    if (purchaseOrders.length === 0) {
      setActiveOrderId(null);
      return;
    }
    setActiveOrderId((current) => {
      if (current && purchaseOrders.some((po) => po.id === current)) {
        return current;
      }
      return (
        purchaseOrders
          .slice()
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.id ?? null
      );
    });
  }, [isOpen, purchaseOrders]);
  useEffect(() => {
    if (!open || !seedRows?.length) return;
    if (seedFingerprint && seedFingerprint === lastSeedFingerprint.current)
      return;
    lastSeedFingerprint.current = seedFingerprint;
    setGenerating(true);
    setFormError(null);
    (async () => {
      try {
        const generated = await generateFromGuide(seedRows);
        if (generated.length) {
          const first = generated[0];
          setActiveOrderId(first.id);
          setLocalOrder(cloneOrder(first));
          setDirty(false);
        }
      } catch (error) {
        setFormError((error as Error).message);
      } finally {
        setGenerating(false);
      }
    })();
  }, [isOpen, seedRows, seedFingerprint, generateFromGuide]);
  useEffect(() => {
    if (!activeOrderId) {
      setLocalOrder(null);
      return;
    }
    const nextOrder = purchaseOrders.find((po) => po.id === activeOrderId);
    if (!nextOrder) {
      setLocalOrder(null);
      return;
    }
    setLocalOrder((current) => {
      if (dirty && current && current.id === nextOrder.id) {
        return current;
      }
      return cloneOrder(nextOrder);
    });
    if (!dirty) {
      setDirty(false);
    }
  }, [purchaseOrders, activeOrderId, dirty]);
  const vendorLookups = useMemo<VendorLookups>(() => {
    const byId = new Map<string, VendorCatalogEntry>();
    const itemById = new Map<string, VendorItem>();
    vendorCatalog.forEach((entry) => {
      byId.set(entry.vendorId, entry);
      entry.items.forEach((item) => {
        itemById.set(item.id, item);
      });
    });
    return { byId, itemById };
  }, [vendorCatalog]);
  const sortedOrders = useMemo(() => {
    return purchaseOrders
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [purchaseOrders]);
  const totals = useMemo<OrderTotals>(() => {
    if (!localOrder) {
      return { subtotal: 0, lineCount: 0, receivedPacks: 0 };
    }
    const subtotal = roundCurrency(
      localOrder.lines.reduce(
        (sum, line) => sum + extendedCost(line.unitCost, line.qty),
        0,
      ),
    );
    const received = localOrder.lines.reduce(
      (sum, line) => sum + (line.receivedQty ?? 0),
      0,
    );
    return {
      subtotal,
      lineCount: localOrder.lines.length,
      receivedPacks: received,
    };
  }, [localOrder]);
  const handleSelectOrder = useCallback((orderId: string) => {
    setFormError(null);
    setDirty(false);
    setActiveOrderId(orderId);
  }, []);
  const handleNotesChange = useCallback((value: string) => {
    setLocalOrder((prev) => {
      if (!prev) return prev;
      if (prev.notes === value) return prev;
      setDirty(true);
      return { ...prev, notes: value };
    });
  }, []);
  const handleDeliveryDateChange = useCallback((value: string) => {
    setLocalOrder((prev) => {
      if (!prev) return prev;
      if (prev.requestedDeliveryDate === value) return prev;
      setDirty(true);
      return { ...prev, requestedDeliveryDate: value };
    });
  }, []);
  const handleDeliveryTimeChange = useCallback((value: string) => {
    setLocalOrder((prev) => {
      if (!prev) return prev;
      if (prev.requestedDeliveryTime === value) return prev;
      setDirty(true);
      return { ...prev, requestedDeliveryTime: value };
    });
  }, []);
  const handleDeliveryLocationChange = useCallback((value: string) => {
    setLocalOrder((prev) => {
      if (!prev) return prev;
      if (prev.deliveryLocation === value) return prev;
      setDirty(true);
      return { ...prev, deliveryLocation: value };
    });
  }, []);
  const handleDeliveryMethodChange = useCallback((value: string) => {
    setLocalOrder((prev) => {
      if (!prev) return prev;
      if (prev.deliveryMethod === value) return prev;
      setDirty(true);
      return { ...prev, deliveryMethod: value as any };
    });
  }, []);
  const handleSpecialInstructionsChange = useCallback((value: string) => {
    setLocalOrder((prev) => {
      if (!prev) return prev;
      if (prev.specialInstructions === value) return prev;
      setDirty(true);
      return { ...prev, specialInstructions: value };
    });
  }, []);
  const handleLineQtyChange = useCallback((lineId: string, value: number) => {
    setLocalOrder((prev) => {
      if (!prev) return prev;
      let changed = false;
      const nextLines = prev.lines.map((line) => {
        if (line.id !== lineId) return line;
        const qty = Number.isFinite(value) ? Math.max(0, value) : 0;
        if (qty === line.qty) return line;
        changed = true;
        return { ...line, qty, extCost: extendedCost(line.unitCost, qty) };
      });
      if (!changed) return prev;
      setDirty(true);
      return { ...prev, lines: nextLines };
    });
  }, []);
  const handleLineCostChange = useCallback((lineId: string, value: number) => {
    setLocalOrder((prev) => {
      if (!prev) return prev;
      let changed = false;
      const nextLines = prev.lines.map((line) => {
        if (line.id !== lineId) return line;
        const cost = Number.isFinite(value)
          ? Math.max(0, roundCurrency(value))
          : 0;
        if (cost === line.unitCost) return line;
        changed = true;
        return {
          ...line,
          unitCost: cost,
          extCost: extendedCost(cost, line.qty),
        };
      });
      if (!changed) return prev;
      setDirty(true);
      return { ...prev, lines: nextLines };
    });
  }, []);
  const handleRemoveLine = useCallback((lineId: string) => {
    setLocalOrder((prev) => {
      if (!prev) return prev;
      if (!prev.lines.some((line) => line.id === lineId)) return prev;
      setDirty(true);
      return {
        ...prev,
        lines: prev.lines.filter((line) => line.id !== lineId),
      };
    });
  }, []);
  const handleSave = useCallback(async () => {
    if (!localOrder) return;
    setSaving(true);
    setFormError(null);
    try {
      const normalized = normalizeOrder(localOrder);
      const saved = await saveOrder(normalized);
      setLocalOrder(cloneOrder(saved));
      setDirty(false);
    } catch (error) {
      setFormError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }, [localOrder, saveOrder]);
  const handleSubmit = useCallback(async () => {
    if (!localOrder) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await submitOrder(localOrder.id);
    } catch (error) {
      setFormError((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [localOrder, submitOrder]);
  const handleStatusChange = useCallback(
    async (status: PurchaseOrder["status"]) => {
      if (!localOrder) return;
      setStatusUpdating(true);
      setFormError(null);
      try {
        await setStatus(localOrder.id, status);
        setLocalOrder((prev) => (prev ? { ...prev, status } : prev));
        setDirty(false);
      } catch (error) {
        setFormError((error as Error).message);
      } finally {
        setStatusUpdating(false);
      }
    },
    [localOrder, setStatus],
  );
  if (!isOpen) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-50 flex">
      {" "}
      <div className="absolute inset-0 bg-card backdrop-blur-sm" />{" "}
      <div className="relative ml-auto flex h-full w-full max-w-6xl flex-col border-l border-cyan-400/30 bg-card text-slate-100 shadow-[0_0_45px_rgba(34,211,238,0.16)]">
        {" "}
        <header className="flex items-center justify-between gap-3 border-b border-cyan-400/30 px-6 py-4">
          {" "}
          <div>
            {" "}
            <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-200/80">
              {" "}
              Panel {panelId}{" "}
            </div>{" "}
            <h2 className="text-xl font-semibold text-cyan-100">Order Form</h2>{" "}
            <p className="mt-1 text-xs text-cyan-200/70">
              {" "}
              Draft, review, and submit purchase orders grouped by vendor.{" "}
            </p>{" "}
          </div>{" "}
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-cyan-100/70">
            {" "}
            <button
              type="button"
              className="rounded-md border border-cyan-400/40 px-3 py-1 transition hover:border-cyan-200/70"
              onClick={onMinimize}
            >
              {" "}
              Minimize{" "}
            </button>{" "}
            <button
              type="button"
              className="rounded-md border border-red-400/40 px-3 py-1 text-red-200 transition hover:border-red-200/80"
              onClick={onClose}
            >
              {" "}
              Close{" "}
            </button>{" "}
          </div>{" "}
        </header>{" "}
        <div className="flex min-h-0 flex-1">
          {" "}
          <aside className="hidden w-72 shrink-0 border-r border-cyan-400/20 bg-card md:block">
            {" "}
            <div className="px-4 py-3 text-xs uppercase tracking-[0.3em] text-cyan-200/70">
              {" "}
              Purchase Orders{" "}
            </div>{" "}
            <div className="flex h-[calc(100%-3.5rem)] flex-col overflow-y-auto">
              {" "}
              {loadingData && (
                <div className="px-4 py-6 text-xs text-cyan-200/60">
                  {" "}
                  Loading vendor catalog…{" "}
                </div>
              )}{" "}
              {!loadingData && sortedOrders.length === 0 && (
                <div className="px-4 py-6 text-xs text-cyan-200/60">
                  {" "}
                  No purchase orders yet.{" "}
                </div>
              )}{" "}
              <div className="flex-1 space-y-2 px-3 pb-6">
                {" "}
                {sortedOrders.map((order) => {
                  const vendor = vendorLookups.byId.get(order.vendorId);
                  const isActive = order.id === activeOrderId;
                  const total = roundCurrency(
                    order.lines.reduce((sum, line) => sum + line.extCost, 0),
                  );
                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => handleSelectOrder(order.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${isActive ? "border-cyan-400/80 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.25)]" : "border-cyan-400/10 bg-card hover:border-cyan-300/40 hover:bg-cyan-500/10"}`}
                    >
                      {" "}
                      <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/60">
                        {" "}
                        {order.status}{" "}
                      </div>{" "}
                      <div className="mt-1 text-sm font-semibold text-cyan-100">
                        {" "}
                        {vendor?.vendorName ?? order.vendorId}{" "}
                      </div>{" "}
                      <div className="mt-1 text-xs text-cyan-200/70">
                        {" "}
                        {new Date(order.createdAt).toLocaleString()} • ${" "}
                        {total.toFixed(2)}{" "}
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
              {generating && (
                <div className="mb-4 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                  {" "}
                  Building draft purchase orders from the order guide…{" "}
                </div>
              )}{" "}
              {formError && (
                <div className="mb-4 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {" "}
                  {formError}{" "}
                </div>
              )}{" "}
              {!localOrder && !generating && (
                <div className="rounded-2xl border border-cyan-400/20 bg-card px-6 py-12 text-center text-sm text-cyan-200/70">
                  {" "}
                  Select an order to begin editing.{" "}
                </div>
              )}{" "}
              {localOrder && (
                <div className="space-y-6">
                  {" "}
                  <section className="rounded-2xl border border-cyan-400/30 bg-card p-5">
                    {" "}
                    <header className="flex flex-col gap-3 border-b border-cyan-400/20 pb-4 sm:flex-row sm:items-center sm:justify-between">
                      {" "}
                      <div>
                        {" "}
                        <div className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                          {" "}
                          Vendor{" "}
                        </div>{" "}
                        <div className="text-lg font-semibold text-cyan-100">
                          {" "}
                          {vendorLookups.byId.get(localOrder.vendorId)
                            ?.vendorName ?? localOrder.vendorId}{" "}
                        </div>{" "}
                      </div>{" "}
                      <div className="flex flex-wrap items-center gap-3">
                        {" "}
                        <label className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/70">
                          {" "}
                          Status{" "}
                          <select
                            className="ml-2 rounded-md border border-cyan-400/40 bg-card px-2 py-1 text-xs text-cyan-100"
                            value={localOrder.status}
                            onChange={(event) =>
                              handleStatusChange(
                                event.target.value as PurchaseOrder["status"],
                              )
                            }
                            disabled={statusUpdating || submitting}
                          >
                            {" "}
                            <option value="DRAFT">Draft</option>{" "}
                            <option value="SUBMITTED">Submitted</option>{" "}
                            <option value="PARTIAL">Partial</option>{" "}
                            <option value="RECEIVED">Received</option>{" "}
                            <option value="CLOSED">Closed</option>{" "}
                          </select>{" "}
                        </label>{" "}
                        <button
                          type="button"
                          className="rounded-md border border-cyan-400/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100 transition hover:border-cyan-200"
                          onClick={handleSave}
                          disabled={
                            saving || submitting || statusUpdating || !dirty
                          }
                        >
                          {" "}
                          {saving ? "Saving…" : "Save"}{" "}
                        </button>{" "}
                        <button
                          type="button"
                          className="rounded-md border border-emerald-400/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100 transition hover:border-emerald-300"
                          onClick={handleSubmit}
                          disabled={
                            localOrder.status !== "DRAFT" ||
                            submitting ||
                            saving
                          }
                        >
                          {" "}
                          {submitting ? "Submitting…" : "Submit"}{" "}
                        </button>{" "}
                      </div>{" "}
                    </header>{" "}
                    <div className="mt-4 grid gap-4 text-sm text-cyan-100 sm:grid-cols-3">
                      {" "}
                      <div className="rounded-xl border border-cyan-400/20 bg-card p-4">
                        {" "}
                        <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/70">
                          {" "}
                          Subtotal{" "}
                        </div>{" "}
                        <div className="mt-2 text-xl font-semibold">
                          {" "}
                          ${totals.subtotal.toFixed(2)}{" "}
                        </div>{" "}
                      </div>{" "}
                      <div className="rounded-xl border border-cyan-400/20 bg-card p-4">
                        {" "}
                        <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/70">
                          {" "}
                          Lines{" "}
                        </div>{" "}
                        <div className="mt-2 text-xl font-semibold">
                          {" "}
                          {totals.lineCount}{" "}
                        </div>{" "}
                      </div>{" "}
                      <div className="rounded-xl border border-cyan-400/20 bg-card p-4">
                        {" "}
                        <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/70">
                          {" "}
                          Received Packs{" "}
                        </div>{" "}
                        <div className="mt-2 text-xl font-semibold">
                          {" "}
                          {totals.receivedPacks.toFixed(2)}{" "}
                        </div>{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="mt-5 space-y-4">
                      {" "}
                      <div className="grid gap-4 md:grid-cols-2">
                        {" "}
                        <label className="block text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                          {" "}
                          Requested Delivery Date{" "}
                          <input
                            type="date"
                            className="mt-2 w-full rounded-xl border border-cyan-400/20 bg-card px-3 py-2 text-sm text-cyan-100 focus:border-cyan-300 focus:outline-none"
                            value={localOrder.requestedDeliveryDate ?? ""}
                            onChange={(event) =>
                              handleDeliveryDateChange(event.target.value)
                            }
                          />{" "}
                        </label>{" "}
                        <label className="block text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                          {" "}
                          Requested Delivery Time{" "}
                          <input
                            type="time"
                            className="mt-2 w-full rounded-xl border border-cyan-400/20 bg-card px-3 py-2 text-sm text-cyan-100 focus:border-cyan-300 focus:outline-none"
                            value={localOrder.requestedDeliveryTime ?? ""}
                            onChange={(event) =>
                              handleDeliveryTimeChange(event.target.value)
                            }
                          />{" "}
                        </label>{" "}
                      </div>{" "}
                      <div className="grid gap-4 md:grid-cols-2">
                        {" "}
                        <label className="block text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                          {" "}
                          Delivery Location{" "}
                          <input
                            type="text"
                            className="mt-2 w-full rounded-xl border border-cyan-400/20 bg-card px-3 py-2 text-sm text-cyan-100 focus:border-cyan-300 focus:outline-none"
                            placeholder="e.g., Back dock, Main entrance"
                            value={localOrder.deliveryLocation ?? ""}
                            onChange={(event) =>
                              handleDeliveryLocationChange(event.target.value)
                            }
                          />{" "}
                        </label>{" "}
                        <label className="block text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                          {" "}
                          Delivery Method{" "}
                          <select
                            className="mt-2 w-full rounded-xl border border-cyan-400/20 bg-card px-3 py-2 text-sm text-cyan-100 focus:border-cyan-300 focus:outline-none"
                            value={localOrder.deliveryMethod ?? ""}
                            onChange={(event) =>
                              handleDeliveryMethodChange(event.target.value)
                            }
                          >
                            {" "}
                            <option value="">
                              Select delivery method
                            </option>{" "}
                            <option value="truck">Full Truck Load</option>{" "}
                            <option value="ltl">Less Than Truckload</option>{" "}
                            <option value="parcel">Parcel/Small Package</option>{" "}
                            <option value="pickup">Pickup</option>{" "}
                            <option value="other">Other</option>{" "}
                          </select>{" "}
                        </label>{" "}
                      </div>{" "}
                      <label className="block text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                        {" "}
                        Special Instructions{" "}
                        <textarea
                          className="mt-2 w-full rounded-xl border border-cyan-400/20 bg-card px-3 py-2 text-sm text-cyan-100 focus:border-cyan-300 focus:outline-none"
                          rows={2}
                          value={localOrder.specialInstructions ?? ""}
                          placeholder="Temperature control, fragile items, signature required, etc."
                          onChange={(event) =>
                            handleSpecialInstructionsChange(event.target.value)
                          }
                        />{" "}
                      </label>{" "}
                      <label className="block text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                        {" "}
                        Buyer Notes{" "}
                        <textarea
                          className="mt-2 w-full rounded-xl border border-cyan-400/20 bg-card px-3 py-2 text-sm text-cyan-100 focus:border-cyan-300 focus:outline-none"
                          rows={3}
                          value={localOrder.notes ?? ""}
                          placeholder="Internal notes for receiving or AP"
                          onChange={(event) =>
                            handleNotesChange(event.target.value)
                          }
                        />{" "}
                      </label>{" "}
                    </div>{" "}
                  </section>{" "}
                  <section className="rounded-2xl border border-cyan-400/30 bg-card">
                    {" "}
                    <div className="flex items-center justify-between border-b border-cyan-400/20 px-5 py-3">
                      {" "}
                      <div className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                        {" "}
                        Line Items{" "}
                      </div>{" "}
                      <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/60">
                        {" "}
                        Unit costs and pack quantities reflect vendor catalog
                        defaults.{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="overflow-x-auto">
                      {" "}
                      <table className="min-w-full text-sm">
                        {" "}
                        <thead className="bg-card text-[11px] uppercase tracking-[0.25em] text-cyan-200/70">
                          {" "}
                          <tr>
                            {" "}
                            <th className="px-5 py-3 text-left">
                              Ingredient
                            </th>{" "}
                            <th className="px-3 py-3 text-left">Vendor SKU</th>{" "}
                            <th className="px-3 py-3 text-right">
                              {" "}
                              Qty (packs){" "}
                            </th>{" "}
                            <th className="px-3 py-3 text-right">
                              Unit Cost
                            </th>{" "}
                            <th className="px-3 py-3 text-right">Ext. Cost</th>{" "}
                            <th className="px-3 py-3 text-right">Received</th>{" "}
                            <th className="px-4 py-3" />{" "}
                          </tr>{" "}
                        </thead>{" "}
                        <tbody>
                          {" "}
                          {localOrder.lines.map((line) => {
                            const ingredient =
                              ingredients[line.ingredientId] ?? null;
                            const vendorItem =
                              vendorLookups.itemById.get(line.vendorItemId) ??
                              null;
                            return (
                              <tr
                                key={line.id}
                                className="border-b border-cyan-400/10"
                              >
                                {" "}
                                <td className="px-5 py-4 align-top">
                                  {" "}
                                  <div className="font-semibold text-cyan-100">
                                    {" "}
                                    {ingredient?.name ?? line.ingredientId}{" "}
                                  </div>{" "}
                                  <div className="text-xs text-cyan-200/70">
                                    {" "}
                                    {vendorItem
                                      ? `${vendorItem.packSizeQty} ${vendorItem.packSizeUom}`
                                      : "Pack details unavailable"}{" "}
                                  </div>{" "}
                                </td>{" "}
                                <td className="px-3 py-4 align-top text-xs text-cyan-100">
                                  {" "}
                                  <div className="font-mono text-sm">
                                    {" "}
                                    {vendorItem?.sku ?? "—"}{" "}
                                  </div>{" "}
                                  <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/60">
                                    {" "}
                                    {vendorItem
                                      ? (vendorItem.description ?? "")
                                      : ""}{" "}
                                  </div>{" "}
                                </td>{" "}
                                <td className="px-3 py-4 align-top text-right">
                                  {" "}
                                  <input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={line.qty}
                                    onChange={(event) =>
                                      handleLineQtyChange(
                                        line.id,
                                        Number.parseFloat(event.target.value),
                                      )
                                    }
                                    className="w-24 rounded-md border border-cyan-400/30 bg-card px-2 py-1 text-right text-sm text-cyan-100 focus:border-cyan-300 focus:outline-none"
                                  />{" "}
                                </td>{" "}
                                <td className="px-3 py-4 align-top text-right">
                                  {" "}
                                  <input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={line.unitCost}
                                    onChange={(event) =>
                                      handleLineCostChange(
                                        line.id,
                                        Number.parseFloat(event.target.value),
                                      )
                                    }
                                    className="w-28 rounded-md border border-cyan-400/30 bg-card px-2 py-1 text-right text-sm text-cyan-100 focus:border-cyan-300 focus:outline-none"
                                  />{" "}
                                </td>{" "}
                                <td className="px-3 py-4 align-top text-right font-semibold text-cyan-100">
                                  {" "}
                                  ${" "}
                                  {extendedCost(
                                    line.unitCost,
                                    line.qty,
                                  ).toFixed(2)}{" "}
                                </td>{" "}
                                <td className="px-3 py-4 align-top text-right text-xs text-cyan-200/70">
                                  {" "}
                                  {line.receivedQty?.toFixed(2)} packs{" "}
                                  <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-200/50">
                                    {" "}
                                    {line.receivedQtyBase?.toFixed(2)} base{" "}
                                  </div>{" "}
                                </td>{" "}
                                <td className="px-4 py-4 align-top text-right">
                                  {" "}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLine(line.id)}
                                    className="rounded-md border border-red-400/40 px-2 py-1 text-xs uppercase tracking-[0.3em] text-red-200 transition hover:border-red-300"
                                  >
                                    {" "}
                                    Remove{" "}
                                  </button>{" "}
                                </td>{" "}
                              </tr>
                            );
                          })}{" "}
                          {!localOrder.lines.length && (
                            <tr>
                              {" "}
                              <td
                                colSpan={7}
                                className="px-5 py-8 text-center text-sm text-cyan-200/70"
                              >
                                {" "}
                                No lines in this order.{" "}
                              </td>{" "}
                            </tr>
                          )}{" "}
                        </tbody>{" "}
                      </table>{" "}
                    </div>{" "}
                  </section>{" "}
                </div>
              )}{" "}
            </div>{" "}
          </main>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
function cloneOrder(order: PurchaseOrder): PurchaseOrder {
  return { ...order, lines: order.lines.map((line) => ({ ...line })) };
}
function normalizeOrder(order: PurchaseOrder): PurchaseOrder {
  return { ...order, lines: order.lines.map((line) => normalizeLine(line)) };
}
function normalizeLine(line: PurchaseOrderLine): PurchaseOrderLine {
  const qty = Number.isFinite(line.qty)
    ? Math.max(0, roundCurrency(line.qty))
    : 0;
  const unitCost = Number.isFinite(line.unitCost)
    ? Math.max(0, roundCurrency(line.unitCost))
    : 0;
  return {
    ...line,
    qty,
    unitCost,
    extCost: extendedCost(unitCost, qty),
    receivedQty: line.receivedQty ?? 0,
    receivedQtyBase: line.receivedQtyBase ?? 0,
  };
}
