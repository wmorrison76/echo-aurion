import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  HACCP_TASK_EVENT_NAME,
  HACCP_TRAINING_EVENT_NAME,
} from "@/lib/store";
import type { HACCPChecklistTask, HACCPTrainingModule } from "@shared/haccp";
interface HaccpProgramSummaryProps {
  tasks: HACCPChecklistTask[];
  training: HACCPTrainingModule[];
}
export function HaccpProgramSummary({
  tasks,
  training,
}: HaccpProgramSummaryProps) {
  const [refreshToken, setRefreshToken] = useState(0);
  useEffect(() => {
    const handler = () => setRefreshToken((value) => value + 1);
    window.addEventListener(HACCP_TASK_EVENT_NAME, handler);
    window.addEventListener(HACCP_TRAINING_EVENT_NAME, handler);
    return () => {
      window.removeEventListener(HACCP_TASK_EVENT_NAME, handler);
      window.removeEventListener(HACCP_TRAINING_EVENT_NAME, handler);
    };
  }, []);
  const metrics = useMemo(() => {
    const dailyTasks = tasks.filter((task) => task.frequency === "daily");
    const weeklyTasks = tasks.filter((task) => task.frequency === "weekly");
    const deliveryTasks = tasks.filter(
      (task) => task.frequency === "per_delivery",
    );
    const dailyComplete = dailyTasks.filter((task) =>
      Store.getHaccpTaskStatus(task.id, task.frequency),
    );
    const weeklyComplete = weeklyTasks.filter((task) =>
      Store.getHaccpTaskStatus(task.id, task.frequency),
    );
    const deliveryChecks = deliveryTasks.reduce((count, task) => {
      const status = Store.getHaccpTaskStatus(task.id, task.frequency);
      return count + (status?.count ?? 0);
    }, 0);
    const trainingStatuses = training.map((module) => ({
      module,
      status: Store.getHaccpTrainingStatus(module.id),
    }));
    const trainingCompleted = trainingStatuses.filter(
      ({ status }) => !!status?.completedAt,
    );
    return {
      dailyTotal: dailyTasks.length,
      dailyComplete: dailyComplete.length,
      weeklyTotal: weeklyTasks.length,
      weeklyComplete: weeklyComplete.length,
      deliveryTotal: deliveryTasks.length,
      deliveryChecks,
      trainingTotal: training.length,
      trainingCompleted: trainingCompleted.length,
    };
  }, [tasks, training, refreshToken]);
  const safePercent = (completed: number, total: number) => {
    if (!total) return 0;
    return Math.round((completed / total) * 100);
  };
  return (
    <Card className="border-2">
      {" "}
      <CardHeader>
        {" "}
        <CardTitle>Receiving HACCP Program</CardTitle>{" "}
        <CardDescription>
          Live compliance pulse for daily dock controls, audits, and
          training.{" "}
        </CardDescription>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-4">
        {" "}
        <div>
          {" "}
          <div className="flex items-center justify-between text-sm font-medium">
            {" "}
            <span>Daily controls</span>{" "}
            <span>
              {metrics.dailyComplete}/{metrics.dailyTotal}
            </span>{" "}
          </div>{" "}
          <Progress
            value={safePercent(metrics.dailyComplete, metrics.dailyTotal)}
            className="mt-1"
          />{" "}
        </div>{" "}
        <div>
          {" "}
          <div className="flex items-center justify-between text-sm font-medium">
            {" "}
            <span>Weekly verification</span>{" "}
            <span>
              {metrics.weeklyComplete}/{metrics.weeklyTotal}
            </span>{" "}
          </div>{" "}
          <Progress
            value={safePercent(metrics.weeklyComplete, metrics.weeklyTotal)}
            className="mt-1"
          />{" "}
        </div>{" "}
        <div className="grid gap-2 sm:grid-cols-3">
          {" "}
          <MetricTile
            label="Deliveries checked"
            value={metrics.deliveryChecks}
            description={
              metrics.deliveryTotal
                ? `${metrics.deliveryTotal} tasks tracked per truck`
                : "Per-delivery checks"
            }
          />{" "}
          <MetricTile
            label="Training complete"
            value={`${metrics.trainingCompleted}/${metrics.trainingTotal}`}
            description="Modules signed off in the last cycle"
          />{" "}
          <MetricTile
            label="Open items"
            value={
              Math.max(metrics.dailyTotal - metrics.dailyComplete, 0) +
              Math.max(metrics.weeklyTotal - metrics.weeklyComplete, 0)
            }
            description="Outstanding checklist tasks"
          />{" "}
        </div>{" "}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {" "}
          <Badge variant="secondary">Daily CCPs tracked</Badge>{" "}
          <Badge variant="outline">Audit ready</Badge>{" "}
          <Badge variant="outline">Training escalations enabled</Badge>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
function MetricTile({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      {" "}
      <div className="text-xs text-muted-foreground">{label}</div>{" "}
      <div className="text-xl font-semibold">{value}</div>{" "}
      <div className="text-xs text-muted-foreground">{description}</div>{" "}
    </div>
  );
}
