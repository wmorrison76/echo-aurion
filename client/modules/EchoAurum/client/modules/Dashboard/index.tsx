import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import Dashboard from "@/pages/Dashboard";
export default function DashboardPanel(props: any) {
  return (
    <PanelFrame title="Dashboard" icon="📊" {...props}>
      {" "}
      <div className="h-full overflow-auto">
        {" "}
        <Dashboard />{" "}
      </div>{" "}
    </PanelFrame>
  );
}
