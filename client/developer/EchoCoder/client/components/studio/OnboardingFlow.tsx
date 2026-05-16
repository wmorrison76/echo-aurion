import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ChevronRight, Check, Play } from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action: string;
  tips: string[];
  videoUrl?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to EchoCoder Pro",
    description: "The enterprise-grade CMS with AI automation",
    action: "Get started with your first feature",
    tips: [
      "Everything is automated by default - no complex workflows needed",
      "You can always switch to manual mode for full control",
      "New features? We'll show you how to use them",
    ],
  },
  {
    id: "studio",
    title: "Studio - Where Magic Happens",
    description: "Generate modules, analyze code, and publish content",
    action: "Click the Studio button to explore",
    tips: [
      "Describe what you need in plain English",
      "AI generates production-ready code",
      "Automatic security and quality checks included",
    ],
  },
  {
    id: "content",
    title: "Content Management",
    description: "Create, organize, and publish your content",
    action: "Go to Content to start creating",
    tips: [
      "Batch operations let you publish 100 items at once",
      "AI generates SEO metadata automatically",
      "Link related content with a single click",
    ],
  },
  {
    id: "publishing",
    title: "Smart Publishing",
    description: "Automated workflows that handle everything",
    action: "Ready to publish? We'll guide you",
    tips: [
      "One-click batch publishing with AI validation",
      "Automatic compliance checks before publishing",
      "Scheduled publishing for future dates",
    ],
  },
  {
    id: "analytics",
    title: "Real-Time Analytics",
    description: "Track what's working and what isn't",
    action: "View your content performance",
    tips: [
      "See trending content in real-time",
      "Engagement metrics help you improve",
      "Export data for deeper analysis",
    ],
  },
  {
    id: "team",
    title: "Team Collaboration",
    description: "Work together with role-based access",
    action: "Invite your team members",
    tips: [
      "Create isolated workspaces per project",
      "Granular permissions for every role",
      "Audit logs track all changes",
    ],
  },
  {
    id: "advanced",
    title: "Advanced Features",
    description: "A/B testing, targeting, compliance, and more",
    action: "Explore enterprise capabilities",
    tips: [
      "A/B test content variants automatically",
      "Target specific audience segments",
      "Built-in compliance (GDPR, SOC2, HIPAA)",
      "Complete audit trails for security",
    ],
  },
];

export function OnboardingFlow() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);

  // Check if user is first-time
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("echocoder-onboarding-seen");
    if (!hasSeenOnboarding && !dismissed) {
      setIsVisible(true);
      localStorage.setItem("echocoder-onboarding-seen", "true");
    }
  }, [dismissed]);

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  const handleNext = () => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCompletedSteps([...completedSteps, currentStep.id]);
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      setIsVisible(false);
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
  };

  const handleReplay = () => {
    localStorage.removeItem("echocoder-onboarding-seen");
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    setIsVisible(true);
  };

  if (!isVisible) {
    return (
      <button
        onClick={handleReplay}
        className="fixed bottom-4 right-4 p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs z-40"
        title="Replay onboarding tour"
      >
        ❓ Replay Tour
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 overflow-hidden">
        {/* Header */}
        <CardHeader className="pb-3 bg-slate-800/50 border-b border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {currentStepIndex === 0 ? "👋" : "✨"}
                </span>
                <CardTitle className="text-white">{currentStep.title}</CardTitle>
              </div>
              <CardDescription className="text-slate-400 mt-1">
                {currentStep.description}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="pt-6 space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}</span>
              <span className="text-cyan-400 font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Action */}
          <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-700/50">
            <p className="text-blue-200 font-medium text-sm">{currentStep.action}</p>
          </div>

          {/* Tips */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white">💡 Tips</h4>
            <ul className="space-y-2">
              {currentStep.tips.map((tip, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-slate-300"
                >
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Video Link */}
          {currentStep.videoUrl && (
            <Button
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Watch Video Tutorial (3 min)
            </Button>
          )}

          {/* Step Indicators */}
          <div className="flex flex-wrap gap-1">
            {ONBOARDING_STEPS.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => {
                  if (idx <= currentStepIndex) {
                    setCurrentStepIndex(idx);
                  }
                }}
                className={`w-3 h-3 rounded-full transition-all ${
                  idx < currentStepIndex
                    ? "bg-green-500"
                    : idx === currentStepIndex
                    ? "bg-cyan-500 w-8"
                    : "bg-slate-600"
                }`}
                title={step.title}
              />
            ))}
          </div>
        </CardContent>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-slate-400 hover:text-white"
          >
            Skip Tour
          </Button>

          <div className="flex gap-2">
            {currentStepIndex > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
                className="border-slate-600"
              >
                ← Back
              </Button>
            )}

            <Button
              onClick={handleNext}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
            >
              {currentStepIndex === ONBOARDING_STEPS.length - 1 ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Start Exploring
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
