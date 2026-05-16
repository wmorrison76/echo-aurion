import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronRight, Lightbulb, BookOpen, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
export interface HelpStep {
  id: string;
  title: string;
  description: string;
  action?: () => void;
  tips?: string[];
  relatedTopics?: string[];
}
export interface HelpTopic {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  steps?: HelpStep[];
  content?: React.ReactNode;
}
const DefaultHelpTopics: HelpTopic[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Learn the basics of creating your first event layout",
    icon: <Sparkles className="w-5 h-5" />,
    steps: [
      {
        id: "step-1",
        title: "Understanding the Canvas",
        description:
          "The central canvas area shows your room layout. It displays tables, seating, and equipment.",
        tips: [
          "Use your mouse to navigate: left-click to select, drag to move",
          "Scroll to zoom in/out for better detail",
          "Right-click for context-sensitive options",
        ],
      },
      {
        id: "step-2",
        title: "Adding Tables",
        description:
          "Start by placing tables for your guests. Choose from various table types.",
        tips: [
          "Round tables seat 8-10 people typically",
          "Rectangular tables are ideal for smaller groups",
          "Cocktail tables work great for standing receptions",
        ],
      },
      {
        id: "step-3",
        title: "Arranging Seating",
        description:
          "Position chairs around tables and adjust for flow and accessibility.",
        tips: [
          "Leave space between tables for server movement",
          "Follow ADA compliance guidelines for accessibility",
          "Consider guest comfort and sightlines",
        ],
      },
      {
        id: "step-4",
        title: "Adding Buffet and Bar",
        description:
          "Place service stations strategically to manage guest flow.",
        tips: [
          "Position buffets away from main walkways",
          "Allow adequate space for queuing",
          "Consider equipment power requirements",
        ],
      },
      {
        id: "step-5",
        title: "Saving Your Layout",
        description:
          "Export and save your layout for future reference and printing.",
        tips: [
          "Use Ctrl+S to save quickly",
          "Export as PNG for presentations",
          "Use PDF export for detailed floorplans",
        ],
      },
    ],
  },
  {
    id: "layout-design",
    title: "Layout Design Tips",
    description: "Pro tips for creating functional and beautiful event spaces",
    icon: <BookOpen className="w-5 h-5" />,
    steps: [
      {
        id: "flow",
        title: "Optimizing Guest Flow",
        description:
          "Create layouts that allow easy movement and prevent congestion.",
        tips: [
          "Maintain clear pathways (minimum 4-5 feet)",
          "Create multiple entry/exit points",
          "Separate food stations from seating areas",
          "Account for DJ/dance floor accessibility",
        ],
      },
      {
        id: "capacity",
        title: "Maximizing Capacity",
        description:
          "Fit more guests comfortably without sacrificing experience.",
        tips: [
          'Use smaller rounds (60") for intimate events',
          "Cluster tables in themed zones",
          "Use cocktail tables for standing areas",
          "Utilize vertical space for decor",
        ],
      },
      {
        id: "accessibility",
        title: "ADA Compliance",
        description: "Ensure your layout meets accessibility requirements.",
        tips: [
          "Maintain clear 5-foot paths for wheelchairs",
          "Position accessible seating near entrances",
          "Ensure adequate restroom access",
          "Account for service animal space",
        ],
      },
    ],
  },
  {
    id: "tools-features",
    title: "Using Tools & Features",
    description: "Master the editor tools for efficient layout creation",
    icon: <Lightbulb className="w-5 h-5" />,
    steps: [
      {
        id: "grid",
        title: "Grid & Snap Tools",
        description: "Use grid snapping to align objects perfectly.",
        tips: [
          "Toggle grid with G key",
          "Snap to grid helps align tables",
          "Use rulers for precise measurements",
        ],
      },
      {
        id: "measure",
        title: "Measurement Tools",
        description: "Check distances and verify ADA compliance.",
        tips: [
          "See all measurements in real-time",
          "Violations highlighted in red",
          "Export measurement report",
        ],
      },
      {
        id: "export",
        title: "Exporting Your Layout",
        description: "Save and share your layout in various formats.",
        tips: [
          "PNG export for presentations",
          "PDF export with dimensions",
          "DXF export for CAD software",
          "Share link with team members",
        ],
      },
    ],
  },
];
interface AIGuidedHelpProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  topics?: HelpTopic[];
  onStepAction?: (stepId: string) => void;
}
export function AIGuidedHelp({
  isOpen,
  onOpenChange,
  topics = DefaultHelpTopics,
  onStepAction,
}: AIGuidedHelpProps) {
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  const [selectedStep, setSelectedStep] = useState<HelpStep | null>(null);
  const handleStepClick = (step: HelpStep) => {
    setSelectedStep(step);
    if (onStepAction) {
      onStepAction(step.id);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {" "}
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        {" "}
        <DialogHeader>
          {" "}
          <DialogTitle className="flex items-center gap-2">
            {" "}
            <Sparkles className="w-5 h-5" /> AI-Guided Help & Tutorials{" "}
          </DialogTitle>{" "}
          <DialogDescription>
            {" "}
            Learn how to create the perfect event layout with step-by-step
            guidance{" "}
          </DialogDescription>{" "}
        </DialogHeader>{" "}
        <div className="flex-1 overflow-hidden flex gap-4">
          {" "}
          {/* Topics List */}{" "}
          <div className="w-48 border-r overflow-y-auto">
            {" "}
            <div className="space-y-2 p-4">
              {" "}
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => {
                    setSelectedTopic(topic);
                    setSelectedStep(null);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    selectedTopic?.id === topic.id &&
                      "bg-accent text-accent-foreground",
                  )}
                >
                  {" "}
                  <div className="flex items-center gap-2">
                    {" "}
                    {topic.icon}{" "}
                    <div className="flex-1">
                      {" "}
                      <div className="font-medium text-sm">
                        {topic.title}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                </button>
              ))}{" "}
            </div>{" "}
          </div>{" "}
          {/* Content Area */}{" "}
          <div className="flex-1 overflow-y-auto p-4">
            {" "}
            {selectedStep ? (
              <div className="space-y-4">
                {" "}
                <button
                  onClick={() => setSelectedStep(null)}
                  className="text-sm text-muted-foreground hover:text-foreground mb-2"
                >
                  {" "}
                  ← Back to {selectedTopic?.title}{" "}
                </button>{" "}
                <div>
                  {" "}
                  <h3 className="text-lg font-semibold">
                    {selectedStep.title}
                  </h3>{" "}
                  <p className="text-sm text-muted-foreground mt-2">
                    {" "}
                    {selectedStep.description}{" "}
                  </p>{" "}
                </div>{" "}
                {selectedStep.tips && selectedStep.tips.length > 0 && (
                  <div className="space-y-2">
                    {" "}
                    <h4 className="font-medium text-sm">Tips & Tricks:</h4>{" "}
                    <ul className="space-y-2">
                      {" "}
                      {selectedStep.tips.map((tip, idx) => (
                        <li key={idx} className="flex gap-2 text-sm">
                          {" "}
                          <span className="text-amber-500 flex-shrink-0">
                            💡
                          </span>{" "}
                          <span>{tip}</span>{" "}
                        </li>
                      ))}{" "}
                    </ul>{" "}
                  </div>
                )}{" "}
                {selectedStep.action && (
                  <Button onClick={selectedStep.action} className="w-full">
                    {" "}
                    Try This Action{" "}
                  </Button>
                )}{" "}
              </div>
            ) : selectedTopic ? (
              <div className="space-y-4">
                {" "}
                <div>
                  {" "}
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    {" "}
                    {selectedTopic.icon} {selectedTopic.title}{" "}
                  </h2>{" "}
                  <p className="text-sm text-muted-foreground mt-2">
                    {" "}
                    {selectedTopic.description}{" "}
                  </p>{" "}
                </div>{" "}
                {selectedTopic.steps && selectedTopic.steps.length > 0 && (
                  <div className="space-y-3">
                    {" "}
                    <h3 className="font-semibold text-sm">Steps:</h3>{" "}
                    {selectedTopic.steps.map((step, idx) => (
                      <Card
                        key={step.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => handleStepClick(step)}
                      >
                        {" "}
                        <CardHeader className="pb-3">
                          {" "}
                          <div className="flex items-center gap-3">
                            {" "}
                            <Badge
                              variant="outline"
                              className="h-6 w-6 flex items-center justify-center p-0"
                            >
                              {" "}
                              {idx + 1}{" "}
                            </Badge>{" "}
                            <CardTitle className="text-sm flex-1">
                              {step.title}
                            </CardTitle>{" "}
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />{" "}
                          </div>{" "}
                          <CardDescription className="mt-2">
                            {" "}
                            {step.description}{" "}
                          </CardDescription>{" "}
                        </CardHeader>{" "}
                      </Card>
                    ))}{" "}
                  </div>
                )}{" "}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                {" "}
                <p>Select a topic to get started</p>{" "}
              </div>
            )}{" "}
          </div>{" "}
        </div>{" "}
      </DialogContent>{" "}
    </Dialog>
  );
}
