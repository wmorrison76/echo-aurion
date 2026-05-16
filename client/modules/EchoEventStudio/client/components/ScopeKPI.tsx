import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export interface ScopeKPIData {
  throughput: number;
  avgPathM: number;
  seatsPerM2: number;
}
export interface ScopeKPIProps {
  data?: ScopeKPIData;
}
export function ScopeKPI({
  data = { throughput: 0, avgPathM: 0, seatsPerM2: 0 },
}: ScopeKPIProps) {
  return (
    <Card className="backdrop-blur supports-[backdrop-filter]:bg-background/70">
      {" "}
      <CardHeader className="py-3">
        {" "}
        <CardTitle className="text-sm">EchoScope KPIs</CardTitle>{" "}
      </CardHeader>{" "}
      <CardContent className="text-xs space-y-1">
        {" "}
        <div className="flex justify-between">
          {" "}
          <span>Throughput/hr:</span>{" "}
          <span className="font-semibold">{data.throughput}</span>{" "}
        </div>{" "}
        <div className="flex justify-between">
          {" "}
          <span>Avg Path (m):</span>{" "}
          <span className="font-semibold">{data.avgPathM}</span>{" "}
        </div>{" "}
        <div className="flex justify-between">
          {" "}
          <span>Seats/m²:</span>{" "}
          <span className="font-semibold">
            {data.seatsPerM2.toFixed(2)}
          </span>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
