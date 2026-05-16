import React from "react";

import type { AdvisoryMessage } from "@/../shared/types/advisory";
import { upsertAdvisory } from "@/lib/advisory-store";
import { osBus } from "@/lib/os-bus";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Lightbulb,
  Users,
} from "lucide-react";

function getSeverityColor(severity: "info" | "warning" | "critical") {
  switch (severity) {
    case "critical":
      return {
        bg: "bg-red-50 dark:bg-red-950/20",
        border: "border-red-200 dark:border-red-900/50",
        text: "text-red-600 dark:text-red-400",
        badge: "destructive",
      } as const;
    case "warning":
      return {
        bg: "bg-amber-50 dark:bg-amber-950/20",
        border: "border-amber-200 dark:border-amber-900/50",
        text: "text-amber-600 dark:text-amber-400",
        badge: "secondary",
      } as const;
    default:
      return {
        bg: "bg-blue-50 dark:bg-blue-950/20",
        border: "border-blue-200 dark:border-blue-900/50",
        text: "text-primary dark:text-blue-400",
        badge: "outline",
      } as const;
  }
}

function getSeverityIcon(severity: "info" | "warning" | "critical") {
  switch (severity) {
    case "critical":
      return <AlertTriangle className="h-5 w-5" />;
    case "warning":
      return <AlertCircle className="h-5 w-5" />;
    default:
      return <Lightbulb className="h-5 w-5" />;
  }
}

export default function EchoAdvisoryPanel() {
  const [advisory, setAdvisory] = React.useState<AdvisoryMessage | null>(null);

  React.useEffect(() => {
    const unsubscribe = osBus.on("echo:advisory_generated", (payload: any) => {
      const next: AdvisoryMessage = {
        advisoryId: payload.advisoryId,
        beoId: payload.beoId,
        revision: payload.revision,
        title: payload.title,
        summary: payload.summary,
        impacts: payload.impacts,
        recommendations: payload.recommendations,
        severity: payload.severity,
        generatedAt: payload.generatedAt,
      };

      upsertAdvisory(next);
      setAdvisory(next);
    });

    return () => {
      try {
        unsubscribe?.();
      } catch {
        // ignore
      }
    };
  }, []);

  if (!advisory) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-slate-400" />
          <p className="text-sm text-muted-foreground">
            No advisory generated yet.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Generate a BEO to see operational impact analysis.
          </p>
        </div>
      </div>
    );
  }

  const severityStyle = getSeverityColor(advisory.severity);

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      <div
        className={`flex-shrink-0 border-b ${severityStyle.border} p-4 ${severityStyle.bg}`}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={severityStyle.text}>
                {getSeverityIcon(advisory.severity)}
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                {advisory.title}
              </h2>
            </div>
            <Badge
              variant={
                severityStyle.badge as
                  | "destructive"
                  | "secondary"
                  | "outline"
                  | "default"
              }
            >
              {advisory.severity.charAt(0).toUpperCase() +
                advisory.severity.slice(1)}
            </Badge>
          </div>

          <p className="text-sm text-foreground/80">{advisory.summary}</p>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/20">
            <div className="rounded-lg bg-background dark:bg-black/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-foreground/60" />
                <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
                  Food Cost
                </span>
              </div>
              <div className="text-xl font-bold text-foreground">
                {(advisory.impacts.foodCostDelta ?? 0) > 0 ? "+" : ""}$
                {(advisory.impacts.foodCostDelta ?? 0).toFixed(2)}
              </div>
              <p className="text-xs text-foreground/60 mt-1">
                {advisory.impacts.foodCostDelta === undefined
                  ? "N/A"
                  : advisory.impacts.foodCostDelta > 0
                    ? "Cost increase"
                    : advisory.impacts.foodCostDelta < 0
                      ? "Cost savings"
                      : "No change"}
              </p>
            </div>

            <div className="rounded-lg bg-background dark:bg-black/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-foreground/60" />
                <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
                  Staffing
                </span>
              </div>
              <div className="text-xl font-bold text-foreground">
                {(advisory.impacts.laborStaffDelta ?? 0) > 0 ? "+" : ""}
                {advisory.impacts.laborStaffDelta ?? 0}
              </div>
              <p className="text-xs text-foreground/60 mt-1">
                {advisory.impacts.laborStaffDelta === undefined
                  ? "N/A"
                  : advisory.impacts.laborStaffDelta > 0
                    ? "Staff needed"
                    : advisory.impacts.laborStaffDelta < 0
                      ? "Staff excess"
                      : "Balanced"}
              </p>
            </div>

            <div className="rounded-lg bg-background dark:bg-black/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-foreground/60" />
                <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
                  Total Hours
                </span>
              </div>
              <div className="text-xl font-bold text-foreground">
                {(advisory.impacts.laborHoursDelta ?? 0).toFixed(1)}h
              </div>
              <p className="text-xs text-foreground/60 mt-1">Estimated total</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Card className="border-0 shadow-none bg-transparent rounded-none h-full">
          <CardContent className="p-4">
            {advisory.recommendations.length > 0 ? (
              <div className="space-y-3">
                <div className="mb-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4" />
                    Recommendations
                  </h3>
                </div>
                <div className="space-y-3">
                  {advisory.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-border/20 bg-muted/30 p-3 text-sm text-foreground/80"
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5 h-2 w-2 rounded-full bg-primary/60 flex-shrink-0" />
                        <p>{rec}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-foreground/60">
                No recommendations at this time.
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-border/20 text-xs text-foreground/50 space-y-1">
              <div>
                <span className="font-semibold">Advisory ID:</span>{" "}
                {advisory.advisoryId}
              </div>
              <div>
                <span className="font-semibold">Generated:</span>{" "}
                {new Date(advisory.generatedAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
