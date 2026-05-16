import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import { OutletPnlPanel } from "./components/OutletPnlPanel";
export default function PnlPanel(props: any) {
  return (
    <PanelFrame title="P&L Analysis" icon="📈" {...props}>
      {" "}
      <div className="h-full overflow-auto">
        {" "}
        <OutletPnlPanel />{" "}
      </div>{" "}
    </PanelFrame>
  );
}
