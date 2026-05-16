import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import { AuditDashboard } from "./pages/AuditDashboard";
export default function AurumPanel(props: any) {
  return (
    <PanelFrame title="EchoAurum" icon="📖" {...props}>
      {" "}
      <div className="h-full overflow-auto">
        {" "}
        <AuditDashboard />{" "}
      </div>{" "}
    </PanelFrame>
  );
}
