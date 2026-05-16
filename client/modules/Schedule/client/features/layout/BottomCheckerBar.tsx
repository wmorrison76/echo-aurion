import React from "react";
import { evaluateCompliance, getComplianceConfig } from "@/lib/compliance";
import type { EmployeeRow } from "@/lib/schedule";
export default function BottomCheckerBar({
  weekStartISO,
  employees,
}: {
  weekStartISO: string;
  employees: EmployeeRow[];
}) {
  const report = React.useMemo(
    () => evaluateCompliance(weekStartISO, employees, getComplianceConfig()),
    [weekStartISO, employees],
  );
  const alerts = report?.issues ?? [];
  const msg = alerts[0]?.message ?? "All good";
  const costPerMin = 0;
  const coverage = 0;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:left-[calc(var(--sidebar-width)+theme(spacing.4))]">
      {" "}
      <div className="container flex h-10 items-center justify-between px-2 text-sm">
        {" "}
        <div className="truncate mx-auto">
          {" "}
          {alerts.length > 0
            ? `⚠️ ${msg}`
            : "✅ No compliance issues detected"}{" "}
        </div>{" "}
        <div className="flex items-center gap-4 text-muted-foreground">
          {" "}
          <div>💵 Cost/Min: {costPerMin.toFixed(2)}</div>{" "}
          <div>✅ Coverage: {coverage}%</div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
