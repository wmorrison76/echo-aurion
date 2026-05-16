/**
 * Staffing recommendations from locked forecast.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface StaffingRecommendationsProps {
  recommendations: Array<{
    date: string;
    outletId?: string;
    mealPeriod: string;
    recommendedStaff: number;
    guestCount: number;
    reason: string;
  }>;
  loading?: boolean;
}

export function StaffingRecommendations({
  recommendations,
  loading,
}: StaffingRecommendationsProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading staffing…
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Staffing recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <p className="text-muted-foreground text-sm">No recommendations.</p>
        ) : (
          <ul className="space-y-2">
            {recommendations.map((r, i) => (
              <li key={i} className="rounded border p-2 text-sm">
                <span>
                  {r.date} · {r.mealPeriod}
                </span>
                <span className="mx-2">·</span>
                <span className="font-medium">{r.recommendedStaff} staff</span>
                <span className="mx-2">({r.guestCount} guests)</span>
                <span className="text-muted-foreground">· {r.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
