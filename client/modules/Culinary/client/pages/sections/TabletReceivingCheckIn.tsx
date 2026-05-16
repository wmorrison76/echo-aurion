import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart } from "lucide-react";
import { TabletNav } from "@/components/TabletNav";
import { TabletBackButton } from "@/components/TabletBackButton";
import { TabletReceivingCheckIn } from "@/components/TabletReceivingCheckIn";

export default function TabletReceivingCheckInPage() {
  const { toast } = useToast();
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
                <div className="flex items-center gap-3 mb-2">
                  <ShoppingCart className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                    Receiving Check-In
                  </h1>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Confirm delivery orders and check in items
                </p>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Device ID
                </p>
                <p className="text-sm font-mono text-slate-700 dark:text-slate-300">
                  {deviceId}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <TabletReceivingCheckIn deviceId={deviceId} />
        </div>
      </div>
    </div>
  );
}
