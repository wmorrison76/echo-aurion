import React, { useState } from "react";
import ResizableDraggablePanel from "./ResizableDraggablePanel";
import IntakePrescreen from "../../modules/cake-builder/IntakePrescreen";
import CakeStudio from "../../modules/cake-builder/CakeStudio";
import { IntakeAnswers } from "../../modules/cake-builder/types";
interface CakeDesignerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
}
export default function CakeDesignerPanel({
  isOpen,
  onClose,
  onMinimize,
}: CakeDesignerPanelProps) {
  const [screen, setScreen] = useState<"intake" | "studio">("intake");
  const [intakeData, setIntakeData] = useState<IntakeAnswers | null>(null);
  if (!isOpen) return null;
  const handleIntakeComplete = (answers: IntakeAnswers) => {
    setIntakeData(answers);
    setScreen("studio");
  };
  const handleBackToIntake = () => {
    setScreen("intake");
  };
  return (
    <ResizableDraggablePanel
      title={`🍰 Cake Designer${screen === "studio" ? " - Design Studio" : ""}`}
      onClose={onClose}
      onMinimize={onMinimize}
      defaultPosition={{ x: 200, y: 100, width: 800, height: 700 }}
      minWidth={500}
      minHeight={400}
    >
      {" "}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          height: "100%",
        }}
      >
        {" "}
        {screen === "intake" ? (
          <IntakePrescreen
            onComplete={handleIntakeComplete}
            onCancel={onClose}
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              height: "100%",
            }}
          >
            {" "}
            <button
              onClick={handleBackToIntake}
              style={{
                padding: "8px 16px",
                backgroundColor: "#333",
                color: "#c8a97e",
                border: "1px solid #444",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              {" "}
              ← Back to Intake Form{" "}
            </button>{" "}
            <div style={{ flex: 1, overflow: "auto" }}>
              {" "}
              <CakeStudio
                onSave={(design, name) => console.log(`Saved: ${name}`, design)}
              />{" "}
            </div>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </ResizableDraggablePanel>
  );
}
