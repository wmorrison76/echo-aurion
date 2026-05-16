import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
export interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for element to highlight highlightClass?: string; position?: 'top' | 'bottom' | 'left' | 'right'; action?: () => void | Promise<void>; estimatedTime?: number; // in seconds
}
const DefaultTourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Event Studio",
    description:
      "Let's create your first event layout in under 5 minutes. This quick tour will walk you through the essentials.",
    estimatedTime: 30,
  },
  {
    id: "canvas",
    title: "The Design Canvas",
    description:
      "This is where you'll design your event layout. The grid helps with alignment. You can zoom with your mouse wheel and pan by dragging.",
    target: "canvas",
    position: "top",
    estimatedTime: 45,
  },
  {
    id: "add-table",
    title: "Add Your First Table",
    description:
      'Click the"Add Table" button in the toolbar to place a dining table. You can drag it to reposition.',
    target: '[data-tour="add-table"]',
    position: "bottom",
    estimatedTime: 60,
  },
  {
    id: "add-chairs",
    title: "Add Seating",
    description:
      'Select your table, then use the"Add Chairs" option to place seats. Tables typically seat 8-10 people.',
    target: '[data-tour="add-chairs"]',
    position: "bottom",
    estimatedTime: 50,
  },
  {
    id: "add-buffet",
    title: "Add a Buffet Station",
    description:
      "Place a buffet station for food service. Position it away from the main seating area for better flow.",
    target: '[data-tour="add-buffet"]',
    position: "bottom",
    estimatedTime: 40,
  },
  {
    id: "compliance",
    title: "Check Compliance",
    description:
      "The Compliance panel shows if your layout meets ADA accessibility requirements. Green = compliant, Red = issues to fix.",
    target: '[data-tour="compliance-panel"]',
    position: "left",
    estimatedTime: 45,
  },
  {
    id: "export",
    title: "Export Your Layout",
    description:
      "Export your design as PNG or PDF. Use PNG for presentations and PDF for floorplans with dimensions.",
    target: '[data-tour="export-btn"]',
    position: "bottom",
    estimatedTime: 30,
  },
  {
    id: "save",
    title: "Save Your Work",
    description:
      "Click Save to store your layout. You can load it later and make changes.",
    target: '[data-tour="save-btn"]',
    position: "bottom",
    estimatedTime: 20,
  },
  {
    id: "complete",
    title: "Great! You're Done",
    description:
      "You've created a basic event layout! Explore the full feature set when you're ready. Remember: Ctrl+? shows all keyboard shortcuts.",
    estimatedTime: 30,
  },
];
interface GuidedTourProps {
  isActive: boolean;
  onComplete: () => void;
  steps?: TourStep[];
  onStepChange?: (stepId: string, stepIndex: number) => void;
}
export function GuidedTour({
  isActive,
  onComplete,
  steps = DefaultTourSteps,
  onStepChange,
}: GuidedTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(
    null,
  );
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const currentStep = steps[currentStepIndex];
  const totalTime = steps.reduce(
    (sum, step) => sum + (step.estimatedTime || 0),
    0,
  );
  const elapsedTime = steps
    .slice(0, currentStepIndex)
    .reduce((sum, step) => sum + (step.estimatedTime || 0), 0);
  const progressPercent = (currentStepIndex / steps.length) * 100; // Update highlighted element position useEffect(() => { if (!currentStep.target) { setHighlightedElement(null); return; } const element = document.querySelector(currentStep.target); if (element) { setHighlightedElement(element); const rect = element.getBoundingClientRect(); const padding = 8; switch (currentStep.position || 'bottom') { case 'top': setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top - padding - 200, }); break; case 'bottom': setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.bottom + padding, }); break; case 'left': setTooltipPosition({ x: rect.left - padding - 320, y: rect.top + rect.height / 2, }); break; case 'right': setTooltipPosition({ x: rect.right + padding, y: rect.top + rect.height / 2, }); break; } } }, [currentStep]); const handleNext = useCallback(async () => { if (currentStep.action) { await currentStep.action(); } if (currentStepIndex < steps.length - 1) { const nextIndex = currentStepIndex + 1; setCurrentStepIndex(nextIndex); onStepChange?.(steps[nextIndex].id, nextIndex); } else { onComplete(); } }, [currentStepIndex, currentStep, steps, onStepChange, onComplete]); const handleSkip = useCallback(() => { onComplete(); }, [onComplete]); const handlePrevious = useCallback(() => { if (currentStepIndex > 0) { const prevIndex = currentStepIndex - 1; setCurrentStepIndex(prevIndex); onStepChange?.(steps[prevIndex].id, prevIndex); } }, [currentStepIndex, steps, onStepChange]); if (!isActive) return null; return ( <> {/* Backdrop overlay */} <div className="fixed inset-0 bg-black/50 z-[998] pointer-events-none" /> {/* Highlight element */} {highlightedElement && ( <div className="fixed z-[999] pointer-events-none"> {(() => { const rect = highlightedElement.getBoundingClientRect(); return ( <div className="absolute border-2 border-cyan-400 rounded-lg shadow-lg shadow-cyan-500/50" style={{ left: `${rect.left - 4}px`, top: `${rect.top - 4}px`, width: `${rect.width + 8}px`, height: `${rect.height + 8}px`, }} /> ); })()} </div> )} {/* Tooltip */} <Card className="fixed z-[1000] w-80 pointer-events-auto" style={{ left: `${tooltipPosition.x - 160}px`, top: `${tooltipPosition.y}px`, transform: 'translateY(-50%)', }} > <CardHeader className="pb-3"> <div className="flex items-start justify-between gap-4"> <div className="flex-1"> <Badge variant="secondary" className="mb-2"> Step {currentStepIndex + 1} of {steps.length} </Badge> <CardTitle className="text-base">{currentStep.title}</CardTitle> </div> <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" onClick={handleSkip} > <X className="w-4 h-4" /> </Button> </div> </CardHeader> <CardContent className="space-y-4"> <p className="text-sm text-muted-foreground"> {currentStep.description} </p> {/* Progress bar */} <div className="space-y-2"> <div className="flex justify-between text-xs text-muted-foreground"> <span>Progress</span> <span>~{Math.round((totalTime - elapsedTime) / 60)}min remaining</span> </div> <div className="h-2 bg-muted rounded-full overflow-hidden"> <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} /> </div> </div> {/* Navigation */} <div className="flex gap-2 pt-2"> <Button variant="outline" size="sm" onClick={handlePrevious} disabled={currentStepIndex === 0} className="text-xs" > Previous </Button> {currentStepIndex === steps.length - 1 ? ( <Button size="sm" onClick={handleNext} className="flex-1 text-xs gap-1" > <CheckCircle2 className="w-4 h-4" /> Complete Tour </Button> ) : ( <Button size="sm" onClick={handleNext} className="flex-1 text-xs gap-1" > Next <ChevronRight className="w-4 h-4" /> </Button> )} <Button variant="ghost" size="sm" onClick={handleSkip} className="text-xs" > Skip </Button> </div> </CardContent> </Card> </> );
}
