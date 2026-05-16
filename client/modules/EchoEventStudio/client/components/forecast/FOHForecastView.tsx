/**
 * FOH manager view: staffing, guest count, table management.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffingRecommendations } from "./StaffingRecommendations";

export interface FOHForecastViewProps {
  outletId: string;
  dateRange: { start: string; end: string };
  staffingRecommendations: React.ComponentProps<
    typeof StaffingRecommendations
  >["recommendations"];
  loading?: boolean;
}

export function FOHForecastView({
  outletId,
  dateRange,
  staffingRecommendations,
  loading,
}: FOHForecastViewProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>FOH forecast</CardTitle>
          <p className="text-sm text-muted-foreground">
            Outlet {outletId} · {dateRange.start} to {dateRange.end}
          </p>
        </CardHeader>
        <CardContent>
          <StaffingRecommendations
            recommendations={staffingRecommendations}
            loading={loading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
