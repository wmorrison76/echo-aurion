import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  ChevronDown,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "error";
  requiresConfirmation: boolean;
  duration?: string; // e.g., "2-3 seconds"
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  mode: "auto" | "guided" | "manual";
  steps: WorkflowStep[];
  currentStepIndex: number;
  progress: number; // 0-100
  startedAt?: Date;
  estimatedCompletionTime?: string;
  canSwitchMode: boolean;
}

interface WorkflowCenterProps {
  workflow: Workflow | null;
  onStepConfirm?: (stepId: string) => void;
  onModeSwitched?: (newMode: "auto" | "guided" | "manual") => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  isPaused?: boolean;
}

export function WorkflowCenter({
  workflow,
  onStepConfirm,
  onModeSwitched,
  onPause,
  onResume,
  onCancel,
  isPaused = false,
}: WorkflowCenterProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [showModeSelector, setShowModeSelector] = useState(false);

  if (!workflow) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Zap className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-50" />
            <p className="text-slate-400">No active workflow</p>
            <p className="text-sm text-slate-500 mt-1">
              Start a feature to see workflow progress
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentStep = workflow.steps[workflow.currentStepIndex];
  const modeDescriptions = {
    auto: "Fully automatic - AI makes all decisions",
    guided: "Semi-automatic - confirm each step",
    manual: "Full control - manual everything",
  };

  const statusIcons = {
    pending: <Clock className="w-5 h-5 text-slate-400" />,
    "in-progress": <Zap className="w-5 h-5 text-blue-400 animate-pulse" />,
    completed: <CheckCircle2 className="w-5 h-5 text-green-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
  };

  const statusColors = {
    pending: "text-slate-400",
    "in-progress": "text-blue-400",
    completed: "text-green-400",
    error: "text-red-400",
  };

  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-white text-lg">{workflow.name}</CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              {workflow.description}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge
              variant="secondary"
              className={cn(
                "capitalize",
                workflow.mode === "auto"
                  ? "bg-green-900/30 text-green-300"
                  : workflow.mode === "guided"
                  ? "bg-blue-900/30 text-blue-300"
                  : "bg-purple-900/30 text-purple-300"
              )}
            >
              {workflow.mode} mode
            </Badge>
            {isPaused && (
              <Badge variant="destructive" className="bg-yellow-900/30 text-yellow-300">
                Paused
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Progress</span>
            <span className="text-cyan-400 font-medium">{workflow.progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
              style={{ width: `${workflow.progress}%` }}
            />
          </div>
          {workflow.estimatedCompletionTime && (
            <p className="text-xs text-slate-500">
              Est. completion: {workflow.estimatedCompletionTime}
            </p>
          )}
        </div>

        {/* Current Step Highlighted */}
        {currentStep && (
          <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-700/50">
            <div className="flex items-start gap-3">
              {statusIcons[currentStep.status]}
              <div className="flex-1">
                <h4 className="font-medium text-white">
                  {currentStep.status === "in-progress" ? "⏳ " : ""}
                  {currentStep.title}
                </h4>
                <p className="text-sm text-slate-300 mt-1">
                  {currentStep.description}
                </p>

                {/* Confirmation Prompt */}
                {currentStep.requiresConfirmation &&
                  currentStep.status === "in-progress" && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => onStepConfirm?.(currentStep.id)}
                      >
                        Confirm & Continue
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-slate-300"
                      >
                        Review Details
                      </Button>
                    </div>
                  )}

                {currentStep.duration && (
                  <p className="text-xs text-slate-500 mt-2">
                    ⏱️ {currentStep.duration}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Steps Timeline */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-white">Workflow Steps</h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {workflow.steps.map((step, index) => {
              const isActive = index === workflow.currentStepIndex;
              const isCompleted = index < workflow.currentStepIndex;

              return (
                <button
                  key={step.id}
                  onClick={() =>
                    setExpandedStep(expandedStep === step.id ? null : step.id)
                  }
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                    isActive
                      ? "bg-blue-900/30 border border-blue-700"
                      : "hover:bg-slate-700/50 border border-transparent"
                  )}
                >
                  <div className={cn("flex-shrink-0", statusColors[step.status])}>
                    {statusIcons[step.status]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm truncate", isActive ? "text-white font-medium" : "text-slate-300")}>
                      {step.title}
                    </p>
                    {isActive && (
                      <p className="text-xs text-blue-300">Running...</p>
                    )}
                  </div>

                  <span className="text-xs text-slate-500">{index + 1}/{workflow.steps.length}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mode Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white">Workflow Mode</label>
            {workflow.canSwitchMode && (
              <button
                onClick={() => setShowModeSelector(!showModeSelector)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Change
              </button>
            )}
          </div>

          {showModeSelector && workflow.canSwitchMode ? (
            <div className="grid grid-cols-3 gap-2">
              {(["auto", "guided", "manual"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    onModeSwitched?.(mode);
                    setShowModeSelector(false);
                  }}
                  className={cn(
                    "p-2 rounded-lg text-xs font-medium transition-colors",
                    workflow.mode === mode
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  )}
                >
                  {mode === "auto" && "🤖"}
                  {mode === "guided" && "📋"}
                  {mode === "manual" && "🔧"}
                  <div className="capitalize">{mode}</div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              {modeDescriptions[workflow.mode]}
            </p>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2 pt-2 border-t border-slate-700">
          {isPaused ? (
            <Button
              size="sm"
              onClick={onResume}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Resume
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onPause}
              variant="outline"
              className="flex-1 border-slate-600"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          )}

          <Button
            size="sm"
            onClick={onCancel}
            variant="outline"
            className="flex-1 border-red-600 text-red-400 hover:bg-red-900/20"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>

        {/* Error Message */}
        {workflow.steps.some((s) => s.status === "error") && (
          <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg text-sm text-red-200">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            Some steps encountered errors. Check details above.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
