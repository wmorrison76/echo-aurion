import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
interface BalanceSheetReportProps {
  entityId: string;
  defaultPeriod?: string;
}
export function BalanceSheetReport({
  entityId,
  defaultPeriod,
}: BalanceSheetReportProps) {
  return (
    <Card>
      {" "}
      <CardHeader>
        {" "}
        <CardTitle>Balance Sheet</CardTitle>{" "}
      </CardHeader>{" "}
      <CardContent>
        {" "}
        <div className="rounded-lg border border-border/40 bg-surface-variant/30 p-6">
          {" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            Balance Sheet for entity {entityId} as of {defaultPeriod}{" "}
          </p>{" "}
          <div className="mt-6 space-y-8">
            {" "}
            <div>
              {" "}
              <h3 className="font-semibold text-foreground mb-3">
                ASSETS
              </h3>{" "}
              <div className="space-y-2 text-sm">
                {" "}
                <p className="text-muted-foreground">Current Assets</p>{" "}
                <p className="text-muted-foreground">Non-Current Assets</p>{" "}
              </div>{" "}
            </div>{" "}
            <div>
              {" "}
              <h3 className="font-semibold text-foreground mb-3">
                {" "}
                LIABILITIES & EQUITY{" "}
              </h3>{" "}
              <div className="space-y-2 text-sm">
                {" "}
                <p className="text-muted-foreground">
                  Current Liabilities
                </p>{" "}
                <p className="text-muted-foreground">Non-Current Liabilities</p>{" "}
                <p className="text-muted-foreground">
                  Shareholders' Equity
                </p>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
export default BalanceSheetReport;
