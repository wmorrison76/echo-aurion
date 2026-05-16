import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
export interface ScanHealthHUDProps {
  coverage?: number;
  holes?: number;
  phase?: string;
}
export function ScanHealthHUD({
  coverage = 0.62,
  holes = 0.18,
  phase = "idle",
}: ScanHealthHUDProps) {
  const score = Math.max(0, Math.min(1, coverage * (1 - holes)));
  const scorePercent = Math.round(score * 100);
  return (
    <Card className="backdrop-blur supports-[backdrop-filter]:bg-background/70">
      {" "}
      <CardHeader className="py-3">
        {" "}
        <CardTitle className="text-sm">Scan Health</CardTitle>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-2">
        {" "}
        <div className="flex justify-between items-center">
          {" "}
          <div className="text-xs">
            {" "}
            Fusion: <span className="font-semibold">{phase}</span>{" "}
          </div>{" "}
          <div className="text-xs font-semibold">{scorePercent}%</div>{" "}
        </div>{" "}
        <Progress value={scorePercent} />{" "}
        <div className="text-xs text-muted-foreground">
          {" "}
          Coverage {(coverage * 100).toFixed(0)}% · Holes{""}{" "}
          {(holes * 100).toFixed(0)}%{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
