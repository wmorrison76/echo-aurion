import React, { useState, useMemo } from "react";
import { useOrderGuide } from "../hooks/useOrderGuide";
import type { OrderGuideRow } from "../services/orderGuide.service";
export interface OrderGuidePanelProps {
  panelId: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onSendToOrderForm?: (rows: OrderGuideRow[]) => void;
}
export function OrderGuidePanel({
  panelId,
  onClose,
  onMinimize,
  onSendToOrderForm,
}: OrderGuidePanelProps) {
  const { rows, loading, error, refresh, lastUpdated } = useOrderGuide();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };
  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.has(row.ingredient.id)),
    [rows, selectedIds],
  );
  const totalExt = selectedRows.reduce((sum, row) => sum + row.extCost, 0);
  return (
    <div className="flex h-full flex-col rounded-2xl border border-cyan-400/40 bg-card text-slate-100 shadow-[0_0_25px_rgba(34,211,238,0.12)]">
      {" "}
      <header className="flex items-center justify-between gap-2 border-b border-cyan-400/20 px-4 py-3">
        {" "}
        <div>
          {" "}
          <div className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
            {" "}
            Panel {panelId}{" "}
          </div>{" "}
          <h2 className="text-lg font-semibold text-cyan-100">
            Order Guide
          </h2>{" "}
        </div>{" "}
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-cyan-100/70">
          {" "}
          {lastUpdated && (
            <span className="text-[10px] text-cyan-100/50">
              {" "}
              Updated {lastUpdated.toLocaleTimeString()}{" "}
            </span>
          )}{" "}
          <button
            type="button"
            className="rounded-md border border-cyan-400/30 px-3 py-1 transition hover:border-cyan-300/70 disabled:opacity-50"
            onClick={() => void handleRefresh()}
            disabled={loading || isRefreshing}
          >
            {" "}
            {isRefreshing ? "Refreshing..." : "Refresh"}{" "}
          </button>{" "}
          <button
            type="button"
            className="rounded-md border border-cyan-400/30 px-3 py-1 transition hover:border-cyan-300/70"
            onClick={onMinimize}
          >
            {" "}
            Minimize{" "}
          </button>{" "}
          <button
            type="button"
            className="rounded-md border border-red-400/40 px-3 py-1 text-red-200 transition hover:border-red-300/70"
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
          <div className="flex h-full items-center justify-center text-sm text-cyan-100/70">
            {" "}
            Loading order guide…{" "}
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-red-300">
            {" "}
            <span>Unable to build order guide.</span>{" "}
            <span className="text-xs text-red-200/80">{error.message}</span>{" "}
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="rounded-md border border-red-300/40 px-3 py-1 text-red-100 transition hover:border-red-200/70 disabled:opacity-50"
              disabled={isRefreshing}
            >
              {" "}
              {isRefreshing ? "Retrying..." : "Retry"}{" "}
            </button>{" "}
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="min-w-full text-left text-[13px]">
              <thead className="sticky top-0 bg-card text-[11px] uppercase tracking-[0.3em] text-cyan-200/70">
                <tr>
                  <th className="px-4 py-3">Pick</th>
                  <th className="px-4 py-3">Ingredient</th>
                  <th className="px-4 py-3">Vendor SKU</th>
                  <th className="px-4 py-3">Pack / Size</th>
                  <th className="px-4 py-3 text-right">Par</th>
                  <th className="px-4 py-3 text-right">On Hand</th>
                  <th className="px-4 py-3 text-right">Suggest</th>
                  <th className="px-4 py-3 text-right">Unit Cost</th>
                  <th className="px-4 py-3 text-right">Ext. Cost</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.ingredient.id}
                    className="border-b border-cyan-400/10 transition hover:bg-cyan-500/5"
                  >
                    <td className="px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-cyan-400"
                        checked={selectedIds.has(row.ingredient.id)}
                        onChange={() => toggleRow(row.ingredient.id)}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-cyan-100">
                        {row.ingredient.name}
                      </div>
                      <div className="text-xs text-cyan-200/70">
                        {row.ingredient.spec ?? "—"}
                      </div>
                      <div className="mt-2 text-[10px] uppercase tracking-[0.25em] text-cyan-300/60">
                        {row.menuUsage.map((usage) => (
                          <span
                            key={usage.menuItemId}
                            className="mr-2 inline-block"
                          >
                            {usage.menuItemName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {row.vendorItem ? (
                        <div>
                          <div className="font-mono text-sm text-cyan-100">
                            {row.vendorItem.sku}
                          </div>
                          <div className="text-xs text-cyan-200/70">
                            {row.vendor?.vendorName ?? ""}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-red-300">
                          No vendor linked
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-cyan-100/80">
                      {row.packSizeDisplay ?? "—"}
                    </td>
                    <td className="px-4 py-3 align-top text-right text-sm">
                      {row.parLevelBase.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 align-top text-right text-sm">
                      {row.onHandBase.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 align-top text-right text-sm">
                      {row.suggestedBase.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 align-top text-right text-sm">
                      ${row.unitCostBase.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 align-top text-right text-sm">
                      ${row.extCost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}{" "}
      </div>{" "}
      <footer className="border-t border-cyan-400/20 px-4 py-3 text-xs uppercase tracking-[0.3em] text-cyan-100/80">
        {" "}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {" "}
          <div>
            {" "}
            Selected Items: {selectedRows.length} • Est. Total ${" "}
            {totalExt.toFixed(2)}{" "}
          </div>{" "}
          <div className="flex items-center gap-2">
            {" "}
            <button
              type="button"
              className="rounded-md border border-cyan-400/40 px-4 py-1 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200"
              disabled={!selectedRows.length}
              onClick={() => onSendToOrderForm?.(selectedRows)}
            >
              {" "}
              Send to Order Form{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
      </footer>{" "}
    </div>
  );
}
