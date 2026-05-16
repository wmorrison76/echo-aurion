import React, { useMemo } from "react";
import { useMaestro } from "@/contexts/MaestroContext";
interface InventoryPanelProps {
  eventId: string;
}
const statusColors: Record<string, string> = {
  covered: "bg-green-900 text-green-200 border-green-700",
  tight: "bg-yellow-900 text-yellow-200 border-yellow-700",
  short: "bg-red-900 text-red-200 border-red-700",
};
export const InventoryPanel: React.FC<InventoryPanelProps> = ({ eventId }) => {
  const { currentEvent, isLoading } = useMaestro();
  const inventorySummary = useMemo(() => {
    const inventory = currentEvent?.inventoryImpact ?? [];
    return {
      total: inventory.length,
      covered: inventory.filter((i) => i.status === "covered").length,
      tight: inventory.filter((i) => i.status === "tight").length,
      short: inventory.filter((i) => i.status === "short").length,
      totalCost: inventory.reduce((sum, i) => sum + (i.totalCost ?? 0), 0),
    };
  }, [currentEvent?.inventoryImpact]);
  const shortageItems = useMemo(() => {
    return (currentEvent?.inventoryImpact ?? [])
      .filter((i) => i.status === "short")
      .sort((a, b) => (b.shortage ?? 0) - (a.shortage ?? 0));
  }, [currentEvent?.inventoryImpact]);
  if (isLoading) {
    return (
      <div className="animate-pulse">
        {" "}
        <div className="h-8 bg-slate-700 rounded mb-4" />{" "}
        <div className="space-y-3">
          {" "}
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-700 rounded" />
          ))}{" "}
        </div>{" "}
      </div>
    );
  }
  if (!currentEvent) {
    return <p className="text-slate-400">No event selected</p>;
  }
  return (
    <div>
      {" "}
      <h3 className="text-lg font-semibold text-white mb-4">
        {" "}
        Inventory Status{" "}
      </h3>{" "}
      {/* Summary Cards */}{" "}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {" "}
        <div className="bg-green-900 bg-opacity-50 border border-green-700 rounded p-2">
          {" "}
          <div className="text-xs text-green-400 mb-1">Covered</div>{" "}
          <div className="text-xl font-bold text-green-200">
            {" "}
            {inventorySummary.covered}{" "}
          </div>{" "}
        </div>{" "}
        <div className="bg-yellow-900 bg-opacity-50 border border-yellow-700 rounded p-2">
          {" "}
          <div className="text-xs text-yellow-400 mb-1">Tight</div>{" "}
          <div className="text-xl font-bold text-yellow-200">
            {" "}
            {inventorySummary.tight}{" "}
          </div>{" "}
        </div>{" "}
        <div className="bg-red-900 bg-opacity-50 border border-red-700 rounded p-2">
          {" "}
          <div className="text-xs text-red-400 mb-1">Short</div>{" "}
          <div className="text-xl font-bold text-red-200">
            {" "}
            {inventorySummary.short}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Total Cost */}{" "}
      {inventorySummary.totalCost > 0 && (
        <div className="bg-slate-700 rounded p-3 mb-4">
          {" "}
          <div className="text-xs text-slate-400 mb-1">
            {" "}
            Estimated Inventory Cost{" "}
          </div>{" "}
          <div className="text-2xl font-bold text-white">
            {" "}
            ${(inventorySummary.totalCost / 100).toFixed(2)}{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Shortage Alert */}{" "}
      {shortageItems.length > 0 && (
        <div className="bg-red-900 border border-red-700 rounded p-3 mb-4">
          {" "}
          <div className="text-sm font-semibold text-red-200 mb-2">
            {" "}
            {shortageItems.length} Items Short{" "}
          </div>{" "}
          <p className="text-xs text-red-300 mb-3">
            {" "}
            Immediate action required to prevent event impact{" "}
          </p>{" "}
          <button className="w-full px-3 py-2 bg-red-700 hover:bg-red-600 text-red-100 rounded text-xs font-medium transition-colors">
            {" "}
            Auto-Generate PO{" "}
          </button>{" "}
        </div>
      )}{" "}
      {/* Shortage Items */}{" "}
      {shortageItems.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
          {" "}
          <h4 className="text-sm font-semibold text-slate-300">
            Shortages
          </h4>{" "}
          {shortageItems.map((item) => (
            <div
              key={item.id}
              className={`border rounded p-2 text-xs ${statusColors.short}`}
            >
              {" "}
              <div className="font-medium">{item.itemName}</div>{" "}
              <div className="mt-1">
                {" "}
                <div>
                  {" "}
                  Need: {item.required} {item.unit}{" "}
                </div>{" "}
                <div>
                  {" "}
                  Have: {item.onHand} {item.unit}{" "}
                </div>{" "}
                <div className="text-red-300 font-semibold mt-1">
                  {" "}
                  Short: {item.shortage} {item.unit}{" "}
                </div>{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </div>
      )}{" "}
      {/* All Items */}{" "}
      <div>
        {" "}
        <h4 className="text-sm font-semibold text-slate-300 mb-2">
          All Items
        </h4>{" "}
        <p className="text-xs text-slate-400 mb-2">
          {" "}
          {inventorySummary.total} items tracked{" "}
        </p>{" "}
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {" "}
          {(currentEvent.inventoryImpact ?? []).slice(0, 10).map((item) => (
            <div
              key={item.id}
              className={`border rounded p-2 text-xs ${statusColors[item.status] || "bg-slate-700 text-slate-300"}`}
            >
              {" "}
              <div className="flex justify-between">
                {" "}
                <span>{item.itemName}</span>{" "}
                <span className="font-semibold">
                  {" "}
                  {item.required} {item.unit}{" "}
                </span>{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
