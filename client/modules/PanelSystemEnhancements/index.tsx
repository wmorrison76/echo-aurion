import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import PanelSystemDashboard from "./client/pages/PanelSystemDashboard";
export interface PanelSystemEnhancementsPanelProps {
  panelId?: string;
  onClose?: () => void;
  onMinimize?: () => void;
}
export default function PanelSystemEnhancementsPanel({
  panelId,
  onClose,
  onMinimize,
}: PanelSystemEnhancementsPanelProps) {
  return (
    <PanelFrame
      title="Panel System"
      subtitle="Integration verification and enhancements"
      status="Active"
      chrome={true}
      className="h-full w-full"
    >
      {" "}
      <PanelSystemDashboard onClose={onClose} onMinimize={onMinimize} />{" "}
    </PanelFrame>
  );
}
