import React, { useMemo } from "react";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { cn } from "@/lib/glass";
import { Card } from "@/components/ui/card";
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

interface WeekCalendarViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  className?: string;
}

export function WeekCalendarView({
  date,
  events,
  onEventClick,
  className,
}: WeekCalendarViewProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};

    weekDays.forEach((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      map[dayStr] = events.filter((e) => e.date === dayStr);
    });

    return map;
  }, [events, weekDays]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-500/20 border-emerald-500/50";
      case "pending":
        return "bg-amber-500/20 border-amber-500/50";
      case "tentative":
        return "bg-blue-500/20 border-blue-500/50";
      case "cancelled":
        return "bg-red-500/20 border-red-500/50";
      default:
        return "bg-glass-secondary/20 border-glass-secondary/50";
    }
  };

  return (
    <div className={cn("w-full h-full flex flex-col overflow-auto", className)}>
      {/* Week Header */}
      <div className="sticky top-0 z-20 bg-glass-secondary/30 border-b border-glass-secondary backdrop-blur-sm">
        <div className="grid grid-cols-7 gap-0">
          {weekDays.map((day) => (
            <div
              key={format(day, "yyyy-MM-dd")}
              className="flex flex-col items-center justify-center py-4 px-2 border-r border-glass-secondary/30 last:border-r-0"
            >
              <p className="text-xs font-medium text-glass-muted">
                {format(day, "EEE")}
              </p>
              <p
                className={cn(
                  "text-lg font-bold mt-1",
                  isToday(day) ? "text-blue-400" : "text-white",
                )}
              >
                {format(day, "d")}
              </p>
              {isToday(day) && (
                <div className="h-1 w-1 rounded-full bg-blue-400 mt-1" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-0 flex-1">
        {weekDays.map((day) => {
          const dayStr = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate[dayStr] || [];
          const today = isToday(day);

          return (
            <div
              key={dayStr}
              className={cn(
                "border-r border-glass-secondary/30 last:border-r-0 min-h-48 p-2 overflow-y-auto",
                today && "bg-blue-500/5",
              )}
            >
              {/* Event Badges */}
              <div className="flex flex-col gap-1">
                {dayEvents.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-glass-muted/50">No events</p>
                  </div>
                ) : (
                  dayEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className={cn(
                        "rounded-md p-2 text-xs cursor-pointer border-l-4 border-l-blue-500",
                        "hover:shadow-lg hover:scale-105 transition-all transform",
                        getStatusColor(event.status),
                      )}
                    >
                      <div className="font-semibold text-white truncate">
                        {event.title}
                      </div>
                      {event.start_time && (
                        <div className="text-glass-muted font-mono text-xs mt-1">
                          {event.start_time}
                        </div>
                      )}
                      {event.guest_count && (
                        <div className="text-glass-muted text-xs mt-1">
                          👥 {event.guest_count}
                        </div>
                      )}
                      {event.location_room && (
                        <div className="text-glass-muted text-xs truncate mt-1">
                          📍 {event.location_room}
                        </div>
                      )}
                      {event.status && (
                        <Badge
                          variant="outline"
                          className="mt-2 text-xs h-5 w-full justify-center"
                        >
                          {event.status}
                        </Badge>
                      )}
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
