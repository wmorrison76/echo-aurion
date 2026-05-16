import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Walkthrough } from "@/lib/tier-help-content";
import {
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Lightbulb,
} from "lucide-react";

interface Props {
  walkthrough: Walkthrough;
  onClose: () => void;
}

export function EnterpriseInteractiveWalkthrough({
  walkthrough,
  onClose,
}: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showTips, setShowTips] = useState(true);

  const step = walkthrough.steps[currentStep];
  const isLastStep = currentStep === walkthrough.steps.length - 1;
  const isCompleted = completedSteps.includes(currentStep);

  const handleNext = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    if (!isLastStep) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (!isLastStep) {
      setCurrentStep(currentStep + 1);
    }
  };

  const progress = ((currentStep + 1) / walkthrough.steps.length) * 100;

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg border border-slate-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {walkthrough.title}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {walkthrough.description}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={onClose}
            className="text-white border-slate-600 hover:bg-slate-700"
          >
            ← Exit
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">
              Step {currentStep + 1} of {walkthrough.steps.length}
            </span>
            <span className="text-blue-400 font-medium">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Difficulty & Time */}
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-xs capitalize">
            {walkthrough.difficulty}
          </Badge>
          <Badge variant="outline" className="text-xs text-slate-400">
            ~{walkthrough.estimatedTime} min remaining
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Current Step */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-white text-lg">
                  Step {step.number}: {step.title}
                </CardTitle>
                <CardDescription className="mt-1">
                  {step.description}
                </CardDescription>
              </div>
              {isCompleted && (
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Action */}
            <div className="p-4 bg-slate-900 rounded-lg border border-blue-700 border-l-4">
              <h4 className="text-blue-400 font-medium text-sm mb-2 flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                Action Required
              </h4>
              <p className="text-white text-sm">{step.action}</p>
            </div>

            {/* Tips */}
            {showTips && step.tips.length > 0 && (
              <div className="p-4 bg-yellow-900/20 rounded-lg border border-yellow-700">
                <h4 className="text-yellow-400 font-medium text-sm mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Tips & Tricks
                </h4>
                <ul className="space-y-1">
                  {step.tips.map((tip, idx) => (
                    <li key={idx} className="text-sm text-yellow-100">
                      • {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Validation Question */}
            {step.validation && (
              <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-700">
                <h4 className="text-purple-400 font-medium text-sm mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Check Your Understanding
                </h4>
                <p className="text-white text-sm mb-3">
                  {step.validation.question}
                </p>
                <p className="text-xs text-purple-300 italic">
                  (Correct answers: {step.validation.correctAnswers.join(", ")})
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step Navigation Preview */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400 uppercase">
            Next Steps
          </p>
          <div className="space-y-1">
            {walkthrough.steps
              .slice(
                currentStep + 1,
                Math.min(currentStep + 3, walkthrough.steps.length),
              )
              .map((nextStep, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-slate-800 rounded text-xs text-slate-400"
                >
                  → {nextStep.title}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-slate-700 space-y-4">
        {/* Toggle Tips */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-400">
            <input
              type="checkbox"
              checked={showTips}
              onChange={(e) => setShowTips(e.target.checked)}
              className="rounded"
            />
            Show tips
          </label>
          <span className="text-xs text-slate-500">
            {completedSteps.length} of {walkthrough.steps.length} steps
            completed
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-2">
          <Button
            onClick={handleBack}
            disabled={currentStep === 0}
            variant="outline"
            className="border-slate-600 text-white hover:bg-slate-700"
          >
            ← Back
          </Button>

          {!isLastStep && (
            <Button
              onClick={handleSkip}
              variant="ghost"
              className="text-slate-400 hover:text-white"
            >
              Skip
            </Button>
          )}

          <Button
            onClick={handleNext}
            className={`col-span-2 ${
              isLastStep
                ? "bg-green-600 hover:bg-green-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isLastStep ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete Walkthrough
              </>
            ) : (
              <>
                Next Step
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Success Message */}
        {isLastStep && completedSteps.includes(currentStep) && (
          <div className="p-4 bg-green-900/20 rounded-lg border border-green-700">
            <h4 className="text-green-400 font-medium text-sm mb-1">
              🎉 Walkthrough Complete!
            </h4>
            <p className="text-sm text-green-200">
              Great job! You've successfully learned how to use this feature.
              Practice what you've learned and check out related guides for more
              tips.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
