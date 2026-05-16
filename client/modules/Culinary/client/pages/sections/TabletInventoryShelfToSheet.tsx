import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  AlertTriangle,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import { TabletNav } from "@/components/TabletNav";
import { TabletBackButton } from "@/components/TabletBackButton";
import { TabletInventoryShelfCount } from "@/components/TabletInventoryShelfCount";
import { TabletLowStockAlerts } from "@/components/TabletLowStockAlerts";

export default function TabletInventoryShelfToSheet() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("shelf-count");
  const [deviceId] = useState(
    () => localStorage.getItem("tablet:deviceToken") || "unknown-device"
  );

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 flex flex-row overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-64 flex-shrink-0 border-r border-slate-200/50">
        <TabletNav />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <TabletBackButton />
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                  Inventory Management
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Manage shelf counts, stock levels, and daily orders
                </p>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Device ID
                </p>
                <p className="text-sm font-mono text-slate-700">
                  {deviceId}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full h-full"
          >
            <div className="bg-white border-b border-slate-200/50 sticky top-0 z-10">
              <div className="px-6 py-0">
                <TabsList className="grid w-full max-w-3xl grid-cols-2 bg-transparent rounded-none h-auto p-0 gap-0">
                  <TabsTrigger
                    value="shelf-count"
                    className="rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-emerald-600 data-[state=active]:bg-transparent px-6 py-4 text-sm font-semibold"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Monthly Shelf Count
                  </TabsTrigger>
                  <TabsTrigger
                    value="low-stock"
                    className="rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-amber-600 data-[state=active]:bg-transparent px-6 py-4 text-sm font-semibold"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Low Stock & Orders
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <TabsContent value="shelf-count" className="flex-1 overflow-auto">
              <div className="p-6">
                <TabletInventoryShelfCount
                  deviceId={deviceId}
                  onClose={() => setActiveTab("low-stock")}
                />
              </div>
            </TabsContent>

            <TabsContent value="low-stock" className="flex-1 overflow-auto">
              <div className="p-6">
                <TabletLowStockAlerts
                  deviceId={deviceId}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
