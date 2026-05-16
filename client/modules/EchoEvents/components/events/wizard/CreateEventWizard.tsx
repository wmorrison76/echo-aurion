import React from "react";
/** * Create Event Wizard * Multi-step wizard for creating new events with menu, services, and contract generation */ import { useState } from "react";
import { StepOutletAndSpace } from "./StepOutletAndSpace";
import { StepMenuBuilder } from "./StepMenuBuilder";
import { StepServices } from "./StepServices";
import { StepFloorplan } from "./StepFloorplan";
import { StepForecast } from "./StepForecast";
import { StepContract } from "./StepContract";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
export function CreateEventWizard() {
  const [step, setStep] = useState(0);
  const steps = [
    {
      title: "Select Outlet & Space",
      component: <StepOutletAndSpace onNext={() => setStep(1)} />,
    },
    {
      title: "Build Menu",
      component: <StepMenuBuilder onNext={() => setStep(2)} />,
    },
    {
      title: "Enhancements & Services",
      component: <StepServices onNext={() => setStep(3)} />,
    },
    {
      title: "Floorplan Designer",
      component: <StepFloorplan onNext={() => setStep(4)} />,
    },
    {
      title: "Financial Forecast",
      component: <StepForecast onNext={() => setStep(5)} />,
    },
    {
      title: "Contract & Billing",
      component: <StepContract onFinish={() => setStep(0)} />,
    },
  ];
  const progressPercentage = ((step + 1) / steps.length) * 100;
  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {" "}
      {/* Header */}{" "}
      <div className="sticky top-0 z-10 border-b bg-background dark:bg-card backdrop-blur-sm">
        {" "}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {" "}
          <div className="flex items-center justify-between mb-4">
            {" "}
            <div>
              {" "}
              <h1 className="text-2xl font-bold text-foreground">
                {" "}
                Create New Event{" "}
              </h1>{" "}
              <p className="text-sm text-muted-foreground mt-1">
                {" "}
                Step {step + 1} of {steps.length}: {steps[step].title}{" "}
              </p>{" "}
            </div>{" "}
            <div className="text-right">
              {" "}
              <p className="text-sm font-medium text-muted-foreground">
                {" "}
                {Math.round(progressPercentage)}% Complete{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          {/* Progress Bar */}{" "}
          <Progress value={progressPercentage} className="h-2" />{" "}
          {/* Step Indicators */}{" "}
          <div className="flex gap-2 mt-4 overflow-x-auto">
            {" "}
            {steps.map((s, index) => (
              <button
                key={index}
                onClick={() => index <= step && setStep(index)}
                disabled={index > step}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  index === step
                    ? "bg-primary text-primary-foreground shadow-md"
                    : index < step
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 cursor-pointer hover:bg-green-200"
                      : "bg-slate-100 text-muted-foreground dark:bg-slate-800 cursor-not-allowed opacity-50",
                )}
              >
                {" "}
                <span
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    index === step
                      ? "bg-background"
                      : index < step
                        ? "bg-green-600 text-white"
                        : "bg-slate-300 dark:bg-slate-600",
                  )}
                >
                  {" "}
                  {index < step ? "✓" : index + 1}{" "}
                </span>{" "}
                <span className="hidden sm:inline">{s.title}</span>{" "}
              </button>
            ))}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Content */}{" "}
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        {" "}
        <div className="max-w-7xl mx-auto">
          {" "}
          <Card className="shadow-lg">{steps[step].component}</Card>{" "}
        </div>{" "}
      </div>{" "}
      {/* Navigation Footer */}{" "}
      <div className="sticky bottom-0 border-t bg-background dark:bg-card backdrop-blur-sm">
        {" "}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          {" "}
          <button
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
            className={cn(
              "px-6 py-2 rounded-lg font-medium transition-all",
              step === 0
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-slate-100 dark:hover:bg-slate-800",
            )}
          >
            {" "}
            ← Previous{" "}
          </button>{" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            Step {step + 1} of {steps.length}{" "}
          </p>{" "}
          {step === steps.length - 1 ? (
            <div className="text-sm text-muted-foreground">
              {" "}
              Finish on the final step{" "}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {" "}
              Use the buttons in each step to continue{" "}
            </div>
          )}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
export default CreateEventWizard;
