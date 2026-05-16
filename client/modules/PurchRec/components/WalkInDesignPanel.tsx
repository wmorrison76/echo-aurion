import React, { useState } from "react";
import { Truck, Plus, Clock, User, Package, CheckCircle2, AlertCircle } from "lucide-react";

interface WalkInVendor {
  id: string;
  name: string;
  arrivalTime: string;
  items: number;
  status: "waiting" | "unloading" | "completed";
  notes?: string;
}

export interface WalkInDesignPanelProps {
  panelId?: string;
}

export function WalkInDesignPanel({ panelId = "WALK-1" }: WalkInDesignPanelProps) {
  const [walkInVendors, setWalkInVendors] = useState<WalkInVendor[]>([
    {
      id: "W001",
      name: "Joe's Fresh Vegetables",
      arrivalTime: "09:30 AM",
      items: 8,
      status: "unloading",
      notes: "Missing invoice - will provide later",
    },
    {
      id: "W002",
      name: "Local Bakery Supply",
      arrivalTime: "10:15 AM",
      items: 5,
      status: "waiting",
    },
    {
      id: "W003",
      name: "Premium Seafood Co",
      arrivalTime: "08:45 AM",
      items: 12,
      status: "completed",
    },
  ]);

  const [showNewVendorForm, setShowNewVendorForm] = useState(false);

  const statusColors = {
    waiting: "bg-blue-500/20 text-blue-600 border-blue-500/30",
    unloading: "bg-amber-500/20 text-amber-600 border-amber-500/30",
    completed: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
  };

  const statusIcons = {
    waiting: <Clock className="h-4 w-4" />,
    unloading: <Package className="h-4 w-4" />,
    completed: <CheckCircle2 className="h-4 w-4" />,
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-teal-400" />
            <h1 className="text-2xl font-bold">Walk-in Vendor Management</h1>
          </div>
          <button
            onClick={() => setShowNewVendorForm(!showNewVendorForm)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Register Vendor
          </button>
        </div>
        <p className="text-slate-400">Quick receiving for walk-in vendors and emergency deliveries</p>
      </div>

      {/* New Vendor Form */}
      {showNewVendorForm && (
        <div className="p-6 border-b border-slate-700 bg-slate-800/50 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Vendor Name"
              className="col-span-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
            <input
              type="text"
              placeholder="Contact Name"
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
            <input
              type="tel"
              placeholder="Phone Number"
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
          </div>
          <textarea
            placeholder="Notes or special instructions..."
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 resize-none"
            rows={3}
          />
          <div className="flex gap-2">
            <button className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg font-medium transition-colors">
              Register & Begin Receiving
            </button>
            <button
              onClick={() => setShowNewVendorForm(false)}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Queue Summary */}
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 grid grid-cols-3 gap-3">
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-slate-400 mb-1">WAITING</p>
          <p className="text-xl font-bold text-blue-400">1</p>
        </div>
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-xs text-slate-400 mb-1">UNLOADING</p>
          <p className="text-xl font-bold text-amber-400">1</p>
        </div>
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <p className="text-xs text-slate-400 mb-1">COMPLETED TODAY</p>
          <p className="text-xl font-bold text-emerald-400">1</p>
        </div>
      </div>

      {/* Vendor Queue */}
      <div className="flex-1 overflow-auto p-6 space-y-3">
        {walkInVendors.map((vendor) => (
          <div
            key={vendor.id}
            className={`p-4 rounded-lg border transition-all ${
              vendor.status === "completed"
                ? "bg-slate-700/50 border-slate-600"
                : "bg-slate-700 border-slate-600 hover:border-teal-500/50"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 pt-1">
                {statusIcons[vendor.status]}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{vendor.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
                      <Clock className="h-3 w-3" />
                      <span>{vendor.arrivalTime}</span>
                    </div>
                  </div>
                  <span
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${
                      statusColors[vendor.status]
                    }`}
                  >
                    {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                  </span>
                </div>

                {vendor.notes && (
                  <div className="flex items-start gap-2 mb-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400">
                    <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <span>{vendor.notes}</span>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-300">{vendor.items} items</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-300">ID: {vendor.id}</span>
                  </div>
                </div>
              </div>

              {vendor.status !== "completed" && (
                <button className="flex-shrink-0 px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg font-medium text-sm transition-colors">
                  {vendor.status === "waiting" ? "Start Receiving" : "Complete"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
