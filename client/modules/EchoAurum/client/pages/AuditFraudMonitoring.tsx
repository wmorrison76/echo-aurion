import React from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
export default function AuditFraudMonitoring() {
  const navigate = useNavigate();
  return (
    <PageLayout>
      {" "}
      <div className="space-y-6">
        {" "}
        <div>
          {" "}
          <h1 className="text-3xl font-bold text-foreground">
            Fraud Detection & Monitoring
          </h1>{" "}
          <p className="text-muted-foreground">
            Real-time fraud indicator monitoring and analysis
          </p>{" "}
        </div>{" "}
        <div className="grid gap-4 md:grid-cols-3">
          {" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium">
                High Risk
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <span className="text-2xl font-bold text-red-600">3</span>{" "}
              <p className="text-xs text-muted-foreground">
                Transactions flagged
              </p>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium">
                Medium Risk
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <span className="text-2xl font-bold text-yellow-600">8</span>{" "}
              <p className="text-xs text-muted-foreground">
                Requires review
              </p>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium">
                Cleared
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <span className="text-2xl font-bold text-green-600">
                156
              </span>{" "}
              <p className="text-xs text-muted-foreground">
                Normal transactions
              </p>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Active Fraud Alerts</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent className="space-y-3">
            {" "}
            {[
              {
                indicator: "Duplicate Payment",
                amount: "$15,000",
                status: "High Risk",
              },
              {
                indicator: "Related Party Transaction",
                amount: "$8,500",
                status: "Medium Risk",
              },
              {
                indicator: "Unusual AP Vendor",
                amount: "$5,200",
                status: "Medium Risk",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-3 border border-red-200 bg-red-50 rounded-lg"
              >
                {" "}
                <div>
                  {" "}
                  <p className="font-medium text-foreground">
                    {item.indicator}
                  </p>{" "}
                  <p className="text-sm text-muted-foreground">
                    {item.amount}
                  </p>{" "}
                </div>{" "}
                <span className="text-xs font-semibold px-2 py-1 rounded bg-red-100 text-red-800">
                  {" "}
                  {item.status}{" "}
                </span>{" "}
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
          <Button>Investigate Alert</Button>{" "}
        </div>{" "}
      </div>{" "}
    </PageLayout>
  );
}
