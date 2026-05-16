import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import BEOExecutionWorkflow from "./client/pages/BEOExecutionWorkflow";
export interface BEOExecutionPanelProps {
  panelId?: string;
  onClose?: () => void;
  onMinimize?: () => void;
  beoId?: string;
}
export default function BEOExecutionPanel({
  panelId,
  onClose,
  onMinimize,
  beoId,
}: BEOExecutionPanelProps) {
  return (
    <PanelFrame
      title="BEO Execution"
      subtitle="Pre-event checklist, day-of coordination, and post-event analysis"
      status="Active"
      chrome={true}
      className="h-full w-full"
    >
      {" "}
      <BEOExecutionWorkflow
        beoId={beoId}
        onClose={onClose}
        onMinimize={onMinimize}
      />{" "}
    </PanelFrame>
  );
}
