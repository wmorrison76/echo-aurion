import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import NotificationCenter from "./client/pages/NotificationCenter";
export interface NotificationPanelProps {
  panelId?: string;
  onClose?: () => void;
  onMinimize?: () => void;
}
export default function NotificationPanel({
  panelId,
  onClose,
  onMinimize,
}: NotificationPanelProps) {
  return (
    <PanelFrame
      title="Notifications"
      subtitle="Multi-channel notification center"
      status="Active"
      chrome={true}
      className="h-full w-full"
    >
      {" "}
      <NotificationCenter onClose={onClose} onMinimize={onMinimize} />{" "}
    </PanelFrame>
  );
}
