import React from "react";
import { EmployeeRow, dayTotals, DAYS } from "../../lib/schedule";
import TinySparkline from "../../components/charts/TinySparkline";

export interface ForecastSparklineProps {
  employees: EmployeeRow[];
}

export default function ForecastSparkline({
  employees,
}: ForecastSparklineProps) {
  const totals = dayTotals(employees);
  const data = DAYS.map((d) => totals[d] ?? 0);
  return (
    <div className="flex items-center gap-1" title="Hours per day">
      <TinySparkline
        data={data}
        width={80}
        height={28}
        className="text-muted-foreground"
      />
    </div>
  );
}
