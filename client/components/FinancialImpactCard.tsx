/********************************************************************
 * LUCCCA — BUILD 23
 * Financial Impact Snapshot
 *
 * PURPOSE:
 *  - Show instant cost + revenue implications of an event
 *  - Display real-time P&L without needing spreadsheets
 *********************************************************************/

import React from "react";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

export interface FinancialData {
  revenue: number;
  foodCost: number;
  bevCost: number;
  laborCost: number;
  otherCost?: number;
}

export default function FinancialImpactCard({ data }: { data: FinancialData }) {
  const {
    revenue,
    foodCost,
    bevCost,
    laborCost,
    otherCost = 0,
  } = data;

  const totalCost = foodCost + bevCost + laborCost + otherCost;
  const margin = revenue - totalCost;
  const marginPct = revenue > 0 ? ((margin / revenue) * 100).toFixed(1) : "0";
  const costPct = revenue > 0 ? ((totalCost / revenue) * 100).toFixed(1) : "0";

  const isHealthy = Number(marginPct) >= 35;
  const isWarning = Number(marginPct) >= 20 && Number(marginPct) < 35;
  const isDanger = Number(marginPct) < 20;

  const getMarginColor = () => {
    if (isHealthy) return "text-emerald-600 dark:text-emerald-400";
    if (isWarning) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getMarginBgColor = () => {
    if (isHealthy) return "bg-emerald-50 dark:bg-emerald-900/20";
    if (isWarning) return "bg-amber-50 dark:bg-amber-900/20";
    return "bg-red-50 dark:bg-red-900/20";
  };

  const getMarginBorderColor = () => {
    if (isHealthy) return "border-emerald-200 dark:border-emerald-700";
    if (isWarning) return "border-amber-200 dark:border-amber-700";
    return "border-red-200 dark:border-red-700";
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 p-4 rounded-md bg-white dark:bg-slate-800 text-sm w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200">
          Financial Impact
        </h3>
        <DollarSign className="w-4 h-4 text-slate-400 dark:text-slate-500" />
      </div>

      {/* Revenue section */}
      <div className="space-y-1 p-3 rounded-md bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">
          Revenue
        </div>
        <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
          ${revenue.toLocaleString()}
        </div>
      </div>

      {/* Costs breakdown */}
      <div className="space-y-2">
        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">
          Costs
        </div>
        <div className="space-y-1 text-slate-600 dark:text-slate-300">
          <div className="flex justify-between text-xs">
            <span>Food Cost:</span>
            <span className="font-mono">${foodCost.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Beverage Cost:</span>
            <span className="font-mono">${bevCost.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Labor Cost:</span>
            <span className="font-mono">${laborCost.toLocaleString()}</span>
          </div>
          {otherCost > 0 && (
            <div className="flex justify-between text-xs">
              <span>Other Cost:</span>
              <span className="font-mono">${otherCost.toLocaleString()}</span>
            </div>
          )}
        </div>
        <div className="border-t border-slate-200 dark:border-slate-600 pt-1 mt-1">
          <div className="flex justify-between text-xs font-medium">
            <span>Total Cost:</span>
            <span className="font-mono">${totalCost.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Margin section */}
      <div
        className={`p-3 rounded-md border space-y-1 ${getMarginBgColor()} ${getMarginBorderColor()}`}
      >
        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">
          Contribution Margin
        </div>
        <div className={`text-2xl font-bold ${getMarginColor()} flex items-center gap-2`}>
          ${margin.toLocaleString()}
          {isHealthy && <TrendingUp className="w-5 h-5" />}
          {isDanger && <TrendingDown className="w-5 h-5" />}
        </div>
        <div className={`text-xs ${getMarginColor()} font-semibold`}>
          {marginPct}% Margin ({costPct}% Cost of Sales)
        </div>
      </div>

      {/* Health indicator */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">Status:</span>
          {isHealthy && (
            <span className="px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200 font-medium">
              ✓ Healthy
            </span>
          )}
          {isWarning && (
            <span className="px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 font-medium">
              ⚠️ Monitor
            </span>
          )}
          {isDanger && (
            <span className="px-2 py-1 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 font-medium">
              🚨 Marginal
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
