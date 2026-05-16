/**
 * Personalized Training Plan Component
 *
 * Displays EchoAI^3-powered training recommendations
 * Not one-size-fits-all - tailored to each employee
 */

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap,
  Brain,
  Target,
  CheckCircle2,
  Clock,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/glass";

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: number;
  learningObjectives: string[];
  estimatedImprovement: {
    metric: string;
    expectedIncrease: number;
  };
}

interface PersonalizedTrainingPlan {
  employeeId: string;
  employeeName: string;
  currentLevel: {
    overall: number;
    skills: Record<string, number>;
    gaps: string[];
  };
  recommendedModules: Array<{
    module: TrainingModule;
    priority: "critical" | "high" | "medium" | "low";
    reason: string;
    expectedImpact: string;
    estimatedCompletion: string;
    aiConfidence: number;
  }>;
  learningPath: Array<{
    phase: number;
    modules: string[];
    estimatedDuration: number;
    expectedOutcome: string;
  }>;
  timeline: {
    startDate: string;
    milestones: Array<{
      date: string;
      module: string;
      expectedImprovement: string;
    }>;
    completionDate: string;
  };
  aiInsights: {
    learningStyle: string;
    bestApproach: string;
    motivationFactors: string[];
    challenges: string[];
  };
}

export function PersonalizedTrainingPlan({
  employeeId,
}: {
  employeeId: string;
}) {
  const { toast } = useToast();
  const [plan, setPlan] = React.useState<PersonalizedTrainingPlan | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [focusAreas, setFocusAreas] = React.useState<string[]>([]);

  React.useEffect(() => {
    loadTrainingPlan();
  }, [employeeId, focusAreas]);

  const loadTrainingPlan = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/development/training-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          focusAreas: focusAreas.length > 0 ? focusAreas : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setPlan(data.data);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load training plan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto p-6 space-y-6 bg-background">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-primary" />
            Personalized Training Plan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            EchoAI^3-powered training recommendations tailored to individual
            needs
          </p>
        </div>
        <Button onClick={loadTrainingPlan} disabled={loading}>
          <RefreshCw
            className={cn("w-4 h-4 mr-2", loading && "animate-spin")}
          />
          Regenerate Plan
        </Button>
      </div>

      {plan && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="path">Learning Path</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Current Level */}
            <Card>
              <CardHeader>
                <CardTitle>Current Performance Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">
                        Overall
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {plan.currentLevel.overall.toFixed(0)}/100
                      </span>
                    </div>
                    <Progress
                      value={plan.currentLevel.overall}
                      className="h-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(plan.currentLevel.skills).map(
                      ([skill, level]) => (
                        <div key={skill}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-foreground capitalize">
                              {skill}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {level.toFixed(0)}/100
                            </span>
                          </div>
                          <Progress value={level} className="h-2" />
                        </div>
                      ),
                    )}
                  </div>
                  {plan.currentLevel.gaps.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">
                        Identified Gaps:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {plan.currentLevel.gaps.map((gap, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-destructive"
                          >
                            {gap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    Learning Style
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {plan.aiInsights.learningStyle}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    Best Approach
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {plan.aiInsights.bestApproach}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    Motivation Factors
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {plan.aiInsights.motivationFactors.map((factor, idx) => (
                      <li key={idx}>{factor}</li>
                    ))}
                  </ul>
                </div>
                {plan.aiInsights.challenges.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-destructive mb-1">
                      Challenges
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {plan.aiInsights.challenges.map((challenge, idx) => (
                        <li key={idx}>{challenge}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modules" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Recommended Training Modules</CardTitle>
                <CardDescription>
                  {plan.recommendedModules.length} module(s) recommended
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plan.recommendedModules.map((rec, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              {rec.module.title}
                            </CardTitle>
                            <CardDescription>
                              {rec.module.description}
                            </CardDescription>
                          </div>
                          <Badge
                            variant={
                              rec.priority === "critical"
                                ? "destructive"
                                : rec.priority === "high"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {rec.priority}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Category:
                            </span>
                            <span className="ml-2 font-medium text-foreground capitalize">
                              {rec.module.category}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Difficulty:
                            </span>
                            <span className="ml-2 font-medium text-foreground capitalize">
                              {rec.module.difficulty}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Duration:
                            </span>
                            <span className="ml-2 font-medium text-foreground">
                              {rec.module.duration} minutes
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              AI Confidence:
                            </span>
                            <span className="ml-2 font-medium text-foreground">
                              {rec.aiConfidence}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground mb-1">
                            Why This Module:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {rec.reason}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground mb-1">
                            Expected Impact:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {rec.expectedImpact}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground mb-1">
                            Learning Objectives:
                          </p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground">
                            {rec.module.learningObjectives.map((obj, i) => (
                              <li key={i}>{obj}</li>
                            ))}
                          </ul>
                        </div>
                        <Button className="w-full">
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Start Module
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="path" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Learning Path</CardTitle>
                <CardDescription>
                  Structured learning journey across {plan.learningPath.length}{" "}
                  phase(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plan.learningPath.map((phase, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">
                            Phase {phase.phase}
                          </CardTitle>
                          <Badge variant="outline">
                            {phase.estimatedDuration} days
                          </Badge>
                        </div>
                        <CardDescription>
                          {phase.expectedOutcome}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">
                          {phase.modules.length} module(s) in this phase
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Training Timeline</CardTitle>
                <CardDescription>
                  Start: {format(new Date(plan.timeline.startDate), "PPP")} •
                  Completion:{" "}
                  {format(new Date(plan.timeline.completionDate), "PPP")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {plan.timeline.milestones.map((milestone, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 border border-border rounded-lg"
                    >
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">
                          {milestone.module}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(milestone.date), "PPP")}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {milestone.expectedImprovement}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>EchoAI^3 Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Learning Style Analysis
                  </p>
                  <p className="text-muted-foreground">
                    {plan.aiInsights.learningStyle}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Recommended Approach
                  </p>
                  <p className="text-muted-foreground">
                    {plan.aiInsights.bestApproach}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">
                    What Motivates This Employee
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {plan.aiInsights.motivationFactors.map((factor, idx) => (
                      <li key={idx}>{factor}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
