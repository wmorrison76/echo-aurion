import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Clock,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getWalkthrough,
  Walkthrough,
  WalkthroughStep,
} from "@/lib/helpContent";

interface InteractiveWalkthroughProps {
  walkthroughId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InteractiveWalkthrough({
  walkthroughId,
  open,
  onOpenChange,
}: InteractiveWalkthroughProps) {
  const walkthrough = getWalkthrough(walkthroughId);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);

  if (!walkthrough) {
    return null;
  }

  const step = walkthrough.steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === walkthrough.steps.length - 1;
  const progress = ((currentStep + 1) / walkthrough.steps.length) * 100;

  const handleNext = () => {
    if (!isLastStep) {
      setIsNavigating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        if (!completedSteps.includes(step.id)) {
          setCompletedSteps([...completedSteps, step.id]);
        }
        setIsNavigating(false);
      }, 300);
    } else {
      setCompletedSteps([...completedSteps, step.id]);
      toast({
        title: "Walkthrough Complete! 🎉",
        description: `Great job! You've completed: ${walkthrough.title}`,
      });
      onOpenChange(false);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setIsNavigating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsNavigating(false);
      }, 300);
    }
  };

  const handleClose = () => {
    setIsNavigating(false);
    onOpenChange(false);
  };

  const handleSkip = () => {
    setIsNavigating(false);
    toast({
      title: "Walkthrough skipped",
      description: "You can come back to it anytime",
    });
    onOpenChange(false);
  };

  if (!step) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">
                {walkthrough.title}
              </DialogTitle>
              <DialogDescription className="text-base">
                {walkthrough.description}
              </DialogDescription>
            </div>
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Step {currentStep + 1} of {walkthrough.steps.length}
            </span>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-muted-foreground">
                ~{walkthrough.estimatedTime} min
              </span>
            </div>
          </div>
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div
              className="bg-cyan-500 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Current Step Content */}
        <div className="space-y-4">
          <Card className="bg-cyan-900/20 border-cyan-700/30">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    {step.title}
                    {completedSteps.includes(step.id) && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                  </h3>
                  <p className="text-base text-foreground">
                    {step.description}
                  </p>
                </div>

                {/* Guidance Section */}
                <div className="bg-blue-900/30 border border-blue-700/30 rounded p-4">
                  <div className="flex gap-3">
                    <Lightbulb className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-300 mb-1">
                        AI Guidance
                      </p>
                      <p className="text-sm text-blue-200 leading-relaxed">
                        {step.guidance}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Link */}
                {step.action && (
                  <Button
                    asChild
                    onClick={() => {
                      window.location.href = step.action!;
                    }}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                    size="lg"
                  >
                    <a href={step.action}>
                      Go to {step.action}
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                )}

                {/* Tips Section */}
                {step.tips && step.tips.length > 0 && (
                  <div className="bg-amber-900/20 border border-amber-700/30 rounded p-4 space-y-2">
                    <p className="font-medium text-amber-300 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Tips & Hints
                    </p>
                    <ul className="space-y-1">
                      {step.tips.map((tip, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-amber-200 flex gap-2"
                        >
                          <span className="text-amber-400">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* What to Do Next */}
                <div className="bg-green-900/20 border border-green-700/30 rounded p-4">
                  <p className="font-medium text-green-300 mb-2">Your Action</p>
                  <p className="text-sm text-green-200">
                    {step.action
                      ? `Click the button above to go to the right place, then return here when you're done.`
                      : step.validation || "Complete this step to continue."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step Indicators */}
          <div className="flex gap-1 flex-wrap">
            {walkthrough.steps.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  if (idx <= currentStep || completedSteps.includes(s.id)) {
                    setCurrentStep(idx);
                  }
                }}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? "bg-cyan-500 w-8"
                    : completedSteps.includes(s.id)
                      ? "bg-green-500 w-2"
                      : "bg-muted w-2 opacity-50"
                }`}
                title={`Step ${idx + 1}: ${s.title}`}
              />
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleSkip}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            Skip
          </Button>
          <Button
            onClick={handlePrevious}
            disabled={isFirstStep || isNavigating}
            variant="outline"
            size="lg"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={isNavigating}
            className="flex-1 bg-cyan-600 hover:bg-cyan-700"
            size="lg"
          >
            {isLastStep ? "Complete" : step.nextButtonText || "Next"}
            {!isLastStep && <ChevronRight className="h-4 w-4 ml-2" />}
            {isLastStep && <CheckCircle2 className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InteractiveWalkthrough;
