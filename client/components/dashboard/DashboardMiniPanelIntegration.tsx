import React from "react";
import { MiniPanelConfig } from "@/lib/mini-panel-storage";

interface DashboardMiniPanelProps {
  panelId: string;
  config: MiniPanelConfig;
}

export function DashboardMiniPanelContent({
  panelId,
  config,
}: DashboardMiniPanelProps) {
  return (
    <div className="p-0.5 text-foreground/60 text-sm space-y-0.5">
      <p className="font-semibold text-xs leading-tight">{config.title}</p>
      <p className="text-xs leading-tight">Mini panel content for: {panelId}</p>
      <div className="p-0.5 bg-primary/5 border border-primary/20 rounded text-xs">
        Data will load when connected to Supabase
      </div>
    </div>
  );
}
