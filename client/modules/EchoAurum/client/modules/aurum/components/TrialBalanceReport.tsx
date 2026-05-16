import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
interface TrialBalanceReportProps {
  entityId: string;
  defaultPeriod?: string;
}
export function TrialBalanceReport({
  entityId,
  defaultPeriod,
}: TrialBalanceReportProps) {
  return (
    <Card>
      {" "}
      <CardHeader>
        {" "}
        <CardTitle>Trial Balance</CardTitle>{" "}
      </CardHeader>{" "}
      <CardContent>
        {" "}
        <div className="rounded-lg border border-border/40 bg-surface-variant/30 p-6">
          {" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            Trial Balance report for entity {entityId} as of{" "}
            {defaultPeriod}{" "}
          </p>{" "}
          <div className="mt-6 space-y-4">
            {" "}
            <div className="grid grid-cols-4 gap-4 text-sm font-semibold border-b pb-3">
              {" "}
              <div>Account Code</div> <div>Account Name</div>{" "}
              <div className="text-right">Debit</div>{" "}
              <div className="text-right">Credit</div>{" "}
            </div>{" "}
            <div className="text-sm text-muted-foreground">
              {" "}
              Loading trial balance data...{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
export default TrialBalanceReport;
