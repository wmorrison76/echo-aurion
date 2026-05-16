/***
 * LUCCCA — BUILD 26 (Part 2)
 * ProcurementSummaryCard
 *
 * PURPOSE:
 *  - Simple read-only view of procurement result
 *  - To be embedded in Event Detail Drawer
 ***/

import React from "react";

type ProcurementItem = {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  totalQty: number;
};

export default function ProcurementSummaryCard({
  items,
}: {
  items: ProcurementItem[];
}) {
  if (!items || items.length === 0) {
    return (
      <div className="border border-slate-200 p-3 rounded-md bg-white text-xs text-slate-500">
        No procurement data calculated.
      </div>
    );
  }

  return (
    <div className="border border-slate-200 p-3 rounded-md bg-white text-sm">
      <h3 className="font-semibold text-slate-700">Procurement Summary</h3>
      <div className="mt-2 max-h-48 overflow-y-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="text-slate-500">
              <th className="py-1 pr-2">Ingredient</th>
              <th className="py-1 pr-2 text-right">Qty</th>
              <th className="py-1 text-right">Unit</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.ingredientId} className="border-t border-slate-100">
                <td className="py-1 pr-2">{it.ingredientName}</td>
                <td className="py-1 pr-2 text-right">{it.totalQty}</td>
                <td className="py-1 text-right">{it.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
