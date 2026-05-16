/**
 * 5-day sales matrix per outlet.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface OutletSalesMatrixProps {
  outletId: string;
  outletName?: string;
  days: Array<{
    date: string;
    mealPeriods: Array<{
      mealPeriod: string;
      guestCount: number;
      revenue?: number;
    }>;
    totalGuestCount: number;
    totalRevenue?: number;
  }>;
  generatedAt?: string;
  loading?: boolean;
}

export function OutletSalesMatrix({
  outletId,
  outletName,
  days,
  generatedAt,
  loading,
}: OutletSalesMatrixProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading sales matrix…
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{outletName ?? outletId}</CardTitle>
        {generatedAt && (
          <p className="text-xs text-muted-foreground">
            Generated {new Date(generatedAt).toLocaleString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Meal period</TableHead>
              <TableHead className="text-right">Guests</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.flatMap((d) =>
              d.mealPeriods.length > 0
                ? d.mealPeriods.map((mp, i) => (
                    <TableRow key={d.date + mp.mealPeriod}>
                      {i === 0 ? (
                        <TableCell rowSpan={d.mealPeriods.length}>
                          {d.date}
                        </TableCell>
                      ) : null}
                      <TableCell>{mp.mealPeriod}</TableCell>
                      <TableCell className="text-right">
                        {mp.guestCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {mp.revenue != null
                          ? `$${mp.revenue.toLocaleString()}`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                : [
                    <TableRow key={d.date}>
                      <TableCell>{d.date}</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell className="text-right">
                        {d.totalGuestCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {d.totalRevenue != null
                          ? `$${d.totalRevenue.toLocaleString()}`
                          : "—"}
                      </TableCell>
                    </TableRow>,
                  ],
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
