/** * Genesis Demo Walkthrough Panel (Patch F) * Interactive guided tour through the Genesis system */ import React, {
  useState,
} from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronLeft,
  Play,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import {
  getDemoDataset,
  resetDemoDataset,
} from "@/lib/genesis/demo/demoDataset";
interface Step {
  id: string;
  title: string;
  description: string;
  action: string;
}
const WALKTHROUGH_STEPS: Step[] = [
  {
    id: "load_data",
    title: "Load Demo Dataset",
    description:
      "Load a sample dataset with outlets, vendors, items, and demand requests. This shows the typical inputs to the Genesis system.",
    action: "Load Dataset",
  },
  {
    id: "run_procurement",
    title: "Run Combined Procurement",
    description:
      "Execute the procurement orchestrator to merge demand from multiple outlets and consolidate into vendor drops. The system optimizes for delivery schedule and cost.",
    action: "Run Procurement",
  },
  {
    id: "view_plan",
    title: "Review Procurement Plan",
    description:
      "Examine the generated plan: vendor drops, line consolidation, cost attribution, and any warnings. This is your actionable procurement schedule.",
    action: "View Plan",
  },
  {
    id: "assign_roles",
    title: "Test User Roles",
    description:
      "Switch between different user roles (manager, commissary staff, finance) to see how RBAC gates limit visibility and actions. Try to perform actions you don't have permission for.",
    action: "Switch Roles",
  },
  {
    id: "schedule_change",
    title: "Schedule Future Rule",
    description:
      "Use effective-dating to schedule a vendor rule change (e.g., holiday delivery adjustment) for a future date. The system continues running with current rules until the change takes effect.",
    action: "Schedule Change",
  },
  {
    id: "view_explanation",
    title: "Explain Decisions",
    description:
      "Open EchoWhy to see why the system made specific procurement decisions: demand mapping, offset applications, vendor selections, and cost attribution.",
    action: "View Explanation",
  },
];
export default function GenesisDemoWalkthroughPanel() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const handleLoadData = () => {
    const dataset = getDemoDataset();
    setHasLoadedData(true);
    markStepComplete("load_data");
    console.log("Demo dataset loaded:", dataset);
  };
  const markStepComplete = (stepId: string) => {
    setCompletedSteps(new Set([...completedSteps, stepId]));
  };
  const handleNext = () => {
    if (currentStep < WALKTHROUGH_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  const step = WALKTHROUGH_STEPS[currentStep];
  const isCompleted = completedSteps.has(step.id);
  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {" "}
      {/* Header */}{" "}
      <div className="flex-shrink-0 border-b border-border/30 p-4">
        {" "}
        <div className="flex items-start justify-between gap-3">
          {" "}
          <div>
            {" "}
            <div className="text-lg font-semibold text-foreground flex gap-2">
              {" "}
              <BookOpen className="w-5 h-5" /> Genesis Demo Walkthrough{" "}
            </div>{" "}
            <div className="text-sm text-foreground/70 mt-1">
              {" "}
              Interactive guided tour through the Genesis procurement
              system{" "}
            </div>{" "}
          </div>{" "}
          <Badge variant="outline">V1</Badge>{" "}
        </div>{" "}
      </div>{" "}
      {/* Content */}{" "}
      <div className="flex-1 overflow-auto p-4">
        {" "}
        <div className="max-w-2xl mx-auto space-y-6">
          {" "}
          {/* Progress */}{" "}
          <div className="space-y-2">
            {" "}
            <div className="flex items-center justify-between">
              {" "}
              <span className="text-sm font-medium text-foreground">
                {" "}
                Step {currentStep + 1} of {WALKTHROUGH_STEPS.length}{" "}
              </span>{" "}
              <span className="text-xs text-foreground/60">
                {" "}
                {completedSteps.size} completed{" "}
              </span>{" "}
            </div>{" "}
            <div className="w-full bg-foreground/10 rounded-full h-2 overflow-hidden">
              {" "}
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{
                  width: `${((currentStep + 1) / WALKTHROUGH_STEPS.length) * 100}%`,
                }}
              />{" "}
            </div>{" "}
          </div>{" "}
          {/* Current Step */}{" "}
          <Card className="p-6 space-y-4">
            {" "}
            <div className="flex items-start justify-between gap-4">
              {" "}
              <div>
                {" "}
                <h3 className="text-xl font-semibold text-foreground flex gap-2 items-center">
                  {" "}
                  {step.title}{" "}
                  {isCompleted && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}{" "}
                </h3>{" "}
              </div>{" "}
              <Badge variant={isCompleted ? "default" : "secondary"}>
                {" "}
                {isCompleted ? "Completed" : "In Progress"}{" "}
              </Badge>{" "}
            </div>{" "}
            <p className="text-foreground/70 leading-relaxed">
              {" "}
              {step.description}{" "}
            </p>{" "}
            <div className="pt-4 border-t border-border/30">
              {" "}
              <Button
                onClick={() => {
                  if (step.id === "load_data") {
                    handleLoadData();
                  } else {
                    markStepComplete(step.id);
                  }
                }}
                className="w-full"
                size="lg"
                disabled={step.id !== "load_data" && !hasLoadedData}
              >
                {" "}
                <Play className="w-4 h-4 mr-2" /> {step.action}{" "}
              </Button>{" "}
            </div>{" "}
          </Card>{" "}
          {/* Step List */}{" "}
          <Card className="p-4">
            {" "}
            <div className="text-sm font-medium text-foreground mb-3">
              {" "}
              Steps{" "}
            </div>{" "}
            <div className="space-y-2">
              {" "}
              {WALKTHROUGH_STEPS.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentStep(idx)}
                  className={`w-full text-left p-3 rounded border transition-colors ${currentStep === idx ? "border-blue-500/50 bg-primary/10" : "border-border/30 hover:bg-foreground/5"}`}
                >
                  {" "}
                  <div className="flex items-center gap-2">
                    {" "}
                    {completedSteps.has(s.id) ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <div
                        className={`w-4 h-4 rounded-full border flex-shrink-0 ${currentStep === idx ? "border-blue-500 bg-primary" : "border-foreground/30"}`}
                      />
                    )}{" "}
                    <span className="text-sm font-medium text-foreground">
                      {" "}
                      {s.title}{" "}
                    </span>{" "}
                  </div>{" "}
                </button>
              ))}{" "}
            </div>{" "}
          </Card>{" "}
        </div>{" "}
      </div>{" "}
      {/* Footer */}{" "}
      <div className="flex-shrink-0 border-t border-border/30 p-4 bg-background">
        {" "}
        <div className="flex gap-2">
          {" "}
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex-1"
          >
            {" "}
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous{" "}
          </Button>{" "}
          <Button
            variant="outline"
            onClick={() => {
              resetDemoDataset();
              setHasLoadedData(false);
              setCompletedSteps(new Set());
              setCurrentStep(0);
            }}
            className="flex-1"
          >
            {" "}
            Reset{" "}
          </Button>{" "}
          <Button
            onClick={handleNext}
            disabled={currentStep === WALKTHROUGH_STEPS.length - 1}
            className="flex-1"
          >
            {" "}
            Next <ChevronRight className="w-4 h-4 ml-1" />{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
