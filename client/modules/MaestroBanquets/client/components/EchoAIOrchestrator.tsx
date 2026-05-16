import React from "react";

import { format } from "date-fns";
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Clock,
  Eye,
  Pause,
  Play,
  RefreshCw,
  Settings,
} from "lucide-react";

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
import { EVENT_TYPES, maestroEventBus } from "@/modules/MaestroBQT/event-bus";

interface BEOAnalysis {
  beoId: string;
  beoNumber: string;
  eventName: string;
  eventDate: string; /* ISO date */
  guestCount: number;
  status: "monitoring" | "analyzing" | "scaling" | "ordering" | "completed";
  recipesFound: number;
  recipesScaled: number;
  prepTimeCalculated: boolean;
  orderGenerated: boolean;
}

function statusVariant(
  status: BEOAnalysis["status"],
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "completed") return "default";
  if (status === "ordering") return "secondary";
  if (status === "analyzing") return "outline";
  return "secondary";
}

export default function EchoAIOrchestrator() {
  const { toast } = useToast();

  const [beoAnalyses, setBeoAnalyses] = React.useState<BEOAnalysis[]>([]);
  const [isMonitoring, setIsMonitoring] = React.useState(true);
  const [loading, setLoading] = React.useState(false);

  const loadBEOAnalyses = React.useCallback(async () => {
    setLoading(true);
    try {
      /* Replace with store-backed analyses produced by MaestroBQT + EchoAI pipelines. */
      const today = format(new Date(), "yyyy-MM-dd");
      setBeoAnalyses([
        {
          beoId: "beo-1",
          beoNumber: "BEO-2026-001",
          eventName: "Wedding Reception",
          eventDate: today,
          guestCount: 150,
          status: "scaling",
          recipesFound: 12,
          recipesScaled: 8,
          prepTimeCalculated: true,
          orderGenerated: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadBEOAnalyses();

    const unsubscribe = maestroEventBus.subscribeTo(
      EVENT_TYPES.BEO_DETAIL_CHANGED,
      () => {
        toast({
          title: "BEO Updated",
          description: "EchoAI³ is re-evaluating changes…",
        });
        if (isMonitoring) void loadBEOAnalyses();
      },
    );

    return () => {
      try {
        unsubscribe?.();
      } catch {
        /* ignore */
      }
    };
  }, [isMonitoring, loadBEOAnalyses, toast]);

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                EchoAI³ Banquet Orchestrator
              </CardTitle>
              <CardDescription>
                Central AI coordination system for banquet operations
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isMonitoring ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsMonitoring(false);
                    toast({
                      title: "Monitoring Paused",
                      description: "EchoAI³ monitoring paused.",
                    });
                  }}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Stop Monitoring
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setIsMonitoring(true);
                    toast({
                      title: "Monitoring Started",
                      description: "EchoAI³ is now monitoring all BEO changes.",
                    });
                  }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Monitoring
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => alert("Wire settings panel")}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadBEOAnalyses()}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {beoAnalyses.map((analysis) => (
              <Card key={analysis.beoId}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        {analysis.eventName}
                      </CardTitle>
                      <CardDescription>
                        {analysis.beoNumber} •{" "}
                        {format(new Date(analysis.eventDate), "MMM d, yyyy")} •{" "}
                        {analysis.guestCount} guests
                      </CardDescription>
                    </div>
                    <Badge variant={statusVariant(analysis.status)}>
                      {analysis.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Recipes Found
                      </p>
                      <p className="text-2xl font-bold">
                        {analysis.recipesFound}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Recipes Scaled
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {analysis.recipesScaled}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Prep Time
                      </p>
                      <div className="flex items-center gap-1">
                        {analysis.prepTimeCalculated ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-amber-500" />
                        )}
                        <span className="text-sm">
                          {analysis.prepTimeCalculated
                            ? "Calculated"
                            : "Pending"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Order
                      </p>
                      <div className="flex items-center gap-1">
                        {analysis.orderGenerated ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                        )}
                        <span className="text-sm">
                          {analysis.orderGenerated ? "Generated" : "Pending"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => alert("Wire details view")}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Re-analyze",
                          description: "Re-analysis queued (wire to workflow).",
                        });
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Re-analyze
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {beoAnalyses.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                No BEO analyses yet.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
