import React, { useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isToday,
  parseISO,
} from "date-fns";
import { cn } from "@/lib/glass";
import { Badge } from "@/components/ui/badge";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  guest_count?: number;
  location_room?: string;
  department?: string;
  status?: string;
  beo_id?: string;
}

interface MonthCalendarViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  className?: string;
}

export function MonthCalendarView({
  date,
  events,
  onEventClick,
  onDateClick,
  className,
}: MonthCalendarViewProps) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(monthStart);
  const weekStart = startOfWeek(monthStart);
  const weekEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let current = weekStart;
  while (current <= weekEnd) {
    days.push(current);
    current = addDays(current, 1);
  }

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};

    events.forEach((event) => {
      if (!map[event.date]) {
        map[event.date] = [];
      }
      map[event.date].push(event);
    });

    return map;
  }, [events]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getStatusColor = (status?: string): string => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-500/80";
      case "pending":
        return "bg-amber-500/80";
      case "tentative":
        return "bg-blue-500/80";
      case "cancelled":
        return "bg-red-500/80";
      default:
        return "bg-glass-secondary/80";
    }
  };

  return (
    <div className={cn("w-full h-full flex flex-col overflow-auto", className)}>
      {/* Month Header */}
      <div className="sticky top-0 z-10 bg-glass-secondary/30 border-b border-glass-secondary backdrop-blur-sm p-4">
        <p className="text-2xl font-bold text-white text-center">
          {format(date, "MMMM yyyy")}
        </p>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-0 bg-glass-secondary/10 border-b border-glass-secondary">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center py-2 text-sm font-semibold text-glass-muted border-r border-glass-secondary/30 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0 flex-1">
        {days.map((day) => {
          const dayStr = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate[dayStr] || [];
          const isCurrentMonth = isSameMonth(day, date);
          const today = isToday(day);

          return (
            <div
              key={dayStr}
              onClick={() => onDateClick?.(day)}
              className={cn(
                "border-b border-r border-glass-secondary/30 last:border-r-0 p-2 min-h-32 cursor-pointer",
                "hover:bg-glass-secondary/20 transition-colors",
                !isCurrentMonth && "bg-glass-secondary/5 text-glass-muted/50",
                today && "bg-blue-500/10 border-blue-500/50",
              )}
            >
              {/* Date Number */}
              <div
                className={cn(
                  "text-sm font-semibold mb-1",
                  today ? "text-blue-400" : "text-white",
                )}
              >
                {format(day, "d")}
                {today && <span className="ml-1 text-xs">(Today)</span>}
              </div>

              {/* Event Dots/Badges */}
              <div className="flex flex-col gap-1 overflow-hidden">
                {dayEvents.length === 0 ? (
                  <div className="text-xs text-glass-muted/30">·</div>
                ) : dayEvents.length > 3 ? (
                  <>
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                        className={cn(
                          "text-xs rounded px-1 py-0.5 truncate cursor-pointer",
                          "hover:opacity-80 transition-opacity",
                          getStatusColor(event.status),
                          "text-white font-medium",
                        )}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDateClick?.(day);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                    >
                      +{dayEvents.length - 2} more
                    </button>
                  </>
                ) : (
                  dayEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      className={cn(
                        "text-xs rounded px-1 py-0.5 truncate cursor-pointer",
                        "hover:opacity-80 transition-opacity",
                        getStatusColor(event.status),
                        "text-white font-medium",
                      )}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
