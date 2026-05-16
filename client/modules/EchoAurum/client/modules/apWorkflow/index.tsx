import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import { InvoiceWorkflowPanel } from "./components/InvoiceWorkflowPanel";
export default function APWorkflowPanel(props: any) {
  return (
    <PanelFrame title="AP Workflow" icon="📋" {...props}>
      {" "}
      <div className="h-full overflow-auto">
        {" "}
        <InvoiceWorkflowPanel />{" "}
      </div>{" "}
    </PanelFrame>
  );
}
