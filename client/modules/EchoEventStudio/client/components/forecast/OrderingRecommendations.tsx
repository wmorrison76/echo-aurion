/**
 * Ordering recommendations from locked forecast.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface OrderingRecommendationsProps {
  recommendations: Array<{
    productId: string;
    productName?: string;
    suggestedQuantity: number;
    unit: string;
    reason: string;
    date: string;
  }>;
  loading?: boolean;
}

export function OrderingRecommendations({
  recommendations,
  loading,
}: OrderingRecommendationsProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading recommendations…
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ordering recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <p className="text-muted-foreground text-sm">No recommendations.</p>
        ) : (
          <ul className="space-y-2">
            {recommendations.map((r) => (
              <li
                key={r.productId + r.date}
                className="rounded border p-2 text-sm"
              >
                <span className="font-medium">
                  {r.productName ?? r.productId}
                </span>
                <span className="mx-2">·</span>
                <span>
                  {r.suggestedQuantity} {r.unit}
                </span>
                <span className="mx-2">·</span>
                <span className="text-muted-foreground">{r.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
