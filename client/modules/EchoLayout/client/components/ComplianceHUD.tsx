import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AdaFindings } from "../lib/adaRules";
export interface ComplianceHUDProps {
  findings: AdaFindings;
}
export function ComplianceHUD({ findings }: ComplianceHUDProps) {
  const counts = useMemo(
    () => ({
      err: findings.issues.filter((i) => i.severity === "error").length,
      warn: findings.issues.filter((i) => i.severity === "warn").length,
      info: findings.issues.filter((i) => i.severity === "info").length,
    }),
    [findings],
  );
  return (
    <Card className="backdrop-blur supports-[backdrop-filter]:bg-background/70">
      {" "}
      <CardHeader className="py-3">
        {" "}
        <CardTitle className="text-sm">Compliance & ADA</CardTitle>{" "}
      </CardHeader>{" "}
      <CardContent className="flex gap-2">
        {" "}
        <Badge variant={counts.err ? "destructive" : "secondary"}>
          {" "}
          {counts.err} error{counts.err !== 1 ? "s" : ""}{" "}
        </Badge>{" "}
        <Badge variant={counts.warn ? "default" : "secondary"}>
          {" "}
          {counts.warn} warning{counts.warn !== 1 ? "s" : ""}{" "}
        </Badge>{" "}
        <Badge variant="secondary">
          {" "}
          {counts.info} note{counts.info !== 1 ? "s" : ""}{" "}
        </Badge>{" "}
      </CardContent>{" "}
    </Card>
  );
}
