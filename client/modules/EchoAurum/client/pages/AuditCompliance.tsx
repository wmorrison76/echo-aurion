import React from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
export default function AuditCompliance() {
  const navigate = useNavigate();
  return (
    <PageLayout>
      {" "}
      <div className="space-y-6">
        {" "}
        <div>
          {" "}
          <h1 className="text-3xl font-bold text-foreground">
            Compliance Status
          </h1>{" "}
          <p className="text-muted-foreground">
            Monitor SOX controls and compliance violations
          </p>{" "}
        </div>{" "}
        <div className="grid gap-4 md:grid-cols-3">
          {" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium">
                Compliant
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="flex items-center justify-between">
                {" "}
                <span className="text-2xl font-bold">14</span>{" "}
                <CheckCircle2 className="h-8 w-8 text-green-500" />{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium">
                At Risk
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="flex items-center justify-between">
                {" "}
                <span className="text-2xl font-bold">2</span>{" "}
                <AlertTriangle className="h-8 w-8 text-yellow-500" />{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium">
                Non-Compliant
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="flex items-center justify-between">
                {" "}
                <span className="text-2xl font-bold">0</span>{" "}
                <CheckCircle2 className="h-8 w-8 text-gray-300" />{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>SOX 404 Controls Assessment</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent className="space-y-3">
            {" "}
            {[
              {
                control: "User Access Management",
                status: "Compliant",
                score: 95,
              },
              { control: "Password Policy", status: "Compliant", score: 100 },
              {
                control: "Segregation of Duties",
                status: "At Risk",
                score: 75,
              },
              { control: "Change Management", status: "Compliant", score: 88 },
              {
                control: "Financial Reporting",
                status: "Compliant",
                score: 92,
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-3 border rounded-lg"
              >
                {" "}
                <span className="font-medium">{item.control}</span>{" "}
                <div className="flex gap-4 items-center">
                  {" "}
                  <span className="text-sm font-bold">{item.score}%</span>{" "}
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded ${item.status === "Compliant" ? "bg-green-100 text-green-800" : item.status === "At Risk" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                  >
                    {" "}
                    {item.status}{" "}
                  </span>{" "}
                </div>{" "}
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
          <Button>View Remediation Plans</Button>{" "}
        </div>{" "}
      </div>{" "}
    </PageLayout>
  );
}
