import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, Users, AlertCircle } from "lucide-react";
import { cn } from "@/lib/glass";

export interface UpcomingEvent {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventStartTime: string;
  outletId: string;
  outletName: string;
  taskId: string;
  taskStatus: string;
  taskTitle: string;
  guestCount: number;
  estimatedHours: number;
  assignedStaffCount: number;
  platingType: string;
  daysUntilEvent: number;
}

export interface DepartmentUpcomingEventsMiniPanelProps {
  departmentId: string;
  departmentName: string;
  daysAhead?: number;
  onEventClick?: (event: UpcomingEvent) => void;
  className?: string;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "blocked":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getDaysUntilColor = (daysUntilEvent: number): string => {
  if (daysUntilEvent <= 0) return "text-red-600 font-bold";
  if (daysUntilEvent === 1) return "text-orange-600 font-bold";
  if (daysUntilEvent <= 3) return "text-amber-600 font-semibold";
  return "text-slate-600";
};

export function DepartmentUpcomingEventsMiniPanel({
  departmentId,
  departmentName,
  daysAhead = 7,
  onEventClick,
  className,
}: DepartmentUpcomingEventsMiniPanelProps) {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/labor-sync/department/${departmentId}/upcoming-events?daysAhead=${daysAhead}`,
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch upcoming events: ${response.statusText}`,
          );
        }

        const data = await response.json();
        setEvents(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch events");
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingEvents();

    // Refresh every 5 minutes
    const interval = setInterval(fetchUpcomingEvents, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [departmentId, daysAhead]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {departmentName} - Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground">
            Loading events...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {departmentName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {departmentName} - Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground">
            No upcoming events in the next {daysAhead} days
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span>{departmentName} - Upcoming Events</span>
          <Badge variant="outline" className="text-xs">
            {events.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.map((event) => (
          <div
            key={event.taskId}
            className={cn(
              "p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
              "bg-gradient-to-br from-slate-50 to-slate-100/50",
            )}
            onClick={() => onEventClick?.(event)}
          >
            {/* Event Title and Days Until */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold truncate">
                  {event.eventTitle}
                </h4>
                <p className="text-xs text-muted-foreground truncate">
                  {event.outletName}
                </p>
              </div>
              <span
                className={cn(
                  "text-xs whitespace-nowrap",
                  getDaysUntilColor(event.daysUntilEvent),
                )}
              >
                {event.daysUntilEvent === 0
                  ? "Today"
                  : event.daysUntilEvent === 1
                    ? "Tomorrow"
                    : `${event.daysUntilEvent}d`}
              </span>
            </div>

            {/* Event Details Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{new Date(event.eventDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{event.guestCount} guests</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{event.estimatedHours.toFixed(1)}h</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{event.assignedStaffCount} staff</span>
              </div>
            </div>

            {/* Status and Plating Type */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <Badge
                className={cn("text-xs", getStatusColor(event.taskStatus))}
              >
                {event.taskStatus.replace(/_/g, " ")}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {event.platingType}
              </Badge>
            </div>

            {/* Task Title */}
            <p className="text-xs text-muted-foreground mb-2">
              {event.taskTitle}
            </p>

            {/* Progress Bar (simple based on status) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Task Progress</span>
                <span className="font-semibold">
                  {event.taskStatus === "completed"
                    ? "100%"
                    : event.taskStatus === "in_progress"
                      ? "50%"
                      : event.taskStatus === "pending"
                        ? "0%"
                        : "0%"}
                </span>
              </div>
              <Progress
                value={
                  event.taskStatus === "completed"
                    ? 100
                    : event.taskStatus === "in_progress"
                      ? 50
                      : 0
                }
                className="h-1.5"
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default DepartmentUpcomingEventsMiniPanel;
