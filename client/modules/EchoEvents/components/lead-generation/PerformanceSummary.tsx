import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
type ClassificationSlice = {
  id: string;
  label: string;
  value: number;
  percent: number;
  barClassName: string;
};
type LeadPerformanceMetric = {
  id: string;
  label: string;
  value: string;
  caption: string;
  changeLabel: string;
  tone: "positive" | "negative" | "neutral";
};
type PerformanceSummaryProps = {
  title: string;
  description?: string;
  classifications: ClassificationSlice[];
  leadPerformance: LeadPerformanceMetric[];
};
const toneMap: Record<LeadPerformanceMetric["tone"], string> = {
  positive: "text-emerald-500",
  negative: "text-red-500",
  neutral: "text-muted-foreground",
};
export function PerformanceSummary({
  title,
  description,
  classifications,
  leadPerformance,
}: PerformanceSummaryProps) {
  return (
    <Card className="glass-panel">
      {" "}
      <CardHeader className="pb-2">
        {" "}
        <CardTitle className="text-base font-semibold sm:text-lg">
          {title}
        </CardTitle>{" "}
        {description ? (
          <CardDescription className="text-xs sm:text-sm">
            {description}
          </CardDescription>
        ) : null}{" "}
      </CardHeader>{" "}
      <CardContent>
        {" "}
        <div className="grid gap-6 lg:grid-cols-2">
          {" "}
          <section className="space-y-4">
            {" "}
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {" "}
              Client Classification Mix{" "}
            </h3>{" "}
            <div className="space-y-4">
              {" "}
              {classifications.map((slice) => (
                <div key={slice.id} className="space-y-2">
                  {" "}
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    {" "}
                    <span className="font-medium text-foreground/80">
                      {slice.label}
                    </span>{" "}
                    <span className="font-semibold text-foreground">
                      {" "}
                      {slice.value}{" "}
                      <span className="ml-1 text-muted-foreground font-normal">
                        ({slice.percent}%)
                      </span>{" "}
                    </span>{" "}
                  </div>{" "}
                  <Progress
                    value={slice.percent}
                    className={cn("h-2", slice.barClassName)}
                  />{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </section>{" "}
          <section className="space-y-5">
            {" "}
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {" "}
              Lead Generation Pulse{" "}
            </h3>{" "}
            <div className="grid gap-4 sm:grid-cols-2">
              {" "}
              {leadPerformance.map((metric) => (
                <div
                  key={metric.id}
                  className="rounded-lg border border-border/60 bg-card/80 p-4 shadow-sm"
                >
                  {" "}
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {" "}
                    {metric.label}{" "}
                  </p>{" "}
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {metric.value}
                  </p>{" "}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {metric.caption}
                  </p>{" "}
                  <p
                    className={cn(
                      "mt-3 text-xs font-semibold",
                      toneMap[metric.tone],
                    )}
                  >
                    {metric.changeLabel}
                  </p>{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </section>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
export type { ClassificationSlice, LeadPerformanceMetric };
