import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
interface CashFlowReportProps {
  entityId: string;
  defaultPeriod?: string;
}
export function CashFlowReport({
  entityId,
  defaultPeriod,
}: CashFlowReportProps) {
  return (
    <Card>
      {" "}
      <CardHeader>
        {" "}
        <CardTitle>Cash Flow Statement</CardTitle>{" "}
      </CardHeader>{" "}
      <CardContent>
        {" "}
        <div className="rounded-lg border border-border/40 bg-surface-variant/30 p-6">
          {" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            Cash Flow Statement for entity {entityId} as of {defaultPeriod}{" "}
          </p>{" "}
          <div className="mt-6 space-y-8">
            {" "}
            <div>
              {" "}
              <h3 className="font-semibold text-foreground mb-3">
                {" "}
                OPERATING ACTIVITIES{" "}
              </h3>{" "}
              <div className="space-y-2 text-sm text-muted-foreground">
                {" "}
                <p>Net Income</p> <p>Depreciation & Amortization</p>{" "}
                <p>Changes in Working Capital</p>{" "}
              </div>{" "}
            </div>{" "}
            <div>
              {" "}
              <h3 className="font-semibold text-foreground mb-3">
                {" "}
                INVESTING ACTIVITIES{" "}
              </h3>{" "}
              <div className="space-y-2 text-sm text-muted-foreground">
                {" "}
                <p>Capital Expenditures</p> <p>Asset Sales</p>{" "}
              </div>{" "}
            </div>{" "}
            <div>
              {" "}
              <h3 className="font-semibold text-foreground mb-3">
                {" "}
                FINANCING ACTIVITIES{" "}
              </h3>{" "}
              <div className="space-y-2 text-sm text-muted-foreground">
                {" "}
                <p>Debt Repayment</p> <p>Equity Issuance</p>{" "}
                <p>Dividend Payments</p>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
export default CashFlowReport;
