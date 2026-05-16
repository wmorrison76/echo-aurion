import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { IconType } from "react-icons";
type TrendTone = "positive" | "negative" | "neutral" | "warning";
type MetricHighlight = {
  id: string;
  label: string;
  value: string;
  sublabel: string;
  icon: IconType;
  valueClassName: string;
  iconClassName: string;
  trend?: { label: string; tone: TrendTone };
};
type MetricHighlightsProps = {
  title: string;
  description?: string;
  metrics: MetricHighlight[];
};
const toneClassMap: Record<TrendTone, string> = {
  positive: "text-emerald-500",
  negative: "text-red-500",
  neutral: "text-muted-foreground",
  warning: "text-amber-500",
};
export function MetricHighlights({
  title,
  description,
  metrics,
}: MetricHighlightsProps) {
  return (
    <Card className="glass-panel">
      {" "}
      <CardHeader className="pb-2">
        {" "}
        <div className="flex items-center justify-between gap-2">
          {" "}
          <div>
            {" "}
            <CardTitle className="text-base font-semibold sm:text-lg">
              {title}
            </CardTitle>{" "}
            {description ? (
              <CardDescription className="text-xs sm:text-sm">
                {description}
              </CardDescription>
            ) : null}{" "}
          </div>{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent>
        {" "}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {" "}
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.id}
                className="group relative rounded-lg border border-border/60 bg-card/80 p-4 shadow-sm transition hover:border-primary/60 hover:shadow-md"
              >
                {" "}
                <div className="flex items-start justify-between gap-3">
                  {" "}
                  <div>
                    {" "}
                    <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                      {" "}
                      {metric.label}{" "}
                    </p>{" "}
                    <p
                      className={cn(
                        "mt-1 text-xl font-semibold sm:text-2xl",
                        metric.valueClassName,
                      )}
                    >
                      {" "}
                      {metric.value}{" "}
                    </p>{" "}
                    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                      {metric.sublabel}
                    </p>{" "}
                  </div>{" "}
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-transparent/20 bg-primary/10 text-primary",
                      metric.iconClassName,
                    )}
                  >
                    {" "}
                    <Icon className="h-4 w-4" />{" "}
                  </span>{" "}
                </div>{" "}
                {metric.trend ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "mt-3 inline-flex border-none bg-transparent px-0 text-[0.7rem] font-medium",
                      toneClassMap[metric.trend.tone],
                    )}
                  >
                    {" "}
                    {metric.trend.label}{" "}
                  </Badge>
                ) : null}{" "}
              </div>
            );
          })}{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
export type { MetricHighlight };
