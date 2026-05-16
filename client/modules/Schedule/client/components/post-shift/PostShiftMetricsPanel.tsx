/**
 * Post-Shift Metrics Panel
 *
 * Displays shift performance and team motivation
 * Compares to predictions and previous shifts
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
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Users,
  RefreshCw,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/glass";

interface PostShiftMetrics {
  shiftId: string;
  date: string;
  shiftTime: string;
  teamSize: number;
  performance: {
    overallRating: number;
    punctuality: number;
    quality: number;
    teamwork: number;
    guestSatisfaction?: number;
    efficiency: number;
  };
  goals: {
    set: Array<{
      goal: string;
      target: number;
      achieved: number;
      status: "exceeded" | "met" | "missed";
    }>;
    overallAchievement: number;
  };
  individualContributions: Array<{
    employeeId: string;
    employeeName: string;
    role: string;
    rating: number;
    highlights: string[];
    recognition: string[];
  }>;
  teamHighlights: Array<{
    type: string;
    description: string;
    contributors: string[];
  }>;
  motivation: {
    achievements: string[];
    recognition: string[];
    encouragement: string[];
    nextShiftGoals: string[];
  };
  comparison: {
    vsPreShiftPrediction: {
      predicted: number;
      actual: number;
      variance: number;
    };
    vsPreviousShift: {
      previous: number;
      current: number;
      change: number;
    };
    vsTeamAverage: {
      teamAverage: number;
      shiftRating: number;
      rank: number;
    };
  };
  insights: string[];
}

export function PostShiftMetricsPanel({ shiftId }: { shiftId: string }) {
  const { toast } = useToast();
  const [metrics, setMetrics] = React.useState<PostShiftMetrics | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    loadMetrics();
  }, [shiftId]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/development/post-shift-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shift: { shiftId }, // In production, include full shift data
          evaluations: [], // In production, fetch actual evaluations
          goals: undefined, // In production, fetch shift goals
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load metrics",
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
            <BarChart3 className="w-8 h-8 text-primary" />
            Post-Shift Metrics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Shift performance analysis and team motivation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadMetrics} disabled={loading}>
            <RefreshCw
              className={cn("w-4 h-4 mr-2", loading && "animate-spin")}
            />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {metrics && (
        <>
          {/* Performance Summary */}
          <div className="grid grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Overall Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.performance.overallRating.toFixed(1)}/5
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Quality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {metrics.performance.quality.toFixed(1)}/5
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Teamwork
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {metrics.performance.teamwork.toFixed(1)}/5
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {metrics.performance.efficiency.toFixed(0)}/100
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Punctuality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.performance.punctuality.toFixed(0)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Goals Achievement */}
          {metrics.goals.set.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Shift Goals</CardTitle>
                  <Badge
                    variant={
                      metrics.goals.overallAchievement >= 100
                        ? "default"
                        : "secondary"
                    }
                  >
                    {metrics.goals.overallAchievement.toFixed(0)}% Achieved
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.goals.set.map((goal, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {goal.goal}
                        </span>
                        <Badge
                          variant={
                            goal.status === "exceeded"
                              ? "default"
                              : goal.status === "met"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {goal.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={(goal.achieved / goal.target) * 100}
                          className="flex-1 h-2"
                        />
                        <span className="text-xs text-muted-foreground w-20 text-right">
                          {goal.achieved.toFixed(1)} / {goal.target.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    vs Prediction
                  </p>
                  <div className="flex items-center gap-2">
                    {metrics.comparison.vsPreShiftPrediction.variance > 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {metrics.comparison.vsPreShiftPrediction.actual.toFixed(
                          1,
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Predicted:{" "}
                        {metrics.comparison.vsPreShiftPrediction.predicted.toFixed(
                          1,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    vs Previous Shift
                  </p>
                  <div className="flex items-center gap-2">
                    {metrics.comparison.vsPreviousShift.change > 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {metrics.comparison.vsPreviousShift.change > 0
                          ? "+"
                          : ""}
                        {metrics.comparison.vsPreviousShift.change.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Previous:{" "}
                        {metrics.comparison.vsPreviousShift.previous.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    vs Team Average
                  </p>
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        Rank #{metrics.comparison.vsTeamAverage.rank}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Avg:{" "}
                        {metrics.comparison.vsTeamAverage.teamAverage.toFixed(
                          1,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Highlights */}
          {metrics.teamHighlights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Team Highlights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.teamHighlights.map((highlight, idx) => (
                    <Alert key={idx}>
                      <Award className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-semibold mb-1">
                          {highlight.description}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Contributors: {highlight.contributors.join(", ")}
                        </p>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Motivation */}
          <Card>
            <CardHeader>
              <CardTitle>Team Motivation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {metrics.motivation.achievements.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Achievements
                  </p>
                  <div className="space-y-1">
                    {metrics.motivation.achievements.map((achievement, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2 bg-green-500/10 rounded"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-foreground">{achievement}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {metrics.motivation.recognition.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Recognition
                  </p>
                  <div className="space-y-1">
                    {metrics.motivation.recognition.map((rec, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2 bg-primary/10 rounded"
                      >
                        <Award className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-foreground">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {metrics.motivation.encouragement.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Encouragement
                  </p>
                  <div className="space-y-1">
                    {metrics.motivation.encouragement.map((enc, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2 bg-muted rounded"
                      >
                        <TrendingUp className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-foreground">{enc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {metrics.motivation.nextShiftGoals.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Next Shift Goals
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {metrics.motivation.nextShiftGoals.map((goal, idx) => (
                      <li key={idx}>{goal}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Individual Contributions */}
          <Card>
            <CardHeader>
              <CardTitle>Individual Contributions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.individualContributions.map((contrib, idx) => (
                  <div
                    key={idx}
                    className="p-3 border border-border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-foreground">
                          {contrib.employeeName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contrib.role}
                        </p>
                      </div>
                      <Badge
                        variant={
                          contrib.rating >= 4.5 ? "default" : "secondary"
                        }
                      >
                        {contrib.rating.toFixed(1)}/5
                      </Badge>
                    </div>
                    {contrib.highlights.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-foreground mb-1">
                          Highlights:
                        </p>
                        <ul className="list-disc list-inside text-xs text-muted-foreground">
                          {contrib.highlights.map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {contrib.recognition.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-primary mb-1">
                          Recognition:
                        </p>
                        <ul className="list-disc list-inside text-xs text-muted-foreground">
                          {contrib.recognition.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          {metrics.insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {metrics.insights.map((insight, idx) => (
                    <li key={idx}>{insight}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
