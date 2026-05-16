import React from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock } from "lucide-react";
export default function AuditControlTesting() {
  const navigate = useNavigate();
  return (
    <PageLayout>
      {" "}
      <div className="space-y-6">
        {" "}
        <div>
          {" "}
          <h1 className="text-3xl font-bold text-foreground">
            Control Testing
          </h1>{" "}
          <p className="text-muted-foreground">
            Track and manage control procedure testing
          </p>{" "}
        </div>{" "}
        <div className="grid gap-4 md:grid-cols-2">
          {" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium">
                Completed
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <span className="text-3xl font-bold">15</span>{" "}
              <p className="text-xs text-muted-foreground">
                of 24 controls
              </p>{" "}
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
              <span className="text-3xl font-bold">9</span>{" "}
              <p className="text-xs text-muted-foreground">
                controls being tested
              </p>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Control Testing Schedule</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent className="space-y-3">
            {" "}
            {[
              { control: "GL Entry Approval", progress: 100, status: "Passed" },
              {
                control: "Segregation of Duties",
                progress: 85,
                status: "In Progress",
              },
              { control: "AR Collection", progress: 70, status: "In Progress" },
              {
                control: "Inventory Cutoff",
                progress: 0,
                status: "Not Started",
              },
              {
                control: "Fixed Asset Authorization",
                progress: 90,
                status: "Passed",
              },
            ].map((item, i) => (
              <div key={i}>
                {" "}
                <div className="flex justify-between text-sm mb-2">
                  {" "}
                  <span className="font-medium">{item.control}</span>{" "}
                  <span className="text-xs font-semibold text-muted-foreground">
                    {item.progress}%
                  </span>{" "}
                </div>{" "}
                <div className="w-full bg-surface rounded-full h-2">
                  {" "}
                  <div
                    className={`h-2 rounded-full ${item.status === "Passed" ? "bg-green-500" : item.status === "In Progress" ? "bg-primary" : "bg-gray-300"}`}
                    style={{ width: `${item.progress}%` }}
                  />{" "}
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
          <Button>Start Next Control Test</Button>{" "}
        </div>{" "}
      </div>{" "}
    </PageLayout>
  );
}
