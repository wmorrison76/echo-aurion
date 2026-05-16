import React from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
export default function AuditGLMonitoring() {
  const navigate = useNavigate();
  return (
    <PageLayout>
      {" "}
      <div className="space-y-6">
        {" "}
        <div>
          {" "}
          <h1 className="text-3xl font-bold text-foreground">
            GL Activity Monitor
          </h1>{" "}
          <p className="text-muted-foreground">
            Real-time monitoring of general ledger activities
          </p>{" "}
        </div>{" "}
        <div className="grid gap-4 md:grid-cols-4">
          {" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium">
                Entries Today
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <span className="text-2xl font-bold">47</span>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium">
                Pending Approval
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <span className="text-2xl font-bold text-orange-600">
                12
              </span>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium">
                Flagged
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <span className="text-2xl font-bold text-red-600">3</span>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium">
                Approved
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <span className="text-2xl font-bold text-green-600">32</span>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="flex items-center gap-2">
              {" "}
              <TrendingUp className="h-5 w-5" /> GL Entry Trends (Last 7
              Days){" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="space-y-3">
              {" "}
              {[
                { day: "Monday", entries: 45, status: "Normal" },
                { day: "Tuesday", entries: 52, status: "Elevated" },
                { day: "Wednesday", entries: 38, status: "Normal" },
                { day: "Thursday", entries: 61, status: "Elevated" },
                { day: "Friday", entries: 47, status: "Normal" },
                { day: "Saturday", entries: 12, status: "Weekend" },
                { day: "Sunday", entries: 8, status: "Weekend" },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  {" "}
                  <span className="text-sm font-medium">{item.day}</span>{" "}
                  <div className="flex items-center gap-4">
                    {" "}
                    <div className="w-48 bg-surface rounded-full h-2">
                      {" "}
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${(item.entries / 61) * 100}%` }}
                      />{" "}
                    </div>{" "}
                    <span className="text-sm text-muted-foreground w-12">
                      {item.entries}
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
          <Button>View Detailed Logs</Button>{" "}
        </div>{" "}
      </div>{" "}
    </PageLayout>
  );
}
