import React from "react";
import { Trash2 } from "lucide-react";

export default function WasteTrackersWrapper() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="text-center max-w-md">
        <Trash2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">Waste Tracking</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Monitor and reduce food waste across outlets and departments
        </p>
        <div className="inline-block px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
          <p className="text-xs text-blue-700 dark:text-blue-300">Coming Soon</p>
        </div>
      </div>
    </div>
  );
}
