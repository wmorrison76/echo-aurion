import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import WaitlistManager from "./client/pages/WaitlistManager";
export interface WaitlistPanelProps {
  panelId?: string;
  onClose?: () => void;
  onMinimize?: () => void;
}
export default function WaitlistPanel({
  panelId,
  onClose,
  onMinimize,
}: WaitlistPanelProps) {
  return (
    <PanelFrame
      title="Waitlist Management"
      subtitle="Auto-add, priority ranking, and conversion tracking"
      status="Active"
      chrome={true}
      className="h-full w-full"
    >
      {" "}
      <WaitlistManager onClose={onClose} onMinimize={onMinimize} />{" "}
    </PanelFrame>
  );
}
