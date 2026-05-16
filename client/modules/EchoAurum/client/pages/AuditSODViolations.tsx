import React from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export default function AuditSODViolations() {
  const navigate = useNavigate();
  return (
    <PageLayout>
      {" "}
      <div className="space-y-6">
        {" "}
        <div>
          {" "}
          <h1 className="text-3xl font-bold text-foreground">
            Segregation of Duties Violations
          </h1>{" "}
          <p className="text-muted-foreground">
            Monitor and manage SOD exception requests
          </p>{" "}
        </div>{" "}
        <div className="grid gap-4 md:grid-cols-3">
          {" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium">
                Active Violations
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <span className="text-2xl font-bold">2</span>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium">
                Pending Exceptions
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <span className="text-2xl font-bold">1</span>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium">
                Remediated
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <span className="text-2xl font-bold">5</span>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Current SOD Violations</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent className="space-y-3">
            {" "}
            {[
              {
                user: "John Smith",
                violation: "GL Entry Prepare & Approve",
                since: "5 days",
                exception: "Approved",
              },
              {
                user: "Sarah Johnson",
                violation: "AP Create & Disburse",
                since: "2 days",
                exception: "Pending",
              },
            ].map((item, i) => (
              <div key={i} className="p-3 border rounded-lg space-y-2">
                {" "}
                <div className="flex justify-between">
                  {" "}
                  <p className="font-medium">{item.user}</p>{" "}
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-800">
                    {" "}
                    {item.exception}{" "}
                  </span>{" "}
                </div>{" "}
                <p className="text-sm text-muted-foreground">
                  {item.violation}
                </p>{" "}
                <p className="text-xs text-muted-foreground">
                  Active for {item.since}
                </p>{" "}
              </div>
            ))}{" "}
          </CardContent>{" "}
        </Card>{" "}
        <div className="flex gap-3">
          {" "}
          <Button variant="outline" onClick={() => navigate("/audit")}>
            {" "}
            Back to Dashboard{" "}
          </Button>{" "}
          <Button>Request Exception</Button>{" "}
        </div>{" "}
      </div>{" "}
    </PageLayout>
  );
}
