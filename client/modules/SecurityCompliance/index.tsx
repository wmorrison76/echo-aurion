import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import SecurityComplianceDashboard from "./client/pages/SecurityComplianceDashboard";
export interface SecurityCompliancePanelProps {
  panelId?: string;
  onClose?: () => void;
  onMinimize?: () => void;
}
export default function SecurityCompliancePanel({
  panelId,
  onClose,
  onMinimize,
}: SecurityCompliancePanelProps) {
  return (
    <PanelFrame
      title="Security & Compliance"
      subtitle="Role-based access, audit trails, and GDPR compliance"
      status="Active"
      chrome={true}
      className="h-full w-full"
    >
      {" "}
      <SecurityComplianceDashboard
        onClose={onClose}
        onMinimize={onMinimize}
      />{" "}
    </PanelFrame>
  );
}
