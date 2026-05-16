import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check,
  ChevronRight,
  AlertCircle,
  Beaker,
  Sparkles,
  ListChecks,
  Zap,
  Loader,
} from "lucide-react";

interface ScientificStep {
  id: string;
  number: number;
  title: string;
  description: string;
  equipment?: string[];
  duration?: string;
  notes?: string;
}

interface LabSetupPanelProps {
  isVisible: boolean;
  projectName: string;
  recipeTrack: "fine-dining" | "manufacturing";
  labMode: "culinary" | "pastry";
  chatContext: string; // The AI conversation context
  onSetupComplete: () => void;
}

export function LabSetupPanel({
  isVisible,
  projectName,
  recipeTrack,
  labMode,
  chatContext,
  onSetupComplete,
}: LabSetupPanelProps) {
  const [steps, setSteps] = useState<ScientificStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Extract scientific steps from the chat context
  useEffect(() => {
    if (!isVisible || !chatContext) return;

    const extractSteps = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/rdlabs/extract-steps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context: chatContext,
            projectName,
            labMode,
            recipeTrack,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to extract scientific steps");
        }

        const data = await response.json();
        setSteps(data.steps || []);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An error occurred";
        setError(message);
        // Provide default steps as fallback
        setSteps(getDefaultSteps());
      } finally {
        setIsLoading(false);
      }
    };

    extractSteps();
  }, [isVisible, chatContext, projectName, labMode, recipeTrack]);

  const getDefaultSteps = (): ScientificStep[] => {
    return [
      {
        id: "1",
        number: 1,
        title: "Prepare Materials & Ingredients",
        description:
          "Gather and measure all required ingredients and materials",
        duration: "15-20 mins",
        notes: "Ensure all ingredients are at proper temperature",
      },
      {
        id: "2",
        number: 2,
        title: "Set Up Equipment & Workspace",
        description: "Calibrate equipment and organize your workspace",
        equipment: ["Scale", "Thermometer", "Mixing bowls", "Lab notes"],
        duration: "10-15 mins",
      },
      {
        id: "3",
        number: 3,
        title: "Initial Testing & Documentation",
        description: "Begin initial tests and document baseline measurements",
        duration: "20-30 mins",
        notes: "Take detailed notes and photos of initial state",
      },
      {
        id: "4",
        number: 4,
        title: "Execute Main Process",
        description: "Follow the scientific procedure step-by-step",
        duration: "Varies",
        notes: "Monitor parameters and record observations",
      },
      {
        id: "5",
        number: 5,
        title: "Analysis & Evaluation",
        description: "Analyze results and compare with hypothesis",
        duration: "15-20 mins",
      },
      {
        id: "6",
        number: 6,
        title: "Documentation & Next Steps",
        description: "Complete documentation and plan next iterations",
        duration: "10 mins",
      },
    ];
  };

  const toggleStepComplete = (stepId: string) => {
    setCompletedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  if (!isVisible) return null;

  const allStepsCompleted =
    steps.length > 0 && completedSteps.size === steps.length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
      <Card className="max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col bg-card dark:bg-slate-900 border-border dark:border-slate-800">
        {/* Header */}
        <div className="border-b border-border dark:border-slate-800 p-6 flex-shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {labMode === "pastry" ? (
                  <Sparkles className="h-5 w-5 text-rose-500" />
                ) : (
                  <Beaker className="h-5 w-5 text-[#c8a97e]" />
                )}
                <h2 className="text-xl font-bold text-foreground">
                  Lab Setup: {projectName}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Scientific workflow for{" "}
                {recipeTrack.replace("-", " ").toUpperCase()} track • {labMode}
                {labMode === "pastry" ? " innovation" : " research"}
              </p>
            </div>
            <Badge
              variant="secondary"
              className={`${
                allStepsCompleted
                  ? "bg-green-500/10 text-green-600 border-green-500/30"
                  : "bg-blue-500/10 text-blue-600 border-blue-500/30"
              }`}
            >
              {completedSteps.size}/{steps.length} Ready
            </Badge>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mx-6 mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                Using default workflow
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                AI step extraction not available. Showing standard lab workflow.
              </p>
            </div>
          </div>
        )}

        {/* Steps List */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader className="h-8 w-8 text-[#c8a97e] animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Analyzing conversation and setting up workflow...
                </p>
              </div>
            ) : steps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <AlertCircle className="h-8 w-8 text-slate-400" />
                <p className="text-sm text-muted-foreground">
                  No steps found. Using default workflow.
                </p>
              </div>
            ) : (
              steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => toggleStepComplete(step.id)}
                  className="w-full text-left transition-all hover:bg-muted/50 dark:hover:bg-slate-800 p-4 rounded-lg border border-border dark:border-slate-700"
                >
                  <div className="flex gap-4 items-start">
                    {/* Checkbox */}
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center mt-1 transition-colors ${
                        completedSteps.has(step.id)
                          ? "bg-[#c8a97e] border-[#c8a97e]"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {completedSteps.has(step.id) && (
                        <Check className="h-4 w-4 text-white" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                          Step {step.number}
                        </span>
                        <h3
                          className={`font-semibold text-foreground ${
                            completedSteps.has(step.id)
                              ? "line-through opacity-60"
                              : ""
                          }`}
                        >
                          {step.title}
                        </h3>
                      </div>
                      <p
                        className={`text-sm text-muted-foreground mb-2 ${
                          completedSteps.has(step.id) ? "opacity-60" : ""
                        }`}
                      >
                        {step.description}
                      </p>

                      {/* Equipment/Duration */}
                      <div className="flex flex-wrap gap-2">
                        {step.equipment && step.equipment.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {step.equipment.map((item) => (
                              <Badge
                                key={item}
                                variant="outline"
                                className="text-xs bg-slate-100 dark:bg-slate-800"
                              >
                                {item}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {step.duration && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            {step.duration}
                          </Badge>
                        )}
                      </div>

                      {step.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic border-l-2 border-slate-300 dark:border-slate-600 pl-2">
                          💡 {step.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border dark:border-slate-800 p-6 flex-shrink-0 flex gap-3 justify-end">
          <Button variant="outline" onClick={onSetupComplete}>
            Skip Setup
          </Button>
          <Button
            onClick={onSetupComplete}
            disabled={!allStepsCompleted}
            className="gap-2"
          >
            {allStepsCompleted ? (
              <>
                <Check className="h-4 w-4" />
                Enter Lab
              </>
            ) : (
              <>
                <ChevronRight className="h-4 w-4" />
                Review Steps First
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
