import React, { useMemo } from "react";

import { cn } from "@/lib/glass";
import { Badge } from "@/components/ui/badge";
import { CalendarEvent, CalendarOutlet } from "@/types/calendar";
import {
  useCalendarEvents,
  useCalendarOutlets,
  useSelectedOutlets,
  useUnresolvedConflicts,
  useEventConflictCount,
} from "../stores/useCalendarStore";

interface EnhancedCalendarGridProps {
  date: Date;
  onEventClick: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  selectedDate?: string;
  showOutletIndicators?: boolean;
  highlightConflicts?: boolean;
}

function EnhancedCalendarGrid({
  date,
  onEventClick,
  onDateClick,
  selectedDate,
  showOutletIndicators = true,
  highlightConflicts = true,
}: EnhancedCalendarGridProps) {
  const events = useCalendarEvents();
  const selectedOutlets = useSelectedOutlets();
  const outlets = useCalendarOutlets();
  const conflicts = useUnresolvedConflicts();

  const outletMap = useMemo(() => {
    const map = new Map<string, CalendarOutlet>();
    outlets.forEach((outlet) => map.set(outlet.id, outlet));
    return map;
  }, [outlets]);

  const conflictMap = useMemo(() => {
    const map = new Map<string, number>();
    conflicts.forEach((conflict) => {
      const count1 = (map.get(conflict.event_id_1) || 0) + 1;
      const count2 = (map.get(conflict.event_id_2) || 0) + 1;
      map.set(conflict.event_id_1, count1);
      map.set(conflict.event_id_2, count2);
    });
    return map;
  }, [conflicts]);

  const filteredEvents = useMemo(() => {
    if (selectedOutlets.length === 0) {
      return events;
    }
    return events.filter((event) => selectedOutlets.includes(event.outlet_id));
  }, [events, selectedOutlets]);

  const daysInMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const empty = Array.from({ length: firstDay }, () => null);

  const getEventsForDay = (dayNum: number): CalendarEvent[] => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(dayNum).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    return filteredEvents.filter((event) => event.date === dateStr);
  };

  const getOutletColor = (event: CalendarEvent): string => {
    const outlet = outletMap.get(event.outlet_id);
    return outlet?.color || "#3b82f6";
  };

  const getOutletName = (event: CalendarEvent): string => {
    const outlet = outletMap.get(event.outlet_id);
    return outlet?.name || "Unknown";
  };

  const hasConflict = (eventId: string): boolean => conflictMap.has(eventId);
  const getConflictCount = (eventId: string): number =>
    conflictMap.get(eventId) || 0;

  return (
    <div
      data-calendar-grid
      className="bg-background dark:bg-background border rounded-lg overflow-hidden h-full min-h-[520px] flex flex-col"
    >
      <div className="grid grid-cols-7 border-b bg-slate-100 dark:bg-slate-800 text-xs font-semibold flex-shrink-0">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="p-2 text-center text-foreground">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1 overflow-hidden">
        {empty.map((_, i) => (
          <div
            key={`empty-${i}`}
            className="border-r border-b bg-slate-50 dark:bg-surface"
          />
        ))}

        {days.map((dayNum) => {
          const dayEvents = getEventsForDay(dayNum);
          const cellDate = new Date(
            date.getFullYear(),
            date.getMonth(),
            dayNum,
          );
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(dayNum).padStart(2, "0");
          const dateStr = `${year}-${month}-${day}`;
          const isSelected = selectedDate === dateStr;
          const hasEvents = dayEvents.length > 0;
          const hasConflictInDay = dayEvents.some((event) =>
            hasConflict(event.id),
          );
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(
            today.getMonth() + 1,
          ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
          const isToday = todayStr === dateStr;

          return (
            <div
              key={dayNum}
              onClick={() => onDateClick?.(cellDate)}
              onContextMenu={(e) => {
                e.preventDefault();
                try {
                  window.dispatchEvent(new CustomEvent("global-calendar:day-drill", { detail: { date: dateStr } }));
                } catch {}
              }}
              title="Right-click for full day brief"
              data-testid={`calendar-day-${dateStr}`}
              className={cn(
                "border-r border-b p-1 cursor-pointer transition-colors overflow-hidden flex flex-col",
                isToday &&
                  "ring-2 ring-inset ring-amber-400 dark:ring-amber-500",
                isSelected
                  ? "bg-blue-200 dark:bg-blue-900/40 ring-2 ring-blue-400"
                  : hasConflictInDay && highlightConflicts
                    ? "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
                    : hasEvents
                      ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800",
              )}
            >
              <div className="text-xs font-semibold opacity-70 mb-0.5">
                {dayNum}
              </div>

              <div className="space-y-0.5 text-[9px] flex-1 overflow-y-auto">
                {dayEvents.slice(0, 3).map((event) => {
                  const conflictCount = getConflictCount(event.id);
                  const outletColor = getOutletColor(event);
                  const outletName = getOutletName(event);
                  return (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      className={cn(
                        "px-0.5 py-0.5 rounded border cursor-pointer truncate hover:opacity-80 transition-opacity relative",
                        "group",
                        event.status === "conflict" || hasConflict(event.id)
                          ? "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-900 dark:text-red-100"
                          : event.status === "confirmed"
                            ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-900 dark:text-green-100"
                            : event.status === "locked"
                              ? "bg-blue-100 dark:bg-blue-900/30 border-primary dark:border-blue-700 text-blue-900 dark:text-blue-100"
                              : "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100",
                      )}
                      title={`${event.title} (${outletName})${
                        conflictCount > 0
                          ? ` - ${conflictCount} conflict(s)`
                          : ""
                      }`}
                    >
                      {showOutletIndicators && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l"
                          style={{ backgroundColor: outletColor }}
                        />
                      )}
                      <div className="pl-1 pr-1 truncate">
                        {event.title}
                        {conflictCount > 0 && highlightConflicts && (
                          <span className="ml-0.5 font-bold">⚠</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {dayEvents.length > 3 && (
                  <div className="text-[9px] text-muted-foreground hover:text-primary dark:hover:text-blue-400 font-medium px-0.5 cursor-pointer">
                    +{dayEvents.length - 3} more
                  </div>
                )}

                {highlightConflicts &&
                  dayEvents.some((event) => hasConflict(event.id)) && (
                    <div className="text-[8px] text-red-600 dark:text-red-400 font-bold px-0.5">
                      {
                        dayEvents.filter((event) => hasConflict(event.id))
                          .length
                      }{" "}
                      conflict(s)
                    </div>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default EnhancedCalendarGrid;
