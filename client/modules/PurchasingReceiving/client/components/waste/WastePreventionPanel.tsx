import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  usePreventionActions,
  usePreventionROI,
} from "@/hooks/useWastePrevention";
import { Plus, TrendingUp, Target } from "lucide-react";
interface WastePreventionPanelProps {
  organizationId: string;
  outletId?: string;
}
export function WastePreventionPanel({
  organizationId,
  outletId,
}: WastePreventionPanelProps) {
  const { actions, summary: actionSummary } = usePreventionActions({
    organizationId,
    outletId,
  });
  const { roiData, summary: roiSummary } = usePreventionROI({
    organizationId,
    outletId,
  });
  const [showAddAction, setShowAddAction] = useState(false);
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-yellow-100 text-yellow-800";
      case "proposed":
        return "bg-surface text-gray-800";
      default:
        return "bg-surface text-gray-800";
    }
  };
  return (
    <div className="space-y-6">
      {" "}
      {/* ROI Summary Cards */}{" "}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Investment
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              ${roiSummary.totalInvestment.toFixed(2)}
            </div>{" "}
            <div className="text-xs text-muted-foreground mt-1">
              {roiSummary.total} actions
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Savings
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-green-600">
              ${roiSummary.totalSavings.toFixed(2)}
            </div>{" "}
            <div className="text-xs text-muted-foreground mt-1">
              from completed actions
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Benefit
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div
              className={`text-2xl font-bold ${roiSummary.netBenefit >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {" "}
              ${roiSummary.netBenefit.toFixed(2)}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average ROI
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {roiSummary.avgROI.toFixed(1)}%
            </div>{" "}
            <div className="text-xs text-muted-foreground mt-1">
              return on investment
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Prevention Actions */}{" "}
      <Card>
        {" "}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          {" "}
          <div>
            {" "}
            <CardTitle className="flex items-center gap-2">
              {" "}
              <Target className="w-5 h-5" /> Prevention Actions{" "}
            </CardTitle>{" "}
            <CardDescription>Initiatives to reduce waste</CardDescription>{" "}
          </div>{" "}
          <Button size="sm" onClick={() => setShowAddAction(true)}>
            {" "}
            <Plus className="w-4 h-4 mr-2" /> New Action{" "}
          </Button>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="space-y-2">
            {" "}
            {actions.slice(0, 8).map((action) => (
              <div
                key={action.id}
                className="flex items-start justify-between p-3 border rounded-lg"
              >
                {" "}
                <div className="flex-1">
                  {" "}
                  <div className="flex items-center gap-2 mb-1">
                    {" "}
                    <h4 className="font-medium">{action.title}</h4>{" "}
                    <Badge
                      className={`text-xs ${getStatusColor(action.status)}`}
                    >
                      {" "}
                      {action.status}{" "}
                    </Badge>{" "}
                  </div>{" "}
                  <div className="text-sm text-muted-foreground">
                    {action.description}
                  </div>{" "}
                  {action.expected_cost_savings && (
                    <div className="text-xs text-green-600 mt-1">
                      {" "}
                      Expected savings: $
                      {action.expected_cost_savings.toFixed(2)}{" "}
                    </div>
                  )}{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Action Status Summary */}{" "}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {" "}
        <Card>
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm">Total Actions</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">{actionSummary.total}</div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm">In Progress</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-primary">
              {actionSummary.inProgress}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm">Completed</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-green-600">
              {actionSummary.completed}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm">Expected Savings</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-green-600">
              {" "}
              ${actionSummary.totalExpectedSavings.toFixed(2)}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
    </div>
  );
}
