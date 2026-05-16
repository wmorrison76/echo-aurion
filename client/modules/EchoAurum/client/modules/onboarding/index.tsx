import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import { OnboardingPlaybookPanel } from "./components/OnboardingPlaybookPanel";
export default function OnboardingPanel(props: any) {
  return (
    <PanelFrame title="Onboarding" icon="📚" {...props}>
      {" "}
      <div className="h-full overflow-auto">
        {" "}
        <OnboardingPlaybookPanel />{" "}
      </div>{" "}
    </PanelFrame>
  );
}
