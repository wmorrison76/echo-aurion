/**
 * Outlet-specific forecast panel (5-day).
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface OutletForecastPanelProps {
  outletId: string;
  outletName?: string;
  days: Array<{
    date: string;
    guestCount: number;
    mealPeriods?: Array<{ period: string; guestCount: number }>;
  }>;
  loading?: boolean;
}

export function OutletForecastPanel({
  outletId,
  outletName,
  days,
  loading,
}: OutletForecastPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading…
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{outletName ?? outletId}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {days.map((d) => (
            <div
              key={d.date}
              className="flex justify-between rounded border px-3 py-2"
            >
              <span>{d.date}</span>
              <span className="font-medium">{d.guestCount} guests</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
