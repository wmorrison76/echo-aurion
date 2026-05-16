import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Clock, Users } from "lucide-react";
import { cn } from "@/lib/glass";

export interface LaborHourBreakdown {
  prepDayDate: string;
  daysBeforeEvent: number;
  estimatedHours: number;
  estimatedStaffCount: number;
  laborType: string;
  status: string;
}

export interface PrepLaborBreakdownMiniPanelProps {
  taskId: string;
  taskTitle?: string;
  eventDate?: string;
  className?: string;
}

const getLaborTypeLabel = (laborType: string): string => {
  const labels: Record<string, string> = {
    menu_planning: "Menu Planning",
    major_prep: "Major Prep",
    final_prep: "Final Prep",
    execution: "Day-of Execution",
    banquet_prep: "Banquet Prep",
    pastry_prep: "Pastry Prep",
    plating: "Plating",
    setup: "Setup",
  };
  return labels[laborType] || laborType;
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "scheduled":
      return "bg-blue-100 text-blue-800";
    case "in_progress":
      return "bg-purple-100 text-purple-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "skipped":
      return "bg-gray-100 text-gray-800";
    case "blocked":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusProgress = (status: string): number => {
  switch (status) {
    case "pending":
      return 0;
    case "scheduled":
      return 25;
    case "in_progress":
      return 50;
    case "completed":
      return 100;
    case "skipped":
      return 100;
    case "blocked":
      return 0;
    default:
      return 0;
  }
};

export function PrepLaborBreakdownMiniPanel({
  taskId,
  taskTitle,
  eventDate,
  className,
}: PrepLaborBreakdownMiniPanelProps) {
  const [breakdown, setBreakdown] = useState<LaborHourBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBreakdown = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/labor-sync/task/${taskId}/labor-breakdown`,
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch labor breakdown: ${response.statusText}`,
          );
        }

        const data = await response.json();
        setBreakdown(data.data || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch labor breakdown",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBreakdown();

    // Refresh every 5 minutes
    const interval = setInterval(fetchBreakdown, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [taskId]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Labor Hours Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Labor Hours Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (breakdown.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Labor Hours Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground">
            No labor hours data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalHours = breakdown.reduce(
    (sum, item) => sum + item.estimatedHours,
    0,
  );
  const avgStaffCount = Math.round(
    breakdown.reduce((sum, item) => sum + item.estimatedStaffCount, 0) /
      breakdown.length,
  );

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          Labor Hours Breakdown
        </CardTitle>
        {taskTitle && (
          <p className="text-xs text-muted-foreground mt-1">{taskTitle}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Total Hours</p>
            <p className="text-lg font-bold">{totalHours.toFixed(1)}h</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg Staff</p>
            <p className="text-lg font-bold">{avgStaffCount}</p>
          </div>
        </div>

        {/* Breakdown by Day */}
        <div className="space-y-3">
          {breakdown.map((item, index) => (
            <div key={index} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs font-semibold">
                    {item.daysBeforeEvent === 0
                      ? "Day of Event"
                      : `${item.daysBeforeEvent} day${item.daysBeforeEvent !== 1 ? "s" : ""} before`}
                  </span>
                  <Badge className="text-xs px-1.5 py-0.5">
                    {new Date(item.prepDayDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Badge>
                </div>
              </div>

              <div className="ml-1 space-y-1">
                {/* Labor Type and Hours */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {getLaborTypeLabel(item.laborType)}
                  </span>
                  <span className="font-semibold">
                    {item.estimatedHours.toFixed(1)}h
                  </span>
                </div>

                {/* Staff Count */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{item.estimatedStaffCount} staff</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", getStatusColor(item.status))}
                  >
                    {item.status}
                  </Badge>
                </div>

                {/* Progress Bar */}
                <Progress
                  value={getStatusProgress(item.status)}
                  className="h-1.5"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Cost Estimate Placeholder */}
        <div className="pt-2 border-t text-xs text-muted-foreground">
          <p>💰 Estimated at $20/hour labor rate</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default PrepLaborBreakdownMiniPanel;
