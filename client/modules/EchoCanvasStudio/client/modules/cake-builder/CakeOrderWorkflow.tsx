import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import IntakePrescreen from "./IntakePrescreen";
import CakeStudioStep from "./CakeStudioStep";
import OrderSummary from "./OrderSummary";
import type { IntakeAnswers, DesignData } from "./types";

type WorkflowStep = "intake" | "design" | "summary";

interface CakeOrderWorkflowProps {
  onOrderComplete?: (design: DesignData, answers: IntakeAnswers) => void;
}

export default function CakeOrderWorkflow({
  onOrderComplete,
}: CakeOrderWorkflowProps) {
  const navigate = useNavigate();
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
    navigate("/");
  };

  return (
    <div className="w-full min-h-screen">
      {currentStep === "intake" && (
        <div className="container max-w-2xl mx-auto py-6">
          <IntakePrescreen
            onComplete={handleIntakeComplete}
            onCancel={handleCancel}
          />
        </div>
      )}

      {currentStep === "design" && intakeAnswers && (
        <CakeStudioStep
          intakeAnswers={intakeAnswers}
          onComplete={handleDesignComplete}
          onBack={handleBack}
        />
      )}

      {currentStep === "summary" && design && intakeAnswers && (
        <OrderSummary
          design={design}
          intakeAnswers={intakeAnswers}
          onComplete={handleSummaryComplete}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
