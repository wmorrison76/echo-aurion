import { CheckCircle2, AlertTriangle, Target } from "lucide-react";
import { MiniPanel } from "../MiniPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
interface ActionItem {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  description?: string;
  actionType?: string;
}
interface ActionsPanelProps {
  actions?: ActionItem[];
  onActionClick?: (actionId: string) => void;
  isMinimized?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
  size?: "small" | "medium" | "large";
  onSizeChange?: (size: "small" | "medium" | "large") => void;
}
const DEFAULT_ACTIONS: ActionItem[] = [
  {
    id: "1",
    title: "Follow up with pending proposals",
    priority: "high",
    actionType: "client_engagement",
    description: "3 proposals awaiting client review",
  },
  {
    id: "2",
    title: "Update pricing for Q1 2025",
    priority: "medium",
    actionType: "operations",
    description: "New menu costs received",
  },
  {
    id: "3",
    title: "Schedule vendor review meeting",
    priority: "medium",
    actionType: "procurement",
    description: "Quarterly evaluation due",
  },
  {
    id: "4",
    title: "Review customer feedback",
    priority: "low",
    actionType: "quality",
    description: "12 new reviews pending review",
  },
];
const priorityColors = {
  high: "border-red-500/30 bg-red-500/10",
  medium: "border-yellow-500/30 bg-yellow-500/10",
  low: "border-blue-500/30 bg-primary/10",
};
const priorityBadgeColors = {
  high: "bg-red-500/30 text-red-300",
  medium: "bg-yellow-500/30 text-yellow-300",
  low: "bg-primary/30 text-primary",
};
export function ActionsPanel({
  actions = DEFAULT_ACTIONS,
  onActionClick,
  isMinimized,
  onMinimize,
  onClose,
  size = "medium",
  onSizeChange,
}: ActionsPanelProps) {
  const highPriorityCount = actions.filter((a) => a.priority === "high").length;
  return (
    <MiniPanel
      id="actions"
      title="Recommended Actions"
      icon={<Target className="h-4 w-4" />}
      isMinimized={isMinimized}
      onMinimize={onMinimize}
      onClose={onClose}
      size={size}
      onSizeChange={onSizeChange}
    >
      {" "}
      {highPriorityCount > 0 && (
        <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
          {" "}
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />{" "}
          <p className="text-xs text-red-300">
            {" "}
            {highPriorityCount} high priority action(s){" "}
          </p>{" "}
        </div>
      )}{" "}
      <div className="space-y-2">
        {" "}
        {actions.length === 0 ? (
          <p className="text-xs text-white/50 py-4 text-center">
            {" "}
            No pending actions{" "}
          </p>
        ) : (
          actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onActionClick?.(action.id)}
              className={cn(
                "w-full text-left p-2.5 rounded-lg border transition-all hover:shadow-lg",
                "focus:outline-none focus:ring-2 focus:ring-white/30",
                priorityColors[action.priority],
              )}
            >
              {" "}
              <div className="flex items-start gap-2">
                {" "}
                <CheckCircle2 className="h-4 w-4 text-white/60 flex-shrink-0 mt-0.5" />{" "}
                <div className="flex-1 min-w-0">
                  {" "}
                  <p className="text-xs font-medium text-white truncate">
                    {" "}
                    {action.title}{" "}
                  </p>{" "}
                  {action.description && (
                    <p className="text-xs text-white/60 mt-0.5">
                      {" "}
                      {action.description}{" "}
                    </p>
                  )}{" "}
                </div>{" "}
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded font-medium flex-shrink-0",
                    priorityBadgeColors[action.priority],
                  )}
                >
                  {" "}
                  {action.priority}{" "}
                </span>{" "}
              </div>{" "}
            </button>
          ))
        )}{" "}
      </div>{" "}
    </MiniPanel>
  );
}
