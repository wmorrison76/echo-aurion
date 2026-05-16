import React from "react";

import { format } from "date-fns";
import { CheckCircle2, Eye, RefreshCw, X } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useToast } from "@/hooks/use-toast";

interface AIAssumption {
  id: string;
  category: string;
  assumption: string;
  reasoning: string;
  confidence: number;
  status: "approved" | "rejected" | "pending";
  impact: "high" | "medium" | "low";
  canOverride: boolean;
}

interface AIDecision {
  id: string;
  beoId: string;
  decisionType: string;
  timestamp: string;
  assumptions: AIAssumption[];
}

function impactVariant(
  impact: AIAssumption["impact"],
): "destructive" | "default" | "secondary" {
  if (impact === "high") return "destructive";
  if (impact === "medium") return "default";
  return "secondary";
}

export default function AITransparencyDashboard() {
  const { toast } = useToast();
  const [decisions, setDecisions] = React.useState<AIDecision[]>([]);
  const [loading, setLoading] = React.useState(false);

  const loadDecisions = React.useCallback(async () => {
    setLoading(true);
    try {
      const now = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");
      setDecisions([
        {
          id: "decision-1",
          beoId: "beo-1",
          decisionType: "Order Generation",
          timestamp: now,
          assumptions: [
            {
              id: "assumption-1",
              category: "Inventory",
              assumption: "Consolidated identical items across two events",
              reasoning: "Reduces delivery cost and improves vendor batching.",
              confidence: 0.95,
              status: "pending",
              impact: "high",
              canOverride: true,
            },
            {
              id: "assumption-2",
              category: "Timing",
              assumption: "Delivery scheduled 24 hours before prep start",
              reasoning:
                "Allows time for receiving and QA prior to production.",
              confidence: 0.9,
              status: "pending",
              impact: "medium",
              canOverride: true,
            },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadDecisions();
  }, [loadDecisions]);

  const setAssumptionStatus = React.useCallback(
    (
      decisionId: string,
      assumptionId: string,
      status: "approved" | "rejected",
    ) => {
      setDecisions((prev) =>
        prev.map((d) =>
          d.id !== decisionId
            ? d
            : {
                ...d,
                assumptions: d.assumptions.map((a) =>
                  a.id === assumptionId ? { ...a, status } : a,
                ),
              },
        ),
      );
      toast({
        title:
          status === "approved" ? "Assumption Approved" : "Assumption Rejected",
        description:
          "Decision audit should be recorded once wired to persistence.",
      });
    },
    [toast],
  );

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-6 w-6 text-primary" />
                AI Transparency Dashboard
              </CardTitle>
              <CardDescription>
                Review AI assumptions, confidence, and impact before approval
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadDecisions()}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {decisions.map((decision) => {
              const pending = decision.assumptions.filter(
                (a) => a.status === "pending",
              ).length;
              return (
                <Card key={decision.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">
                          {decision.decisionType}
                        </CardTitle>
                        <CardDescription>
                          BEO {decision.beoId} •{" "}
                          {format(
                            new Date(decision.timestamp),
                            "MMM d, h:mm a",
                          )}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">{pending} pending</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {decision.assumptions.map((assumption) => (
                        <div
                          key={assumption.id}
                          className="border rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <Badge variant="outline">
                                  {assumption.category}
                                </Badge>
                                <Badge
                                  variant={impactVariant(assumption.impact)}
                                >
                                  {assumption.impact} impact
                                </Badge>
                                <Badge variant="secondary">
                                  {(assumption.confidence * 100).toFixed(0)}%
                                  confidence
                                </Badge>
                              </div>
                              <div className="font-medium">
                                {assumption.assumption}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                <strong>Reasoning:</strong>{" "}
                                {assumption.reasoning}
                              </div>
                            </div>

                            {assumption.status === "pending" &&
                            assumption.canOverride ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setAssumptionStatus(
                                      decision.id,
                                      assumption.id,
                                      "approved",
                                    )
                                  }
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setAssumptionStatus(
                                      decision.id,
                                      assumption.id,
                                      "rejected",
                                    )
                                  }
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <Badge
                                variant={
                                  assumption.status === "approved"
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {assumption.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
