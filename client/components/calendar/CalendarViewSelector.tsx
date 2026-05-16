import React from "react";
import { Calendar, Calendar2, CalendarDays } from "lucide-react";
import { cn } from "@/lib/glass";
import { Button } from "@/components/ui/button";

export type CalendarViewType = "day" | "week" | "month";

interface CalendarViewSelectorProps {
  currentView: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  className?: string;
}

export function CalendarViewSelector({
  currentView,
  onViewChange,
  className,
}: CalendarViewSelectorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-glass-secondary bg-glass-secondary/30 p-1",
        className,
      )}
    >
      <Button
        variant={currentView === "day" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("day")}
        className="gap-2"
      >
        <Calendar className="h-4 w-4" />
        <span className="hidden sm:inline">Day</span>
      </Button>

      <Button
        variant={currentView === "week" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("week")}
        className="gap-2"
      >
        <Calendar2 className="h-4 w-4" />
        <span className="hidden sm:inline">Week</span>
      </Button>

      <Button
        variant={currentView === "month" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("month")}
        className="gap-2"
      >
        <CalendarDays className="h-4 w-4" />
        <span className="hidden sm:inline">Month</span>
      </Button>
    </div>
  );
}
