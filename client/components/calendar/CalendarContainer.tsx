import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  addDays,
  subDays,
  isValid,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/glass";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CalendarViewSelector, CalendarViewType } from "./CalendarViewSelector";
import { DayCalendarView } from "./DayCalendarView";
import { WeekCalendarView } from "./WeekCalendarView";
import { MonthCalendarView } from "./MonthCalendarView";
import { DepartmentFilterPanel } from "./DepartmentFilterPanel";

export interface CalendarEvent {
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
  outlet_id?: string;
}

export interface Department {
  id: string;
  name: string;
  color?: string;
}

interface CalendarContainerProps {
  events: CalendarEvent[];
  departments?: Department[];
  isLoading?: boolean;
  onEventClick: (event: CalendarEvent) => void;
  onDateSelect?: (date: Date) => void;
  initialView?: CalendarViewType;
  className?: string;
}

export function CalendarContainer({
  events,
  departments = [],
  isLoading = false,
  onEventClick,
  onDateSelect,
  initialView = "month",
  className,
}: CalendarContainerProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<CalendarViewType>(initialView);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);

  // Persist view preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("calendar_view", viewType);
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [viewType]);

  // Filter events by selected departments
  const filteredEvents = useMemo(() => {
    if (selectedDepartments.length === 0) return events;

    return events.filter(
      (event) =>
        !event.department || selectedDepartments.includes(event.department),
    );
  }, [events, selectedDepartments]);

  const handlePrevious = useCallback(() => {
    switch (viewType) {
      case "day":
        setCurrentDate((prev) => subDays(prev, 1));
        break;
      case "week":
        setCurrentDate((prev) => subDays(prev, 7));
        break;
      case "month":
        setCurrentDate((prev) => subMonths(prev, 1));
        break;
    }
  }, [viewType]);

  const handleNext = useCallback(() => {
    switch (viewType) {
      case "day":
        setCurrentDate((prev) => addDays(prev, 1));
        break;
      case "week":
        setCurrentDate((prev) => addDays(prev, 7));
        break;
      case "month":
        setCurrentDate((prev) => addMonths(prev, 1));
        break;
    }
  }, [viewType]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleViewChange = useCallback((view: CalendarViewType) => {
    setViewType(view);
  }, []);

  const getHeaderTitle = () => {
    switch (viewType) {
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy");
      case "week":
        const weekEnd = new Date(currentDate);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return `${format(currentDate, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
      case "month":
        return format(currentDate, "MMMM yyyy");
      default:
        return "";
    }
  };

  return (
    <div className={cn("flex flex-col gap-4 h-full", className)}>
      {/* Header with Controls */}
      <Card className="border-glass-secondary bg-glass-secondary/20 p-4">
        <div className="flex flex-col gap-4 md:gap-0 md:flex-row md:items-center md:justify-between">
          {/* Left: Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="h-9 px-3"
            >
              Today
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              className="h-9 w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Header Title */}
            <div className="ml-4 text-lg font-semibold text-white flex-1 md:flex-none">
              {getHeaderTitle()}
            </div>
          </div>

          {/* Right: View Selector */}
          <div className="flex items-center gap-3">
            <CalendarViewSelector
              currentView={viewType}
              onViewChange={handleViewChange}
            />
          </div>
        </div>

        {/* Department Filter */}
        {departments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-glass-secondary/30">
            <DepartmentFilterPanel
              departments={departments}
              selectedDepartments={selectedDepartments}
              onDepartmentsChange={setSelectedDepartments}
            />
          </div>
        )}
      </Card>

      {/* Main Calendar View */}
      <Card className="border-glass-secondary bg-glass-secondary/20 flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
              <p className="mt-4 text-glass-muted">Loading events...</p>
            </div>
          </div>
        ) : (
          <>
            {viewType === "day" && (
              <DayCalendarView
                date={currentDate}
                events={filteredEvents}
                onEventClick={onEventClick}
                className="h-full"
              />
            )}

            {viewType === "week" && (
              <WeekCalendarView
                date={currentDate}
                events={filteredEvents}
                onEventClick={onEventClick}
                className="h-full"
              />
            )}

            {viewType === "month" && (
              <MonthCalendarView
                date={currentDate}
                events={filteredEvents}
                onEventClick={onEventClick}
                onDateClick={(date) => {
                  setCurrentDate(date);
                  onDateSelect?.(date);
                }}
                className="h-full"
              />
            )}
          </>
        )}
      </Card>

      {/* Event Count Summary */}
      <div className="text-sm text-glass-muted">
        {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}{" "}
        shown
        {selectedDepartments.length > 0 &&
          ` (${selectedDepartments.length} department${selectedDepartments.length !== 1 ? "s" : ""} selected)`}
      </div>
    </div>
  );
}
