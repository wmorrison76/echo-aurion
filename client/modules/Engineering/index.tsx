import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import EngineeringModule from "./client/pages/EngineeringDashboard";
export interface EngineeringPanelProps {
  panelId?: string;
  onClose?: () => void;
  onMinimize?: () => void;
}
export default function EngineeringPanel({
  panelId,
  onClose,
  onMinimize,
}: EngineeringPanelProps) {
  return (
    <PanelFrame
      title="Engineering & HVAC"
      subtitle="Temperature Control & Facility Management"
      status="Active"
      chrome={true}
      className="h-full w-full"
    >
      {" "}
      <EngineeringModule onClose={onClose} onMinimize={onMinimize} />{" "}
    </PanelFrame>
  );
}
