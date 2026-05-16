import React, { useState } from "react";
import { Zap, Plus, Calendar, Truck, TrendingUp } from "lucide-react";

export interface AdvancedOrderingPanelProps {
  panelId?: string;
}

export function AdvancedOrderingPanel({ panelId = "ADV-1" }: AdvancedOrderingPanelProps) {
  const [activeTab, setActiveTab] = useState<"bulk" | "recurring" | "forecasts">("bulk");

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="h-6 w-6 text-amber-400" />
          <h1 className="text-2xl font-bold">Advanced Ordering</h1>
        </div>
        <p className="text-slate-400">Bulk orders, recurring shipments, and demand forecasting</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 px-6 bg-slate-800/50">
        {(["bulk", "recurring", "forecasts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-300"
            }`}
          >
            {tab === "bulk"
              ? "Bulk Orders"
              : tab === "recurring"
              ? "Recurring Shipments"
              : "Demand Forecasts"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {activeTab === "bulk" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Create Bulk Order</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg font-medium transition-colors">
                <Plus className="h-4 w-4" />
                New Order
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-slate-700 rounded-lg border border-slate-600 hover:border-amber-500/50 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">Bulk Order #{1000 + i}</h3>
                    <span className="text-xs px-2 py-1 bg-slate-600 rounded">Draft</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">
                    {5 + i * 2} items • $12,{500 + i * 1000}
                  </p>
                  <div className="flex gap-2">
                    <button className="text-xs px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded transition-colors">
                      Review
                    </button>
                    <button className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-700 rounded transition-colors">
                      Submit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "recurring" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Recurring Shipments</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg font-medium transition-colors">
                <Plus className="h-4 w-4" />
                Schedule Shipment
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                { vendor: "Fresh Produce Co", frequency: "Weekly", next: "Jan 22" },
                { vendor: "Premium Meats Inc", frequency: "Bi-weekly", next: "Jan 25" },
                { vendor: "Dairy Direct", frequency: "Daily", next: "Today" },
              ].map((shipment, i) => (
                <div key={i} className="p-4 bg-slate-700 rounded-lg border border-slate-600 flex justify-between items-center hover:border-amber-500/50 transition-colors">
                  <div>
                    <h3 className="font-semibold">{shipment.vendor}</h3>
                    <p className="text-sm text-slate-400">{shipment.frequency} deliveries</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-medium">Next: {shipment.next}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "forecasts" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Demand Forecasts</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg font-medium transition-colors">
                <TrendingUp className="h-4 w-4" />
                Run Analysis
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { category: "Proteins", trend: "+12%", recommendation: "Increase by 15%" },
                { category: "Produce", trend: "+8%", recommendation: "Stable" },
                { category: "Dairy", trend: "-3%", recommendation: "Slight reduction" },
                { category: "Dry Goods", trend: "+5%", recommendation: "Modest increase" },
              ].map((forecast, i) => (
                <div key={i} className="p-4 bg-slate-700 rounded-lg border border-slate-600">
                  <h3 className="font-semibold mb-2">{forecast.category}</h3>
                  <div className="text-2xl font-bold text-amber-400 mb-2">{forecast.trend}</div>
                  <p className="text-xs text-slate-400">{forecast.recommendation}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
