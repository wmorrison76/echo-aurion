/** * CalendarHeader Component * Top section of the calendar with: * - Title and date navigation * - Outlet selector * - View mode toggle (Month/Week/Day) * - Conflict summary */ import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Plus,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useCalendarStore,
  useCalendarStats,
  useCriticalConflicts,
} from "../stores/useCalendarStore";
import { CalendarViewMode } from "@/types/calendar";
import OutletSelector from "./OutletSelector";
interface CalendarHeaderProps {
  onAddEvent?: () => void;
  onSettings?: () => void;
  onCreateOutlet?: () => void;
  showOutletSelector?: boolean;
} /** * CalendarHeader Component */
export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  onAddEvent,
  onSettings,
  onCreateOutlet,
  showOutletSelector = true,
}) => {
  const selectedDate = useCalendarStore((state) => state.selectedDate);
  const viewMode = useCalendarStore((state) => state.viewMode);
  const setSelectedDate = useCalendarStore((state) => state.setSelectedDate);
  const setViewMode = useCalendarStore((state) => state.setViewMode);
  const stats = useCalendarStats();
  const criticalConflicts = useCriticalConflicts();
  const dateObj = new Date(selectedDate);
  const month = dateObj.toLocaleString("en-US", { month: "long" });
  const year = dateObj.getFullYear();
  const dayOfWeek = dateObj.toLocaleString("en-US", { weekday: "long" });
  /** * Format date to YYYY-MM-DD using local timezone */ const formatDateToISO =
    (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
  /** * Navigate to previous month/week/day */ const handlePrevious = () => {
    const date = new Date(selectedDate);
    switch (viewMode) {
      case "month":
        date.setMonth(date.getMonth() - 1);
        break;
      case "week":
        date.setDate(date.getDate() - 7);
        break;
      case "day":
        date.setDate(date.getDate() - 1);
        break;
    }
    setSelectedDate(formatDateToISO(date));
  };
  /** * Navigate to next month/week/day */ const handleNext = () => {
    const date = new Date(selectedDate);
    switch (viewMode) {
      case "month":
        date.setMonth(date.getMonth() + 1);
        break;
      case "week":
        date.setDate(date.getDate() + 7);
        break;
      case "day":
        date.setDate(date.getDate() + 1);
        break;
    }
    setSelectedDate(formatDateToISO(date));
  };
  /** * Navigate to today using local timezone */ const handleToday = () => {
    setSelectedDate(formatDateToISO(new Date()));
  };
  return (
    <div className="space-y-4 mb-6">
      {" "}
      {/* Top bar: Navigation + Actions */}{" "}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {" "}
        {/* Title and Navigation */}{" "}
        <div className="flex items-center gap-4">
          {" "}
          <div>
            {" "}
            <h2 className="text-2xl font-bold">
              {" "}
              {month} {year}{" "}
            </h2>{" "}
            <p className="text-sm text-muted-foreground">{dayOfWeek}</p>{" "}
          </div>{" "}
          {/* Navigation buttons */}{" "}
          <div className="flex items-center gap-1 border rounded-lg p-1 dark:border-border">
            {" "}
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              className="p-1 h-8 w-8"
              title="Previous"
            >
              {" "}
              <ChevronLeft className="w-4 h-4" />{" "}
            </Button>{" "}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="px-3 h-8 text-xs font-medium"
              title="Today"
            >
              {" "}
              Today{" "}
            </Button>{" "}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              className="p-1 h-8 w-8"
              title="Next"
            >
              {" "}
              <ChevronRight className="w-4 h-4" />{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
        {/* Right side: View mode + Actions */}{" "}
        <div className="flex items-center gap-2">
          {" "}
          {/* View mode toggle */}{" "}
          <div className="flex items-center gap-1 border rounded-lg p-1 dark:border-border">
            {" "}
            {(["month", "week", "day"] as CalendarViewMode[]).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode(mode)}
                className="h-8 px-3 text-xs capitalize"
              >
                {" "}
                {mode}{" "}
              </Button>
            ))}{" "}
          </div>{" "}
          {/* Add event button */}{" "}
          {onAddEvent && (
            <Button
              variant="default"
              size="sm"
              onClick={onAddEvent}
              className="gap-1"
            >
              {" "}
              <Plus className="w-4 h-4" /> Add Event{" "}
            </Button>
          )}{" "}
          {/* Settings button */}{" "}
          {onSettings && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSettings}
              className="p-2 h-9 w-9"
            >
              {" "}
              <Settings2 className="w-4 h-4" />{" "}
            </Button>
          )}{" "}
        </div>{" "}
      </div>{" "}
      {/* Conflict alert bar */}{" "}
      {criticalConflicts.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          {" "}
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />{" "}
          <div className="flex-1 min-w-0">
            {" "}
            <p className="text-sm font-medium text-red-900 dark:text-red-100">
              {" "}
              {criticalConflicts.length} critical conflict{" "}
              {criticalConflicts.length !== 1 ? "s" : ""} detected{" "}
            </p>{" "}
            <p className="text-xs text-red-800 dark:text-red-200">
              {" "}
              Review and resolve conflicts to prevent scheduling issues{" "}
            </p>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Stats and Outlet Selector Row */}{" "}
      <div className="flex gap-4 flex-wrap lg:flex-nowrap">
        {" "}
        {/* Statistics cards */}{" "}
        <div className="flex gap-2 flex-wrap">
          {" "}
          <Badge variant="secondary" className="gap-1">
            {" "}
            <span className="font-semibold">{stats.totalEvents}</span>{" "}
            <span>Events</span>{" "}
          </Badge>{" "}
          <Badge variant="secondary" className="gap-1">
            {" "}
            <span className="font-semibold">{stats.confirmedEvents}</span>{" "}
            <span>Confirmed</span>{" "}
          </Badge>{" "}
          {stats.unresolvedConflicts > 0 && (
            <Badge variant="destructive" className="gap-1">
              {" "}
              <AlertTriangle className="w-3 h-3" />{" "}
              <span className="font-semibold">{stats.unresolvedConflicts}</span>{" "}
              <span>Conflicts</span>{" "}
            </Badge>
          )}{" "}
          <Badge variant="secondary" className="gap-1">
            {" "}
            <span className="font-semibold">{stats.totalGuests}</span>{" "}
            <span>Guests</span>{" "}
          </Badge>{" "}
        </div>{" "}
        {/* Outlet selector (on the right, takes remaining space) */}{" "}
        {showOutletSelector && (
          <div className="lg:ml-auto w-full lg:w-auto">
            {" "}
            <OutletSelector
              onCreateOutlet={onCreateOutlet}
              compact={true}
            />{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
};
export default CalendarHeader;
