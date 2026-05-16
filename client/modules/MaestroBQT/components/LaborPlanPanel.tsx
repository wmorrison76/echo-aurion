import React from "react";
import type { LaborPlan } from "@/../shared/types/labor";
import { osBus } from "@/lib/os-bus";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface LaborPlanPanelProps {
  plan?: LaborPlan | null;
  beoId?: string | null;
}

export default function LaborPlanPanel({
  plan: externalPlan,
  beoId,
}: LaborPlanPanelProps) {
  const [busPlan, setBusPlan] = React.useState<LaborPlan | null>(null);

  const openScheduleForEventWeek = React.useCallback(() => {
    if (!plan?.eventDate) return;
    try {
      const d = new Date(plan.eventDate);
      // Monday-based week start ISO
      const day = d.getDay(); // 0=Sun..6=Sat
      const diff = (day + 6) % 7;
      d.setDate(d.getDate() - diff);
      d.setHours(0, 0, 0, 0);
      localStorage.setItem(
        "shiftflow:focusWeekStartISO",
        d.toISOString().slice(0, 10),
      );
    } catch {
      // ignore
    }
    osBus.emit("ui:open_panel", {
      panelKey: "schedule",
      payload: { source: "maestro-bqt:labor-plan" },
      focus: true,
      source: "MaestroBQT",
    });
  }, [plan?.eventDate]);

  React.useEffect(() => {
    const unsubscribe = osBus.on("labor:plan_generated", (payload) => {
      setBusPlan({
        planId: payload.planId,
        beoId: payload.beoId,
        revision: payload.revision,
        eventDate: payload.eventDate,
        eventTimeRange: payload.eventTimeRange,
        generatedAt: payload.generatedAt,
        requirements: payload.requirements,
        deltas: payload.deltas,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const plan = React.useMemo(() => {
    if (externalPlan) return externalPlan;
    if (beoId && busPlan && busPlan.beoId !== beoId) return null;
    return busPlan;
  }, [externalPlan, busPlan, beoId]);

  if (!plan) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-slate-400" />
          <p className="text-sm text-slate-500">No labor plan generated yet.</p>
          <p className="text-xs text-slate-400 mt-2">
            Generate a BEO to create a labor plan.
          </p>
        </div>
      </div>
    );
  }

  const understaffed = plan.deltas.filter((d) => d.delta > 0).length;
  const overstaffed = plan.deltas.filter((d) => d.delta < 0).length;
  const balanced = plan.deltas.filter((d) => d.delta === 0).length;

  const getDeltaStatus = (delta: number) => {
    if (delta > 0)
      return {
        label: "Understaffed",
        color: "text-red-600",
        bg: "bg-red-50 dark:bg-red-950/20",
      };
    if (delta < 0)
      return {
        label: "Overstaffed",
        color: "text-blue-600",
        bg: "bg-blue-50 dark:bg-blue-950/20",
      };
    return {
      label: "Balanced",
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
    };
  };

  const getDeltaIcon = (delta: number) => {
    if (delta > 0) return <AlertTriangle className="h-4 w-4" />;
    if (delta < 0) return <TrendingUp className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/30 p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Labor Plan
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openScheduleForEventWeek}
              >
                Open Schedule
              </Button>
              <Badge variant="outline">Rev {plan.revision}</Badge>
            </div>
          </div>
          <p className="text-xs text-foreground/60">
            Staffing requirements derived from production workload
          </p>

          {/* Event & Time Info */}
          <div className="text-xs text-foreground/60 space-y-1 pt-3 border-t border-border/20">
            <div>
              <span className="font-semibold">Event:</span>{" "}
              {new Date(plan.eventDate).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            {/* <div className="text-[10px]">{plan.eventTimeRange}</div> */}
          </div>

          {/* Delta Summary */}
          <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border/20">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {understaffed}
              </div>
              <div className="text-xs text-foreground/60">Understaffed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {balanced}
              </div>
              <div className="text-xs text-foreground/60">Balanced</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {overstaffed}
              </div>
              <div className="text-xs text-foreground/60">Overstaffed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Card className="border-0 shadow-none bg-transparent rounded-none h-full">
          <CardContent className="p-4">
            {plan.deltas.length > 0 ? (
              <div className="space-y-3">
                {plan.deltas.map((delta) => {
                  const status = getDeltaStatus(delta.delta);
                  return (
                    <div
                      key={delta.station}
                      className={`rounded-lg border border-border/30 p-4 ${status.bg} transition-colors`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`${status.color} mt-0.5`}>
                            {getDeltaIcon(delta.delta)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {delta.station} Kitchen
                            </h3>
                            <p
                              className={`text-xs font-medium ${status.color}`}
                            >
                              {status.label}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            delta.delta > 0
                              ? "destructive"
                              : delta.delta < 0
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {delta.delta > 0 ? "+" : ""}
                          {delta.delta} staff
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="bg-white/50 dark:bg-black/20 rounded p-2">
                          <div className="text-foreground/60 text-xs uppercase tracking-wide font-semibold mb-1">
                            Required
                          </div>
                          <div className="text-lg font-bold text-foreground">
                            {delta.required}
                          </div>
                        </div>
                        <div className="bg-white/50 dark:bg-black/20 rounded p-2">
                          <div className="text-foreground/60 text-xs uppercase tracking-wide font-semibold mb-1">
                            Scheduled
                          </div>
                          <div className="text-lg font-bold text-foreground">
                            {delta.scheduled}
                          </div>
                        </div>
                        <div className={`rounded p-2 ${status.bg}`}>
                          <div className="text-foreground/60 text-xs uppercase tracking-wide font-semibold mb-1">
                            Delta
                          </div>
                          <div className={`text-lg font-bold ${status.color}`}>
                            {delta.delta > 0 ? "+" : ""}
                            {delta.delta}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-foreground/60">
                No labor requirements for this plan.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
