import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import ClientImportWizard from "./client/pages/ClientImportWizard";
export interface ClientImportPanelProps {
  panelId?: string;
  onClose?: () => void;
  onMinimize?: () => void;
}
export default function ClientImportPanel({
  panelId,
  onClose,
  onMinimize,
}: ClientImportPanelProps) {
  return (
    <PanelFrame
      title="Client Data Import"
      subtitle="CSV/Excel import with validation and mapping"
      status="Active"
      chrome={true}
      className="h-full w-full"
    >
      {" "}
      <ClientImportWizard onClose={onClose} onMinimize={onMinimize} />{" "}
    </PanelFrame>
  );
}
