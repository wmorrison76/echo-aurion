import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle,
  HelpCircle,
} from "lucide-react";
interface GuidedTour {
  id: string;
  title: string;
  description: string;
  duration: string;
  steps: GuidedStep[];
  difficulty: "beginner" | "intermediate" | "advanced";
}
interface GuidedStep {
  title: string;
  description: string;
  target?: string;
  action?: string;
  position: "top" | "bottom" | "left" | "right";
  highlight: boolean;
}
const TOURS: GuidedTour[] = [
  {
    id: "echo-voice-intro",
    title: "Getting Started with Echo Voice",
    description: "Learn how to use the voice assistant to automate tasks",
    duration: "5 minutes",
    difficulty: "beginner",
    steps: [
      {
        title: "Welcome to Echo Voice",
        description:
          "Echo is an AI-powered voice assistant that helps you manage your restaurant operations. You can speak commands in 6 languages and get instant responses.",
        position: "bottom",
        highlight: true,
      },
      {
        title: "Click the microphone button",
        description:
          "To start listening, click the microphone button. It will turn red when actively recording your voice.",
        target: "[data-testid='mic-button']",
        position: "left",
        highlight: true,
      },
      {
        title: "Speak your command",
        description:
          "Speak clearly into your microphone. Try commands like: 'Show me labor costs for today' or 'What are my staffing anomalies?'",
        position: "bottom",
        highlight: false,
      },
      {
        title: "Review the transcript",
        description:
          "Your speech will be transcribed here. You can edit it before sending if needed.",
        target: "[data-testid='transcript-area']",
        position: "left",
        highlight: true,
      },
      {
        title: "Get your response",
        description:
          "Echo will provide an AI-generated response with insights and recommendations. Click the speaker icon to hear it read aloud.",
        target: "[data-testid='response-area']",
        position: "left",
        highlight: true,
      },
      {
        title: "You're ready!",
        description:
          "You now know how to use Echo Voice. Try asking questions about your labor, revenue, or schedules.",
        position: "bottom",
        highlight: false,
      },
    ],
  },
  {
    id: "labor-reports-guide",
    title: "Understanding Labor Reports",
    description: "Master the 10+ labor analysis reports",
    duration: "8 minutes",
    difficulty: "intermediate",
    steps: [
      {
        title: "Labor Reports Dashboard",
        description:
          "Access all labor-related reports in one place. Each report provides different insights into your staffing.",
        position: "bottom",
        highlight: true,
      },
      {
        title: "Labor Effectiveness Report",
        description:
          "Shows FTE (full-time equivalents), labor costs, and variance against standards. Use this to understand overall staffing performance.",
        position: "right",
        highlight: true,
      },
      {
        title: "Labor Productivity Report",
        description:
          "Analyzes how effectively your team is utilizing their time. Higher scores mean better efficiency.",
        position: "right",
        highlight: true,
      },
      {
        title: "Hours by Job Analysis",
        description:
          "Breaking down hours worked by specific job roles. Identify which positions consume the most labor hours.",
        position: "right",
        highlight: true,
      },
      {
        title: "Hours Variance Analysis",
        description:
          "Compare actual hours worked vs. forecasted hours. Large variances indicate scheduling issues.",
        position: "right",
        highlight: true,
      },
      {
        title: "Time & Attendance Reports",
        description:
          "Track hours, earnings, tips, and benefit allocation. Critical for payroll accuracy.",
        position: "right",
        highlight: true,
      },
      {
        title: "Export your report",
        description:
          "Download reports as PDF or CSV for sharing with your team or auditors.",
        target: "[data-testid='export-button']",
        position: "top",
        highlight: true,
      },
    ],
  },
  {
    id: "employee-onboarding-guide",
    title: "Onboarding New Employees",
    description: "Complete step-by-step employee onboarding process",
    duration: "10 minutes",
    difficulty: "beginner",
    steps: [
      {
        title: "Start Onboarding",
        description:
          "Click 'New Employee' to begin the streamlined onboarding process.",
        target: "[data-testid='new-employee-button']",
        position: "bottom",
        highlight: true,
      },
      {
        title: "Upload Resume (Optional)",
        description:
          "Upload the candidate's resume. Our AI will automatically extract key information like experience and skills.",
        position: "right",
        highlight: true,
      },
      {
        title: "Personal Information",
        description:
          "Enter or verify employee details: name, email, phone, address, and social security number.",
        position: "right",
        highlight: true,
      },
      {
        title: "Emergency Contact",
        description:
          "Add an emergency contact. This is required for all employees.",
        position: "right",
        highlight: true,
      },
      {
        title: "Tax Forms (W-4)",
        description:
          "Upload IRS W-4 form for federal tax withholding. Critical for payroll processing.",
        position: "right",
        highlight: true,
      },
      {
        title: "I-9 Verification",
        description:
          "Upload Form I-9 to verify employment eligibility. Store with secure document management.",
        position: "right",
        highlight: true,
      },
      {
        title: "Direct Deposit Setup",
        description:
          "Add employee banking information for direct deposit. Requires routing and account numbers.",
        position: "right",
        highlight: true,
      },
      {
        title: "Position & Department",
        description:
          "Assign employee to position and department. Determines access and responsibilities.",
        position: "right",
        highlight: true,
      },
      {
        title: "Review & Submit",
        description:
          "Review all information before submitting. Employee record is created in the system.",
        target: "[data-testid='submit-button']",
        position: "top",
        highlight: true,
      },
      {
        title: "Onboarding Complete!",
        description:
          "The employee is now in the system and ready to start. Send them their login credentials.",
        position: "bottom",
        highlight: false,
      },
    ],
  },
  {
    id: "advanced-analytics-guide",
    title: "Advanced Analytics Dashboard",
    description: "Understand anomalies and predictive insights",
    duration: "6 minutes",
    difficulty: "advanced",
    steps: [
      {
        title: "Anomaly Detection",
        description:
          "Our AI continuously analyzes your operational metrics to identify unusual patterns.",
        position: "bottom",
        highlight: true,
      },
      {
        title: "Labor Cost Anomalies",
        description:
          "Red flags for labor costs exceeding standards. Click to see detailed breakdown and recommendations.",
        position: "left",
        highlight: true,
      },
      {
        title: "Revenue Anomalies",
        description:
          "Identifies unusual revenue patterns. Helps spot trends early.",
        position: "left",
        highlight: true,
      },
      {
        title: "Maintenance Risks",
        description:
          "Predicts equipment maintenance issues based on labor and revenue patterns.",
        position: "left",
        highlight: true,
      },
      {
        title: "Schedule Optimization",
        description:
          "Recommends optimal staffing levels based on forecasted revenue and labor standards.",
        position: "left",
        highlight: true,
      },
      {
        title: "Export Insights",
        description:
          "Generate reports with all anomalies and recommendations for your team.",
        target: "[data-testid='export-analytics']",
        position: "top",
        highlight: true,
      },
    ],
  },
];
export default function InteractiveHelpGuide() {
  const [selectedTour, setSelectedTour] = React.useState<GuidedTour | null>(null);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [completedTours, setCompletedTours] = React.useState<string[]>([]);
  const startTour = (tour: GuidedTour) => {
    setSelectedTour(tour);
    setCurrentStep(0);
  };
  const nextStep = () => {
    if (selectedTour && currentStep < selectedTour.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  const completeTour = () => {
    if (selectedTour && !completedTours.includes(selectedTour.id)) {
      setCompletedTours([...completedTours, selectedTour.id]);
    }
    setSelectedTour(null);
    setCurrentStep(0);
  };
  const closeTour = () => {
    setSelectedTour(null);
    setCurrentStep(0);
  };
  if (selectedTour) {
    const step = selectedTour.steps[currentStep];
    const progress = ((currentStep + 1) / selectedTour.steps.length) * 100;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        {" "}
        {/* Highlight overlay */}{" "}
        {step.highlight && (
          <div className="pointer-events-none absolute inset-0 bg-transparent" />
        )}{" "}
        {/* Guide card */}{" "}
        <Card className="w-full max-w-md shadow-2xl">
          {" "}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            {" "}
            <CardTitle className="text-lg">{step.title}</CardTitle>{" "}
            <Button
              variant="ghost"
              size="sm"
              onClick={closeTour}
              className="h-6 w-6 p-0"
            >
              {" "}
              <X className="h-4 w-4" />{" "}
            </Button>{" "}
          </CardHeader>{" "}
          <CardContent className="space-y-4">
            {" "}
            <p className="text-sm text-foreground">{step.description}</p>{" "}
            {/* Progress bar */}{" "}
            <div className="space-y-1">
              {" "}
              <div className="flex items-center justify-between">
                {" "}
                <span className="text-xs font-medium text-muted-foreground">
                  {" "}
                  Step {currentStep + 1} of {selectedTour.steps.length}{" "}
                </span>{" "}
                <span className="text-xs font-medium text-muted-foreground">
                  {" "}
                  {Math.round(progress)}%{" "}
                </span>{" "}
              </div>{" "}
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                {" "}
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />{" "}
              </div>{" "}
            </div>{" "}
            {/* Action hint */}{" "}
            {step.action && (
              <div className="rounded bg-blue-50 p-2">
                {" "}
                <p className="text-xs text-blue-900"> 💡 {step.action} </p>{" "}
              </div>
            )}{" "}
            {/* Navigation */}{" "}
            <div className="flex gap-2">
              {" "}
              <Button
                variant="outline"
                size="sm"
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                {" "}
                <ChevronLeft className="h-4 w-4" /> Previous{" "}
              </Button>{" "}
              {currentStep === selectedTour.steps.length - 1 ? (
                <Button className="flex-1" size="sm" onClick={completeTour}>
                  {" "}
                  <CheckCircle className="mr-2 h-4 w-4" /> Complete Tour{" "}
                </Button>
              ) : (
                <Button className="flex-1" size="sm" onClick={nextStep}>
                  {" "}
                  Next <ChevronRight className="ml-2 h-4 w-4" />{" "}
                </Button>
              )}{" "}
            </div>{" "}
            {/* Tour info */}{" "}
            <p className="text-xs text-muted-foreground">
              {" "}
              {selectedTour.title} • {selectedTour.duration}{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>
    );
  }
  return (
    <div className="space-y-6 p-6">
      {" "}
      <div>
        {" "}
        <h1 className="text-3xl font-bold">Learning Center</h1>{" "}
        <p className="mt-2 text-muted-foreground">
          {" "}
          Interactive guided tours to master every feature{" "}
        </p>{" "}
      </div>{" "}
      {/* Tours Grid */}{" "}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {" "}
        {TOURS.map((tour) => {
          const isCompleted = completedTours.includes(tour.id);
          return (
            <Card
              key={tour.id}
              className="cursor-pointer transition-all hover:shadow-lg"
            >
              {" "}
              <CardHeader>
                {" "}
                <div className="flex items-start justify-between">
                  {" "}
                  <div>
                    {" "}
                    <CardTitle className="flex items-center gap-2">
                      {" "}
                      <HelpCircle className="h-5 w-5 text-primary" />{" "}
                      {tour.title}{" "}
                      {isCompleted && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}{" "}
                    </CardTitle>{" "}
                    <p className="mt-1 text-sm text-muted-foreground">
                      {" "}
                      {tour.description}{" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
              </CardHeader>{" "}
              <CardContent className="space-y-4">
                {" "}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {" "}
                  <span>⏱️ {tour.duration}</span>{" "}
                  <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">
                    {" "}
                    {tour.difficulty}{" "}
                  </span>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <p className="text-xs font-medium text-muted-foreground">
                    {" "}
                    {tour.steps.length} steps{" "}
                  </p>{" "}
                </div>{" "}
                <Button
                  onClick={() => startTour(tour)}
                  className="w-full"
                  variant={isCompleted ? "outline" : "default"}
                >
                  {" "}
                  {isCompleted ? "Review Tour" : "Start Tour"}{" "}
                </Button>{" "}
              </CardContent>{" "}
            </Card>
          );
        })}{" "}
      </div>{" "}
      {/* Completed Tours Summary */}{" "}
      {completedTours.length > 0 && (
        <Card className="bg-green-50">
          {" "}
          <CardContent className="pt-6">
            {" "}
            <div className="flex items-center gap-2">
              {" "}
              <CheckCircle className="h-5 w-5 text-green-600" />{" "}
              <p className="text-sm font-medium text-green-900">
                {" "}
                Great job! You've completed {completedTours.length} tour{" "}
                {completedTours.length !== 1 ? "s" : ""}. Keep learning!{" "}
              </p>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
    </div>
  );
}
