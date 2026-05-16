import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import { ArchitecturePanel } from "./components/ArchitecturePanel";
export default function ConsolePanel(props: any) {
  return (
    <PanelFrame title="Console" icon="🖥️" {...props}>
      {" "}
      <div className="h-full overflow-auto">
        {" "}
        <ArchitecturePanel />{" "}
      </div>{" "}
    </PanelFrame>
  );
}
