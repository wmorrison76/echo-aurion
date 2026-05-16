/**
 * Forecast vs actual comparison.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ForecastComparisonProps {
  variances: Array<{
    date: string;
    mealPeriod: string;
    forecastGuestCount: number;
    actualGuestCount: number;
    varianceGuest: number;
  }>;
  metrics?: { mape: number; rmse: number; bias: number; sampleCount: number };
  loading?: boolean;
}

export function ForecastComparison({
  variances,
  metrics,
  loading,
}: ForecastComparisonProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading comparison…
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Forecast vs actual</CardTitle>
        {metrics && (
          <p className="text-sm text-muted-foreground">
            MAPE: {metrics.mape.toFixed(1)}% · RMSE: {metrics.rmse.toFixed(0)} ·
            Bias: {metrics.bias.toFixed(1)}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {variances.map((v, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded border p-2 text-sm"
            >
              <span>
                {v.date} · {v.mealPeriod}
              </span>
              <div className="flex gap-2">
                <span>F: {v.forecastGuestCount}</span>
                <span>A: {v.actualGuestCount}</span>
                <Badge
                  variant={v.varianceGuest >= 0 ? "default" : "destructive"}
                >
                  {v.varianceGuest >= 0 ? "+" : ""}
                  {v.varianceGuest}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
