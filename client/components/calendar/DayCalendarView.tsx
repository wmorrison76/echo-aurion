import React, { useMemo } from "react";
import { format, parseISO, isToday } from "date-fns";
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

interface DayCalendarViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  className?: string;
}

export function DayCalendarView({
  date,
  events,
  onEventClick,
  className,
}: DayCalendarViewProps) {
  const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 7 AM to 11 PM

  const dayString = format(date, "yyyy-MM-dd");
  const dayEvents = useMemo(
    () => events.filter((e) => e.date === dayString),
    [events, dayString],
  );

  const eventsByHour = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    hours.forEach((hour) => {
      map[hour] = [];
    });

    dayEvents.forEach((event) => {
      if (!event.start_time) return;
      const [hourStr] = event.start_time.split(":");
      const hour = parseInt(hourStr, 10);
      if (hour >= 7 && hour <= 23) {
        if (!map[hour]) map[hour] = [];
        map[hour].push(event);
      }
    });

    return map;
  }, [dayEvents, hours]);

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

  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-500/80 text-white";
      case "pending":
        return "bg-amber-500/80 text-white";
      case "tentative":
        return "bg-blue-500/80 text-white";
      case "cancelled":
        return "bg-red-500/80 text-white";
      default:
        return "bg-glass-secondary/80 text-white";
    }
  };

  return (
    <div className={cn("w-full h-full overflow-auto", className)}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-glass-secondary/30 border-b border-glass-secondary backdrop-blur-sm p-4">
        <div className="text-center">
          <p className="text-sm font-medium text-glass-muted">
            {format(date, "EEEE")}
          </p>
          <p className="text-2xl font-bold text-white">
            {format(date, "MMMM d, yyyy")}
          </p>
          <p className="text-xs text-glass-muted mt-1">
            {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Time Grid */}
      <div className="grid grid-cols-[80px_1fr] gap-0">
        {/* Time Column */}
        <div className="bg-glass-secondary/10 border-r border-glass-secondary">
          {hours.map((hour) => (
            <div
              key={`time-${hour}`}
              className="h-20 border-b border-glass-secondary/30 p-1 text-right text-xs text-glass-muted font-mono"
            >
              {`${String(hour).padStart(2, "0")}:00`}
            </div>
          ))}
        </div>

        {/* Events Column */}
        <div>
          {hours.map((hour) => (
            <div
              key={`hour-${hour}`}
              className="h-20 border-b border-glass-secondary/30 relative hover:bg-glass-secondary/5 transition-colors"
            >
              {eventsByHour[hour]?.map((event) => (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className={cn(
                    "absolute left-1 right-1 top-1 rounded-md border-l-4 border-l-blue-500 p-2 cursor-pointer",
                    "bg-glass-secondary/30 hover:bg-glass-secondary/50 transition-colors",
                    "hover:shadow-lg hover:scale-105 transform",
                    getStatusColor(event.status),
                  )}
                >
                  <div className="text-xs font-semibold text-white truncate">
                    {event.title}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {event.start_time && (
                      <span className="text-xs text-glass-muted font-mono">
                        {event.start_time}
                      </span>
                    )}
                    {event.guest_count && (
                      <span className="text-xs text-glass-muted">
                        {event.guest_count} guests
                      </span>
                    )}
                  </div>
                  {event.location_room && (
                    <div className="text-xs text-glass-muted truncate">
                      {event.location_room}
                    </div>
                  )}
                  {event.status && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "mt-1 text-xs h-5",
                        getStatusBadgeColor(event.status),
                      )}
                    >
                      {event.status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {dayEvents.length === 0 && (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-glass-muted text-sm">No events scheduled</p>
            <p className="text-glass-muted/50 text-xs mt-1">
              {isToday(date) ? "Create one to get started" : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
