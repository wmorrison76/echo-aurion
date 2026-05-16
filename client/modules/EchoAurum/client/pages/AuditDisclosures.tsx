import React from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
export default function AuditDisclosures() {
  const navigate = useNavigate();
  return (
    <PageLayout>
      {" "}
      <div className="space-y-6">
        {" "}
        <div>
          {" "}
          <h1 className="text-3xl font-bold text-foreground">
            Financial Statement Disclosures
          </h1>{" "}
          <p className="text-muted-foreground">
            Track and manage required disclosures
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
              <span className="text-2xl font-bold text-green-600">12</span>{" "}
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
              <span className="text-2xl font-bold text-yellow-600">3</span>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium">
                Not Started
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <span className="text-2xl font-bold text-muted-foreground">
                0
              </span>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Disclosure Status</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent className="space-y-3">
            {" "}
            {[
              {
                disclosure: "Accounting Policies",
                status: "Complete",
                reviewer: "CFO",
              },
              {
                disclosure: "Revenue Recognition",
                status: "Complete",
                reviewer: "Controller",
              },
              {
                disclosure: "Related Party Transactions",
                status: "In Review",
                reviewer: "CFO",
              },
              {
                disclosure: "Contingencies",
                status: "Complete",
                reviewer: "Legal Counsel",
              },
              {
                disclosure: "Subsequent Events",
                status: "In Progress",
                reviewer: "Controller",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-3 border rounded-lg"
              >
                {" "}
                <div>
                  {" "}
                  <p className="font-medium">{item.disclosure}</p>{" "}
                  <p className="text-xs text-muted-foreground">
                    Reviewer: {item.reviewer}
                  </p>{" "}
                </div>{" "}
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded ${item.status === "Complete" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                >
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
          <Button>Edit Disclosures</Button>{" "}
        </div>{" "}
      </div>{" "}
    </PageLayout>
  );
}
