/**
 * Department breakdown view for forecast (by outlet/department).
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface DepartmentBreakdownProps {
  departments: Array<{
    id: string;
    name: string;
    guestCount: number;
    revenue?: number;
    mealPeriods?: Array<{ period: string; guestCount: number }>;
  }>;
  loading?: boolean;
}

export function DepartmentBreakdown({
  departments,
  loading,
}: DepartmentBreakdownProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <span className="text-muted-foreground">Loading departments…</span>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Department breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {departments.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded border p-2"
            >
              <span className="font-medium">{d.name}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{d.guestCount} guests</Badge>
                {d.revenue != null && (
                  <Badge variant="outline">${d.revenue.toLocaleString()}</Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
