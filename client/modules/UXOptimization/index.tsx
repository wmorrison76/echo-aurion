import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import UXOptimizationDashboard from "./client/pages/UXOptimizationDashboard";
export interface UXOptimizationPanelProps {
  panelId?: string;
  onClose?: () => void;
  onMinimize?: () => void;
}
export default function UXOptimizationPanel({
  panelId,
  onClose,
  onMinimize,
}: UXOptimizationPanelProps) {
  return (
    <PanelFrame
      title="UX Optimization"
      subtitle="Minimal clicks, smart defaults, and batch operations"
      status="Active"
      chrome={true}
      className="h-full w-full"
    >
      {" "}
      <UXOptimizationDashboard onClose={onClose} onMinimize={onMinimize} />{" "}
    </PanelFrame>
  );
}
