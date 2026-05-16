import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import { MigrationToolkitPanel } from "./components/MigrationToolkitPanel";
export default function MigrationPanel(props: any) {
  return (
    <PanelFrame title="Migration Toolkit" icon="🚀" {...props}>
      {" "}
      <div className="h-full overflow-auto">
        {" "}
        <MigrationToolkitPanel />{" "}
      </div>{" "}
    </PanelFrame>
  );
}
