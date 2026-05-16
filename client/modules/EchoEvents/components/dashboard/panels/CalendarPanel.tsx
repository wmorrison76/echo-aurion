import { Calendar, Plus } from "lucide-react";
import { MiniPanel } from "../MiniPanel";
import { Button } from "@/components/ui/button";
interface CalendarEvent {
  date: number;
  count: number;
  isToday?: boolean;
}
interface CalendarPanelProps {
  onDateSelect?: (date: number) => void;
  onAddEvent?: () => void;
  isMinimized?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
  size?: "small" | "medium" | "large";
  onSizeChange?: (size: "small" | "medium" | "large") => void;
}
const CURRENT_DATE = new Date();
const MONTH_NAME = CURRENT_DATE.toLocaleDateString("en-US", { month: "long" });
const YEAR = CURRENT_DATE.getFullYear();
const TODAY = CURRENT_DATE.getDate();
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const FIRST_DAY = new Date(
  CURRENT_DATE.getFullYear(),
  CURRENT_DATE.getMonth(),
  1,
).getDay();
const DAYS_IN_MONTH = new Date(
  CURRENT_DATE.getFullYear(),
  CURRENT_DATE.getMonth() + 1,
  0,
).getDate();
const events: Record<number, number> = {
  5: 1,
  12: 2,
  15: 1,
  20: 3,
  25: 1,
  28: 2,
};
export function CalendarPanel({
  onDateSelect,
  onAddEvent,
  isMinimized,
  onMinimize,
  onClose,
  size = "medium",
  onSizeChange,
}: CalendarPanelProps) {
  const days: (number | null)[] = Array(FIRST_DAY).fill(null);
  for (let i = 1; i <= DAYS_IN_MONTH; i++) {
    days.push(i);
  }
  return (
    <MiniPanel
      id="calendar"
      title="Calendar"
      icon={<Calendar className="h-4 w-4" />}
      isMinimized={isMinimized}
      onMinimize={onMinimize}
      onClose={onClose}
      size={size}
      onSizeChange={onSizeChange}
    >
      {" "}
      <div className="space-y-3">
        {" "}
        <div className="flex items-center justify-between mb-2">
          {" "}
          <p className="text-xs font-semibold text-white">
            {" "}
            {MONTH_NAME} {YEAR}{" "}
          </p>{" "}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-white/60 hover:text-white hover:bg-background"
            onClick={onAddEvent}
            title="Add event"
          >
            {" "}
            <Plus className="h-4 w-4" />{" "}
          </Button>{" "}
        </div>{" "}
        <div>
          {" "}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {" "}
            {DAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-white/60"
              >
                {" "}
                {day}{" "}
              </div>
            ))}{" "}
          </div>{" "}
          <div className="grid grid-cols-7 gap-1">
            {" "}
            {days.map((day, idx) => (
              <button
                key={idx}
                onClick={() => day && onDateSelect?.(day)}
                disabled={!day}
                className={` aspect-square text-xs rounded-lg font-medium transition-all ${!day ? "bg-transparent cursor-default" : ""} ${day === TODAY ? "bg-primary/30 border border-blue-500/60 text-white font-bold" : "bg-background border border-white/10 text-white/80 hover:bg-background"} ${events[day!] ? "relative" : ""} `}
              >
                {" "}
                <span className="flex items-center justify-center h-full">
                  {" "}
                  {day}{" "}
                </span>{" "}
                {events[day!] && (
                  <span className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-yellow-400" />
                )}{" "}
              </button>
            ))}{" "}
          </div>{" "}
        </div>{" "}
        <div className="pt-2 text-xs text-white/60">
          {" "}
          <p>
            {" "}
            Today: {MONTH_NAME} {TODAY}{" "}
          </p>{" "}
        </div>{" "}
      </div>{" "}
    </MiniPanel>
  );
}
