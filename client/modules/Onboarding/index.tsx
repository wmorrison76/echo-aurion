import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import OnboardingWizard from "./client/pages/OnboardingWizard";
export interface OnboardingPanelProps {
  panelId?: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onComplete?: () => void;
}
export default function OnboardingPanel({
  panelId,
  onClose,
  onMinimize,
  onComplete,
}: OnboardingPanelProps) {
  return (
    <PanelFrame
      title="Welcome to LUCCCA"
      subtitle="Quick setup wizard and guided tour"
      status="Active"
      chrome={true}
      className="h-full w-full"
    >
      {" "}
      <OnboardingWizard
        onClose={onClose}
        onMinimize={onMinimize}
        onComplete={onComplete}
      />{" "}
    </PanelFrame>
  );
}
