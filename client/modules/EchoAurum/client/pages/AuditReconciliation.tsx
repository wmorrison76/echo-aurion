import React from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";
export default function AuditReconciliation() {
  const navigate = useNavigate();
  return (
    <PageLayout>
      {" "}
      <div className="space-y-6">
        {" "}
        <div>
          {" "}
          <h1 className="text-3xl font-bold text-foreground">
            GL Reconciliation
          </h1>{" "}
          <p className="text-muted-foreground">
            Monitor and manage general ledger account reconciliations
          </p>{" "}
        </div>{" "}
        <div className="grid gap-4 md:grid-cols-3">
          {" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium">
                Complete
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="flex items-center justify-between">
                {" "}
                <span className="text-2xl font-bold">85</span>{" "}
                <CheckCircle2 className="h-8 w-8 text-green-500" />{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium">
                In Progress
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="flex items-center justify-between">
                {" "}
                <span className="text-2xl font-bold">12</span>{" "}
                <AlertCircle className="h-8 w-8 text-yellow-500" />{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium">
                Total Accounts
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="flex items-center justify-between">
                {" "}
                <span className="text-2xl font-bold">112</span>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Account Reconciliation Status</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="space-y-3">
              {" "}
              {[
                { account: "1000 - Cash", status: "Complete", variance: "$0" },
                { account: "1100 - AR", status: "Complete", variance: "$0" },
                {
                  account: "1200 - Inventory",
                  status: "In Progress",
                  variance: "$2,400",
                },
                { account: "2000 - AP", status: "Complete", variance: "$0" },
                {
                  account: "3000 - Revenue",
                  status: "Complete",
                  variance: "$0",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  {" "}
                  <span className="font-medium">{item.account}</span>{" "}
                  <div className="flex gap-4">
                    {" "}
                    <span className="text-sm text-muted-foreground">
                      {item.variance}
                    </span>{" "}
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${item.status === "Complete" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                    >
                      {" "}
                      {item.status}{" "}
                    </span>{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <div className="flex gap-3">
          {" "}
          <Button variant="outline" onClick={() => navigate("/audit")}>
            {" "}
            Back to Dashboard{" "}
          </Button>{" "}
          <Button
            onClick={() => alert("Reconciliation detail view would open here")}
          >
            {" "}
            View Unreconciled Items{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
    </PageLayout>
  );
}
