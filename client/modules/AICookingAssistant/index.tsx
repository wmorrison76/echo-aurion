import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Zap,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  BookOpen,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
import { useAppTheme } from "@/lib/theme-utils";
import { responsiveClasses } from "@/lib/responsive-utils";
import { useAICookingAssistantIntegration } from "./integrations/ai-integration";
interface GuidanceSession {
  id: string;
  dish: string;
  stage: string;
  timeRemaining: number;
  temperature: number;
  status: "in-progress" | "completed" | "paused";
  guidance: string;
  tips: string[];
}
interface ProblemSolution {
  id: string;
  problem: string;
  symptom: string;
  solution: string;
  successRate: number;
  timeToFix: number;
}
interface Innovation {
  id: string;
  dish: string;
  suggestion: string;
  complexity: "easy" | "medium" | "hard";
  timeRequired: number;
  confidence: number;
}
interface UsageMetric {
  date: string;
  sessionsGuided: number;
  problemsSolved: number;
  innovationsSuggested: number;
  userSatisfaction: number;
}
const CURRENT_SESSION: GuidanceSession = {
  id: "1",
  dish: "Pan-Seared Salmon",
  stage: "Plating",
  timeRemaining: 2,
  temperature: 145,
  status: "in-progress",
  guidance:
    "Salmon reaches 145°F internal. Rest 2 minutes before plating to lock in juices.",
  tips: [
    "Place on warm plate to prevent cooling",
    "Arrange microgreens on the side for height",
    "Drizzle sauce in circular pattern",
  ],
};
const PROBLEM_SOLUTIONS: ProblemSolution[] = [
  {
    id: "1",
    problem: "Salmon is dry",
    symptom: "Overcooked, lost moisture",
    solution: "Cook only to 145°F internal temp, rest before serving",
    successRate: 98,
    timeToFix: 2,
  },
  {
    id: "2",
    problem: "Sauce broke",
    symptom: "Separated or curdled emulsion",
    solution: "Strain through fine mesh, whisk in fresh cold butter slowly",
    successRate: 95,
    timeToFix: 3,
  },
  {
    id: "3",
    problem: "Plating looks dull",
    symptom: "Lacks visual appeal and height",
    solution: "Add microgreens, use negative space, vary plate colors",
    successRate: 92,
    timeToFix: 1,
  },
];
const INNOVATIONS: Innovation[] = [
  {
    id: "1",
    dish: "Crabcakes",
    suggestion: "Try brown butter with sage instead of tartar sauce",
    complexity: "medium",
    timeRequired: 5,
    confidence: 87,
  },
  {
    id: "2",
    dish: "Salmon",
    suggestion: "Finish with candied lemon zest and black garlic",
    complexity: "hard",
    timeRequired: 8,
    confidence: 79,
  },
];
const USAGE_METRICS: UsageMetric[] = [
  {
    date: "Mon",
    sessionsGuided: 12,
    problemsSolved: 2,
    innovationsSuggested: 1,
    userSatisfaction: 4.3,
  },
  {
    date: "Tue",
    sessionsGuided: 14,
    problemsSolved: 3,
    innovationsSuggested: 2,
    userSatisfaction: 4.5,
  },
  {
    date: "Wed",
    sessionsGuided: 16,
    problemsSolved: 1,
    innovationsSuggested: 3,
    userSatisfaction: 4.6,
  },
  {
    date: "Thu",
    sessionsGuided: 18,
    problemsSolved: 2,
    innovationsSuggested: 2,
    userSatisfaction: 4.7,
  },
];
export default function AICookingAssistantModule() {
  const { t } = useI18n();
  const { theme, isDark } = useAppTheme();
  const { checkIngredientAvailability } = useAICookingAssistantIntegration();
  const [activeTab, setActiveTab] = useState("guidance");
  const [inputProblem, setInputProblem] = useState("");
  const totalSessions = USAGE_METRICS.reduce(
    (sum, m) => sum + m.sessionsGuided,
    0,
  );
  const totalProblems = USAGE_METRICS.reduce(
    (sum, m) => sum + m.problemsSolved,
    0,
  );
  const avgSatisfaction = (
    USAGE_METRICS.reduce((sum, m) => sum + m.userSatisfaction, 0) /
    USAGE_METRICS.length
  ).toFixed(1);
  const handleGetHelp = async () => {
    if (!inputProblem) return;
    try {
      const response = await fetch("/api/ai-cooking-assistant/problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem: inputProblem }),
      });
      if (!response.ok) throw new Error("Failed to get help");
    } catch (error) {
      console.error("Help error:", error);
    }
  };
  return (
    <div
      className={cn(
        "w-full h-full overflow-y-auto bg-background text-foreground backdrop-blur-sm",
        responsiveClasses({ default: "p-4", md: "p-6", lg: "p-8" }),
        "space-y-6",
      )}
    >
      {" "}
      {/* Header */}{" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            {" "}
            <Zap className="w-8 h-8 text-yellow-500" />{" "}
            {t("module.ai-cooking-assistant.title")}{" "}
          </h1>{" "}
          <p className="text-sm text-foreground/60 mt-1">
            {t("module.ai-cooking-assistant.description")}
          </p>{" "}
        </div>{" "}
        <ModuleChatButton
          moduleId="ai-cooking-assistant"
          moduleName={t("module.ai-cooking-assistant.title")}
        />{" "}
      </div>{" "}
      {/* Quick Stats */}{" "}
      <div
        className={responsiveClasses({
          default: "grid grid-cols-1 gap-3",
          sm: "grid grid-cols-2 gap-3",
          md: "grid grid-cols-4 gap-4",
        })}
      >
        {" "}
        <Card className="bg-background border-white/10">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-foreground/60">
              {t("module.ai-cooking-assistant.stats.sessions")}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-cyan-500">
              {totalSessions}
            </div>{" "}
            <p className="text-xs text-foreground/50 mt-1">
              {t("module.ai-cooking-assistant.stats.thisWeek")}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="bg-background border-white/10">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-foreground/60">
              {t("module.ai-cooking-assistant.stats.problems")}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-green-500">
              {totalProblems}
            </div>{" "}
            <p className="text-xs text-foreground/50 mt-1">
              {t("module.ai-cooking-assistant.stats.wastePrevented")}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="bg-background border-white/10">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-foreground/60">
              {t("module.ai-cooking-assistant.stats.satisfaction")}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-yellow-500">
              {avgSatisfaction}⭐
            </div>{" "}
            <p className="text-xs text-foreground/50 mt-1">
              {t("module.ai-cooking-assistant.stats.avgRating")}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="bg-background border-white/10">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-foreground/60">
              {t("module.ai-cooking-assistant.stats.innovations")}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-purple-500">
              {INNOVATIONS.length}
            </div>{" "}
            <p className="text-xs text-foreground/50 mt-1">
              {t("module.ai-cooking-assistant.stats.thisWeek")}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Tabs */}{" "}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {" "}
        <TabsList className="grid w-full grid-cols-3 bg-background border border-white/10 p-1 rounded-lg">
          {" "}
          <TabsTrigger value="guidance">
            {t("module.ai-cooking-assistant.tabs.guidance")}
          </TabsTrigger>{" "}
          <TabsTrigger value="problems">
            {t("module.ai-cooking-assistant.tabs.problems")}
          </TabsTrigger>{" "}
          <TabsTrigger value="innovations">
            {t("module.ai-cooking-assistant.tabs.innovations")}
          </TabsTrigger>{" "}
        </TabsList>{" "}
        {/* Guidance */}{" "}
        <TabsContent value="guidance" className="space-y-4 mt-4">
          {" "}
          <Card className="bg-background border-white/10">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>
                {t("module.ai-cooking-assistant.guidance.currentSession")}
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-4">
              {" "}
              <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg p-6">
                {" "}
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {CURRENT_SESSION.dish}
                </h3>{" "}
                <p className="text-sm text-foreground/70 mb-4">
                  {t("module.ai-cooking-assistant.guidance.stage")}:{" "}
                  {CURRENT_SESSION.stage}
                </p>{" "}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {" "}
                  <div className="bg-background rounded p-4">
                    {" "}
                    <p className="text-foreground/60 text-sm">
                      {t("module.ai-cooking-assistant.guidance.temperature")}
                    </p>{" "}
                    <p className="text-3xl font-bold text-green-500 mt-2">
                      {CURRENT_SESSION.temperature}°F
                    </p>{" "}
                  </div>{" "}
                  <div className="bg-background rounded p-4">
                    {" "}
                    <p className="text-foreground/60 text-sm">
                      {t("module.ai-cooking-assistant.guidance.timeRemaining")}
                    </p>{" "}
                    <p className="text-3xl font-bold text-yellow-500 mt-2">
                      {CURRENT_SESSION.timeRemaining}{" "}
                      {t("module.ai-cooking-assistant.guidance.min")}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="bg-primary/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                  {" "}
                  <p className="font-semibold text-foreground mb-2">
                    {t("module.ai-cooking-assistant.guidance.aiGuidance")}:
                  </p>{" "}
                  <p className="text-foreground/80">
                    {CURRENT_SESSION.guidance}
                  </p>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <p className="font-semibold text-foreground mb-2">
                    {t("module.ai-cooking-assistant.guidance.proTips")}:
                  </p>{" "}
                  <ul className="space-y-2">
                    {" "}
                    {CURRENT_SESSION.tips.map((tip, idx) => (
                      <li key={idx} className="flex gap-2 text-foreground/80">
                        {" "}
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />{" "}
                        {tip}{" "}
                      </li>
                    ))}{" "}
                  </ul>{" "}
                </div>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Problems */}{" "}
        <TabsContent value="problems" className="space-y-4 mt-4">
          {" "}
          <Card className="bg-background border-white/10">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>
                {t("module.ai-cooking-assistant.problems.getHelp")}
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-4 mb-4">
              {" "}
              <div className="flex gap-2">
                {" "}
                <Input
                  placeholder={t(
                    "module.ai-cooking-assistant.problems.placeholder",
                  )}
                  value={inputProblem}
                  onChange={(e) => setInputProblem(e.target.value)}
                  className="flex-1"
                />{" "}
                <Button onClick={handleGetHelp}>
                  {t("module.ai-cooking-assistant.problems.getHelpButton")}
                </Button>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card className="bg-background border-white/10">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>
                {t("module.ai-cooking-assistant.problems.commonSolutions")}
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-3">
              {" "}
              {PROBLEM_SOLUTIONS.map((sol) => (
                <div
                  key={sol.id}
                  className="border border-white/10 rounded-lg p-4"
                >
                  {" "}
                  <div className="flex justify-between items-start mb-2">
                    {" "}
                    <div>
                      {" "}
                      <h4 className="font-semibold text-foreground">
                        {sol.problem}
                      </h4>{" "}
                      <p className="text-xs text-foreground/60 mt-1">
                        {sol.symptom}
                      </p>{" "}
                    </div>{" "}
                    <div className="text-right">
                      {" "}
                      <div className="text-lg font-bold text-green-500">
                        {sol.successRate}%
                      </div>{" "}
                      <p className="text-xs text-foreground/60">
                        {t("module.ai-cooking-assistant.problems.successRate")}
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                  <p className="text-sm text-foreground/80 my-3">
                    ✓ {sol.solution}
                  </p>{" "}
                  <p className="text-xs text-foreground/60">
                    ⏱ {sol.timeToFix}{" "}
                    {t("module.ai-cooking-assistant.problems.fixTime")}
                  </p>{" "}
                </div>
              ))}{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Innovations */}{" "}
        <TabsContent value="innovations" className="space-y-4 mt-4">
          {" "}
          <Card className="bg-background border-white/10">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>
                {t("module.ai-cooking-assistant.innovations.title")}
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-3">
              {" "}
              {INNOVATIONS.map((inn) => (
                <div
                  key={inn.id}
                  className="border border-white/10 rounded-lg p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10"
                >
                  {" "}
                  <div className="flex justify-between items-start mb-2">
                    {" "}
                    <h4 className="font-semibold text-foreground">
                      {inn.dish}
                    </h4>{" "}
                    <div className="text-right">
                      {" "}
                      <div className="text-sm font-bold text-purple-500">
                        {inn.confidence}%{" "}
                        {t("module.ai-cooking-assistant.innovations.confident")}
                      </div>{" "}
                      <div
                        className={cn(
                          "text-xs font-semibold px-2 py-1 rounded mt-1",
                          inn.complexity === "easy"
                            ? "bg-green-500/20 text-green-500"
                            : inn.complexity === "medium"
                              ? "bg-yellow-500/20 text-yellow-500"
                              : "bg-red-500/20 text-red-500",
                        )}
                      >
                        {" "}
                        {inn.complexity}{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                  <p className="text-foreground/80 mb-2">💡 {inn.suggestion}</p>{" "}
                  <p className="text-xs text-foreground/60">
                    ⏱ {inn.timeRequired}{" "}
                    {t("module.ai-cooking-assistant.innovations.minutes")}
                  </p>{" "}
                </div>
              ))}{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
    </div>
  );
}
