import React, { useState } from "react";
import IntakePrescreen from "../cake-builder/IntakePrescreen";
import CakeStudioStep from "../cake-builder/CakeStudioStep";
import OrderSummary from "../cake-builder/OrderSummary";
import type { IntakeAnswers, DesignData } from "../cake-builder/types";

type WorkflowStep = "intake" | "design" | "summary";

interface EchoCanvaCakeOrderProps {
  onOrderComplete?: (design: DesignData, answers: IntakeAnswers) => void;
  onClose?: () => void;
  isPanel?: boolean;
  panelProps?: Record<string, any>;
}

/**
 * EchoCanva Cake Order Module
 * Standalone wrapper component that works both as a route and as a panel
 * in Echo Recipe Pro or other panel-based systems.
 */
export default function EchoCanvaCakeOrder({
  onOrderComplete,
  onClose,
  isPanel = false,
  panelProps = {},
}: EchoCanvaCakeOrderProps) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("intake");
  const [intakeAnswers, setIntakeAnswers] = useState<IntakeAnswers | null>(
    null,
  );
  const [design, setDesign] = useState<DesignData | null>(null);

  const handleIntakeComplete = (answers: IntakeAnswers) => {
    setIntakeAnswers(answers);
    setCurrentStep("design");
  };

  const handleDesignComplete = (designData: DesignData) => {
    setDesign(designData);
    setCurrentStep("summary");
  };

  const handleSummaryComplete = (finalDesign: DesignData) => {
    if (intakeAnswers) {
      onOrderComplete?.(finalDesign, intakeAnswers);
      // Auto-close panel after order completion if in panel mode
      if (isPanel && onClose) {
        setTimeout(onClose, 500);
      }
    }
  };

  const handleBack = () => {
    if (currentStep === "design") {
      setCurrentStep("intake");
    } else if (currentStep === "summary") {
      setCurrentStep("design");
    }
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    } else {
      // Fallback for non-panel mode
      window.history.back();
    }
  };

  const containerStyle = isPanel
    ? {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column" as const,
        overflow: "auto",
        backgroundColor: "#0a0a0a",
      }
    : {
        width: "100%",
        minHeight: "100vh",
      };

  const contentStyle = isPanel
    ? {
        flex: 1,
        overflow: "auto",
        padding: "0",
      }
    : {
        containerMax: "2xl",
        marginX: "auto",
        paddingY: "6",
      };

  return (
    <div style={containerStyle}>
      {isPanel ? (
        <div style={contentStyle}>
          {currentStep === "intake" && (
            <IntakePrescreen
              onComplete={handleIntakeComplete}
              onCancel={handleCancel}
            />
          )}
          {currentStep === "design" && intakeAnswers && (
            <CakeStudioStep
              intakeAnswers={intakeAnswers}
              onComplete={handleDesignComplete}
              onBack={handleBack}
              onCancel={handleCancel}
            />
          )}
          {currentStep === "summary" && design && intakeAnswers && (
            <OrderSummary
              design={design}
              intakeAnswers={intakeAnswers}
              onComplete={handleSummaryComplete}
              onBack={handleBack}
              onCancel={handleCancel}
            />
          )}
        </div>
      ) : (
        <div className="container max-w-2xl mx-auto py-6">
          {currentStep === "intake" && (
            <IntakePrescreen
              onComplete={handleIntakeComplete}
              onCancel={handleCancel}
            />
          )}
          {currentStep === "design" && intakeAnswers && (
            <CakeStudioStep
              intakeAnswers={intakeAnswers}
              onComplete={handleDesignComplete}
              onBack={handleBack}
              onCancel={handleCancel}
            />
          )}
          {currentStep === "summary" && design && intakeAnswers && (
            <OrderSummary
              design={design}
              intakeAnswers={intakeAnswers}
              onComplete={handleSummaryComplete}
              onBack={handleBack}
              onCancel={handleCancel}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Module metadata for Echo Recipe Pro integration
export const ECHO_CANVA_CAKE_ORDER_MODULE = {
  name: "echo-canva-cake-order",
  displayName: "EchoCanva Cake Order",
  description:
    "AI-powered cake order workflow with design assistant and pricing",
  icon: "🎂",
  version: "1.0.0",
  category: "Designer",
};
