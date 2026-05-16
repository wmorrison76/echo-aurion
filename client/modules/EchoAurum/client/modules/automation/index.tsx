import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import { AutomationStreamPanel } from "./components/AutomationStreamPanel";
export default function AutomationPanel(props: any) {
  return (
    <PanelFrame title="Automation" icon="⚙️" {...props}>
      {" "}
      <div className="h-full overflow-auto">
        {" "}
        <AutomationStreamPanel />{" "}
      </div>{" "}
    </PanelFrame>
  );
}
