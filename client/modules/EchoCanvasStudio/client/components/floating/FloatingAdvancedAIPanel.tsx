import React, { useState } from "react";
import ResizableDraggablePanel from "./ResizableDraggablePanel";
import AdvancedAIPanel from "../editor/AdvancedAIPanel";

interface FloatingAdvancedAIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAIAction: (action: string, params: any) => void;
}

export default function FloatingAdvancedAIPanel({
  isOpen,
  onClose,
  onAIAction,
}: FloatingAdvancedAIPanelProps) {
  if (!isOpen) return null;

  return (
    <ResizableDraggablePanel
      title="🤖 Advanced AI"
      onClose={onClose}
      defaultPosition={{ x: 600, y: 300, width: 450, height: 600 }}
      minWidth={350}
      minHeight={400}
    >
      <div style={{ padding: "16px", height: "100%", overflowY: "auto" }}>
        <AdvancedAIPanel onAIAction={onAIAction} />
      </div>
    </ResizableDraggablePanel>
  );
}
