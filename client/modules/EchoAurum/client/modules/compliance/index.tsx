import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import { ComplianceDashboardPanel } from "./components/ComplianceDashboardPanel";
export default function CompliancePanel(props: any) {
  return (
    <PanelFrame title="Compliance" icon="✓" {...props}>
      {" "}
      <div className="h-full overflow-auto">
        {" "}
        <ComplianceDashboardPanel />{" "}
      </div>{" "}
    </PanelFrame>
  );
}
