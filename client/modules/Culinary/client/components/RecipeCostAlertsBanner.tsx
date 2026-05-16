import React, { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  acknowledgeRecipeCostAlert,
  getCostThresholds,
  getRecipeCostAlerts,
  saveRecipeCostAlerts,
} from "../lib/recipe-cost-sync";

export default function RecipeCostAlertsBanner() {
  const [alerts, setAlerts] = useState(() => getRecipeCostAlerts());
  const [thresholds, setThresholds] = useState(() => getCostThresholds());

  useEffect(() => {
    const interval = setInterval(() => setAlerts(getRecipeCostAlerts()), 5000);
    return () => clearInterval(interval);
  }, []);

  const activeAlerts = alerts.filter((alert) => !alert.acknowledged);

  if (!activeAlerts.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      <Alert className="border-amber-400/40 bg-amber-500/10">
        <AlertDescription className="text-sm text-amber-200">
          Recipe cost changes detected. Review and acknowledge to clear alerts.
        </AlertDescription>
      </Alert>
      <div className="rounded-lg border border-border bg-surface p-3 space-y-3">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Alert threshold (%)</span>
            <Input
              type="number"
              value={thresholds.warnPct}
              onChange={(event) => {
                const next = {
                  ...thresholds,
                  warnPct: Number(event.target.value),
                };
                setThresholds(next);
                localStorage.setItem(
                  "recipe.cost.thresholds",
                  JSON.stringify(next),
                );
              }}
              className="h-7 w-20 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Critical (%)</span>
            <Input
              type="number"
              value={thresholds.criticalPct}
              onChange={(event) => {
                const next = {
                  ...thresholds,
                  criticalPct: Number(event.target.value),
                };
                setThresholds(next);
                localStorage.setItem(
                  "recipe.cost.thresholds",
                  JSON.stringify(next),
                );
              }}
              className="h-7 w-20 text-xs"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const updated = alerts.map((alert) => ({
                ...alert,
                acknowledged: true,
              }));
              saveRecipeCostAlerts(updated);
              setAlerts(updated);
            }}
          >
            Acknowledge all
          </Button>
        </div>
        <div className="space-y-2">
          {activeAlerts.slice(0, 5).map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between gap-4 rounded-md border border-border bg-background px-3 py-2 text-xs"
            >
              <div>
                <div className="font-semibold text-foreground">
                  {alert.recipeName}
                </div>
                <div className="text-muted-foreground">
                  {alert.previousCost.toFixed(2)} → {alert.newCost.toFixed(2)} (
                  {alert.changePct.toFixed(1)}%)
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    alert.severity === "critical"
                      ? "bg-red-500/20 text-red-300"
                      : "bg-amber-500/20 text-amber-300"
                  }
                >
                  {alert.severity === "critical" ? "Critical" : "Warning"}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    acknowledgeRecipeCostAlert(alert.id);
                    setAlerts(getRecipeCostAlerts());
                  }}
                >
                  Acknowledge
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
