import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KitchenTask {
  id: string;
  title: string;
  components: string[];
  dueTime: string;
  status: "pending" | "in-progress" | "completed";
  priority: "low" | "normal" | "high";
  assignee?: string;
  notes?: string;
}

interface MobileKitchenCardProps {
  task: KitchenTask;
  onStatusChange?: (taskId: string, status: KitchenTask["status"]) => void;
  onAssign?: (taskId: string) => void;
}

/**
 * Mobile-optimized kitchen task card
 * Large tap targets, minimal scrolling, quick actions
 */
export const MobileKitchenCard: React.FC<MobileKitchenCardProps> = ({
  task,
  onStatusChange,
  onAssign,
}) => {
  const [expanded, setExpanded] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300";
      case "normal":
        return "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300";
      case "low":
        return "bg-gray-100 dark:bg-gray-950/30 text-gray-700 dark:text-gray-300";
      default:
        return "bg-gray-100 dark:bg-gray-950/30 text-gray-700 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "in-progress":
        return <Clock className="h-5 w-5 text-blue-600" />;
      case "pending":
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return null;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800";
      case "in-progress":
        return "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800";
      case "pending":
        return "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800";
      default:
        return "bg-gray-50 dark:bg-gray-950/20";
    }
  };

  const nextStatus: Record<string, KitchenTask["status"]> = {
    pending: "in-progress",
    "in-progress": "completed",
    completed: "pending",
  };

  return (
    <Card className={cn("overflow-hidden", getStatusBgColor(task.status))}>
      {/* Header - Always Visible */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            {getStatusIcon(task.status)}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base leading-tight">{task.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{task.dueTime}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge className={getPriorityColor(task.priority)}>
            {task.priority.charAt(0).toUpperCase()}
          </Badge>
          <ChevronDown
            className={cn("h-5 w-5 text-muted-foreground transition-transform", expanded && "rotate-180")}
          />
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t p-4 space-y-4 bg-background/50">
          {/* Components List */}
          <div>
            <p className="text-xs font-semibold mb-2 text-muted-foreground">COMPONENTS</p>
            <div className="space-y-1">
              {task.components.map((component, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-background/50 border text-sm font-medium"
                >
                  ✓ {component}
                </div>
              ))}
            </div>
          </div>

          {/* Assignee */}
          {task.assignee && (
            <div>
              <p className="text-xs font-semibold mb-1 text-muted-foreground">ASSIGNED TO</p>
              <p className="text-sm font-medium">{task.assignee}</p>
            </div>
          )}

          {/* Notes */}
          {task.notes && (
            <div>
              <p className="text-xs font-semibold mb-1 text-muted-foreground">NOTES</p>
              <p className="text-sm bg-background/50 p-2 rounded whitespace-pre-wrap">
                {task.notes}
              </p>
            </div>
          )}

          {/* Action Buttons - Large Touch Targets */}
          <div className="grid grid-cols-2 gap-2 pt-4 border-t">
            <Button
              size="lg"
              variant={task.status === "in-progress" ? "default" : "outline"}
              onClick={() => onStatusChange?.(task.id, "in-progress")}
              className="text-base h-12"
            >
              {task.status === "in-progress" ? "Cooking..." : "Start"}
            </Button>

            <Button
              size="lg"
              variant={task.status === "completed" ? "default" : "outline"}
              onClick={() => onStatusChange?.(task.id, "completed")}
              className="text-base h-12"
            >
              {task.status === "completed" ? "Done ✓" : "Complete"}
            </Button>
          </div>

          {onAssign && task.status !== "completed" && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => onAssign(task.id)}
              className="w-full text-base h-12"
            >
              Assign to Staff
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};

/**
 * Mobile Queue View - Shows all tasks in a prioritized list
 */
interface MobileKitchenQueueProps {
  tasks: KitchenTask[];
  onStatusChange?: (taskId: string, status: KitchenTask["status"]) => void;
  onAssign?: (taskId: string) => void;
}

export const MobileKitchenQueue: React.FC<MobileKitchenQueueProps> = ({
  tasks,
  onStatusChange,
  onAssign,
}) => {
  // Sort tasks: pending by priority, then in-progress, then completed
  const priorityMap = { high: 0, normal: 1, low: 2 };
  const statusOrder = { pending: 0, "in-progress": 1, completed: 2 };

  const sortedTasks = [...tasks].sort((a, b) => {
    const statusDiff =
      (statusOrder[a.status as keyof typeof statusOrder] || 0) -
      (statusOrder[b.status as keyof typeof statusOrder] || 0);

    if (statusDiff !== 0) return statusDiff;

    return (
      (priorityMap[a.priority as keyof typeof priorityMap] || 1) -
      (priorityMap[b.priority as keyof typeof priorityMap] || 1)
    );
  });

  return (
    <div className="space-y-3">
      {sortedTasks.map((task) => (
        <MobileKitchenCard
          key={task.id}
          task={task}
          onStatusChange={onStatusChange}
          onAssign={onAssign}
        />
      ))}
    </div>
  );
};

export default MobileKitchenCard;
