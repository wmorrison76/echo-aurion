import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import HelpCenterPage from "./pages/HelpCenterPage";
export default function HelpPanel(props: any) {
  return (
    <PanelFrame title="Help & Support" icon="❓" {...props}>
      {" "}
      <div className="h-full overflow-auto">
        {" "}
        <HelpCenterPage />{" "}
      </div>{" "}
    </PanelFrame>
  );
}
