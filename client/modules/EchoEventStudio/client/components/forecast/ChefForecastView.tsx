/**
 * Chef view: ordering, product needs, prep requirements.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  OrderingRecommendations,
  type OrderingRecommendationsProps,
} from "./OrderingRecommendations";

export interface ChefForecastViewProps {
  outletId: string;
  dateRange: { start: string; end: string };
  orderingRecommendations: OrderingRecommendationsProps["recommendations"];
  loading?: boolean;
}

export function ChefForecastView({
  outletId,
  dateRange,
  orderingRecommendations,
  loading,
}: ChefForecastViewProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Chef forecast</CardTitle>
          <p className="text-sm text-muted-foreground">
            Outlet {outletId} · {dateRange.start} to {dateRange.end}
          </p>
        </CardHeader>
        <CardContent>
          <OrderingRecommendations
            recommendations={orderingRecommendations}
            loading={loading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
