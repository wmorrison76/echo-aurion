/**
 * Pre-Shift Briefing Panel
 *
 * Helps managers get the most from their assembled team
 * Provides insights and focus areas for the shift
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Brain,
  Target,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/glass";

interface PreShiftBriefing {
  shiftId: string;
  date: string;
  shiftTime: string;
  teamSize: number;
  teamComposition: {
    roles: Record<string, number>;
    experienceLevel: {
      expert: number;
      advanced: number;
      intermediate: number;
      beginner: number;
    };
    averageRating: number;
    teamStrengths: string[];
    potentialGaps: string[];
  };
  teamDynamics: {
    collaborationScore: number;
    communicationScore: number;
    leadershipPresence: boolean;
    identifiedLeaders: string[];
    potentialChallenges: string[];
  };
  shiftContext: {
    eventType?: string;
    guestCount?: number;
    serviceType?: string;
    difficulty: "easy" | "medium" | "hard" | "expert";
    workload: "light" | "moderate" | "heavy" | "extreme";
  };
  focusAreas: Array<{
    area: string;
    priority: "critical" | "high" | "medium" | "low";
    description: string;
    recommendedActions: string[];
  }>;
  performancePrediction: {
    expectedRating: number;
    confidence: number;
    riskFactors: string[];
    successFactors: string[];
  };
  managerTips: string[];
  aiInsights: {
    teamSynergy: string;
    optimalDeployment: string;
    watchPoints: string[];
    motivationStrategies: string[];
  };
}

export function PreShiftBriefingPanel({ shiftId }: { shiftId: string }) {
  const { toast } = useToast();
  const [briefing, setBriefing] = React.useState<PreShiftBriefing | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    loadBriefing();
  }, [shiftId]);

  const loadBriefing = async () => {
    setLoading(true);
    try {
      // In production, fetch shift data first, then generate briefing
      const response = await fetch("/api/development/pre-shift-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shift: { shiftId }, // In production, include full shift data
        }),
      });

      const data = await response.json();
      if (data.success) {
        setBriefing(data.data);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load briefing",
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
            <Users className="w-8 h-8 text-primary" />
            Pre-Shift Briefing
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Get the most from your team with AI-powered insights
          </p>
        </div>
        <Button onClick={loadBriefing} disabled={loading}>
          <RefreshCw
            className={cn("w-4 h-4 mr-2", loading && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {briefing && (
        <>
          {/* Team Overview */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Team Size
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {briefing.teamSize}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Avg Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {(briefing.teamComposition.averageRating / 20).toFixed(1)}/5
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Collaboration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {briefing.teamDynamics.collaborationScore.toFixed(0)}/100
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Expected Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {briefing.performancePrediction.expectedRating.toFixed(1)}/5
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Composition */}
          <Card>
            <CardHeader>
              <CardTitle>Team Composition</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Roles
                  </p>
                  <div className="space-y-2">
                    {Object.entries(briefing.teamComposition.roles).map(
                      ([role, count]) => (
                        <div
                          key={role}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm text-foreground">
                            {role}
                          </span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ),
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Experience Level
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Expert</span>
                      <Badge variant="default">
                        {briefing.teamComposition.experienceLevel.expert}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Advanced</span>
                      <Badge variant="secondary">
                        {briefing.teamComposition.experienceLevel.advanced}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">
                        Intermediate
                      </span>
                      <Badge variant="outline">
                        {briefing.teamComposition.experienceLevel.intermediate}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Beginner</span>
                      <Badge variant="outline">
                        {briefing.teamComposition.experienceLevel.beginner}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              {briefing.teamComposition.teamStrengths.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Team Strengths
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {briefing.teamComposition.teamStrengths.map(
                      (strength, idx) => (
                        <Badge key={idx} variant="default">
                          {strength}
                        </Badge>
                      ),
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Focus Areas */}
          {briefing.focusAreas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Focus Areas for This Shift</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {briefing.focusAreas.map((area, idx) => (
                    <Alert
                      key={idx}
                      variant={
                        area.priority === "critical" ? "destructive" : "default"
                      }
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-semibold mb-1">{area.area}</div>
                        <p className="text-sm mb-2">{area.description}</p>
                        <ul className="list-disc list-inside text-sm">
                          {area.recommendedActions.map((action, i) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                EchoAI^3 Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  Team Synergy
                </p>
                <p className="text-sm text-muted-foreground">
                  {briefing.aiInsights.teamSynergy}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  Optimal Deployment
                </p>
                <p className="text-sm text-muted-foreground">
                  {briefing.aiInsights.optimalDeployment}
                </p>
              </div>
              {briefing.aiInsights.watchPoints.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    Watch Points
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {briefing.aiInsights.watchPoints.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  Motivation Strategies
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {briefing.aiInsights.motivationStrategies.map(
                    (strategy, idx) => (
                      <li key={idx}>{strategy}</li>
                    ),
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Manager Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Manager Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {briefing.managerTips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 bg-surface rounded"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-foreground">{tip}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
