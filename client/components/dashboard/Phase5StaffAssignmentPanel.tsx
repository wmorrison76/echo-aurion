import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/glass";

export interface StaffAssignment {
  id: string;
  productionTaskId: string;
  employeeId: string;
  employeeName: string;
  roleInTask: string;
  assignmentStatus: "pending" | "confirmed" | "in_progress" | "completed";
  estimatedHours: number;
  actualHoursWorked?: number;
  taskAllocationPercentage: number;
}

export interface Phase5StaffAssignmentPanelProps {
  taskId: string;
  taskTitle?: string;
  className?: string;
  compact?: boolean;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "confirmed":
      return "bg-blue-100 text-blue-800";
    case "in_progress":
      return "bg-purple-100 text-purple-800";
    case "completed":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return <AlertCircle className="h-4 w-4" />;
    case "confirmed":
      return <CheckCircle2 className="h-4 w-4" />;
    case "in_progress":
      return <Clock className="h-4 w-4" />;
    case "completed":
      return <CheckCircle2 className="h-4 w-4" />;
    default:
      return null;
  }
};

export function Phase5StaffAssignmentPanel({
  taskId,
  taskTitle,
  className,
  compact = false,
}: Phase5StaffAssignmentPanelProps) {
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/phase5/tasks/${taskId}/assignments`);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const data = await response.json();
        setAssignments(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
    const interval = setInterval(fetchAssignments, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, [taskId]);

  if (compact) {
    // Compact mobile view
    if (loading) {
      return (
        <div className="p-2 text-center text-sm text-muted-foreground">
          Loading staff...
        </div>
      );
    }

    return (
      <div className={cn("space-y-2", className)}>
        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg"
          >
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {assignment.employeeName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">
                {assignment.employeeName}
              </div>
              <div className="text-xs text-muted-foreground">
                {assignment.roleInTask}
              </div>
            </div>
            <Badge
              className={cn(
                "text-xs",
                getStatusColor(assignment.assignmentStatus),
              )}
            >
              {assignment.assignmentStatus.replace("_", " ")}
            </Badge>
          </div>
        ))}

        {assignments.length === 0 && (
          <div className="p-2 text-center text-xs text-muted-foreground">
            No staff assigned
          </div>
        )}
      </div>
    );
  }

  // Full view
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4" />
          Staff Assignments
        </CardTitle>
        {taskTitle && (
          <p className="text-xs text-muted-foreground mt-1">{taskTitle}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && (
          <div className="text-center text-sm text-muted-foreground">
            Loading assignments...
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && assignments.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-4">
            No staff assigned to this task yet
          </div>
        )}

        {!loading &&
          !error &&
          assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="p-3 border rounded-lg bg-gradient-to-r from-slate-50 to-slate-100/50"
            >
              <div className="flex items-start gap-3 mb-2">
                <Avatar className="h-8 w-8 mt-0.5">
                  <AvatarFallback className="text-xs font-semibold">
                    {assignment.employeeName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold">
                    {assignment.employeeName}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {assignment.roleInTask}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge
                    className={cn(
                      "text-xs gap-1",
                      getStatusColor(assignment.assignmentStatus),
                    )}
                  >
                    {getStatusIcon(assignment.assignmentStatus)}
                    {assignment.assignmentStatus.replace("_", " ")}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Hours:</span>
                  <span className="font-semibold">
                    {assignment.estimatedHours.toFixed(1)}h
                    {assignment.actualHoursWorked && (
                      <span className="text-green-600 ml-1">
                        ({assignment.actualHoursWorked.toFixed(1)}h actual)
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Allocation:</span>
                  <span className="font-semibold">
                    {assignment.taskAllocationPercentage}%
                  </span>
                </div>
              </div>

              {assignment.assignmentStatus === "pending" && (
                <Button size="sm" className="w-full mt-2 text-xs">
                  Confirm Availability
                </Button>
              )}
            </div>
          ))}

        {!loading && !error && (
          <Button variant="outline" size="sm" className="w-full text-xs">
            <Users className="h-3 w-3 mr-1" />
            Assign More Staff
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default Phase5StaffAssignmentPanel;
