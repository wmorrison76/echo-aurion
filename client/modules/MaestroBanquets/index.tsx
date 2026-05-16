import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import MaestroBanquetsDashboard from "./client/pages/MaestroBanquetsDashboard";
export interface MaestroBanquetsPanelProps {
  panelId?: string;
  onClose?: () => void;
  onMinimize?: () => void;
}
export default function MaestroBanquetsPanel({
  panelId,
  onClose,
  onMinimize,
}: MaestroBanquetsPanelProps) {
  return (
    <PanelFrame
      title="Maestro Banquets"
      subtitle="Banquet operations and event management"
      status="Active"
      chrome={true}
      className="h-full w-full"
    >
      {" "}
      <MaestroBanquetsDashboard
        onClose={onClose}
        onMinimize={onMinimize}
      />{" "}
    </PanelFrame>
  );
}
