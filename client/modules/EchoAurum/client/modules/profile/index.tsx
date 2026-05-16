import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import { ProfileComplianceSection } from "./components/ProfileComplianceSection";
export default function ProfilePanel(props: any) {
  return (
    <PanelFrame title="Profile" icon="👤" {...props}>
      {" "}
      <div className="h-full overflow-auto">
        {" "}
        <ProfileComplianceSection />{" "}
      </div>{" "}
    </PanelFrame>
  );
}
