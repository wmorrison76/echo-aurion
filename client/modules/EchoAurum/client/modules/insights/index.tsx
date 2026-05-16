import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import { VarianceInsightsPanel } from "./components/VarianceInsightsPanel";
export default function InsightsPanel(props: any) {
  return (
    <PanelFrame title="Insights" icon="💡" {...props}>
      {" "}
      <div className="h-full overflow-auto">
        {" "}
        <VarianceInsightsPanel />{" "}
      </div>{" "}
    </PanelFrame>
  );
}
