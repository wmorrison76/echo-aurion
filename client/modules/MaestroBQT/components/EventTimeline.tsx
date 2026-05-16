/**
 * Event Timeline Component - Enhanced UI/UX
 * Professional, modern design with better visual hierarchy
 */

import React from "react";
import {
  Calendar,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  MapPin,
  Building2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { Event, Space } from "../types";
import { cn } from "@/lib/glass";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface EventTimelineProps {
  events: Event[];
  spaces: Space[];
  selectedEvent?: Event | null;
  onSelectEvent?: (event: Event) => void;
}

export function EventTimeline({
  events,
  spaces,
  selectedEvent,
  onSelectEvent,
}: EventTimelineProps) {
  const getEventStatusColor = (status: Event["status"]) => {
    switch (status) {
      case "definite":
        return "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400";
      case "tentative":
        return "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400";
      case "in_house":
        return "bg-green-500/10 text-green-700 border-green-500/30 dark:bg-green-500/20 dark:text-green-400";
      case "completed":
        return "bg-slate-500/10 text-slate-700 border-slate-500/30 dark:bg-slate-500/20 dark:text-slate-400";
      case "canceled":
        return "bg-red-500/10 text-red-700 border-red-500/30 dark:bg-red-500/20 dark:text-red-400";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-500/30";
    }
  };

  const getSpaceIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "ballroom":
        return <Building2 className="w-5 h-5" />;
      case "outdoor":
        return <MapPin className="w-5 h-5" />;
      case "conference":
        return <Building2 className="w-5 h-5" />;
      default:
        return <MapPin className="w-5 h-5" />;
    }
  };

  const formatTime = (dateTime: string): string => {
    try {
      const date = new Date(dateTime);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "—";
    }
  };

  const formatDate = (dateTime: string): string => {
    try {
      const date = new Date(dateTime);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  // Group events by space
  const eventsBySpace = React.useMemo(() => {
    const grouped: Record<string, { space: Space; events: Event[] }> = {};

    spaces.forEach((space) => {
      grouped[space.id] = { space, events: [] };
    });

    events.forEach((event) => {
      event.spaceIds?.forEach((spaceId) => {
        if (grouped[spaceId]) {
          grouped[spaceId].events.push(event);
        }
      });
    });

    return Object.values(grouped);
  }, [events, spaces]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Event Timeline
          </h2>
          <p className="text-sm text-foreground/60 mt-1">
            {events.length} event{events.length !== 1 ? "s" : ""} across{" "}
            {spaces.length} space{spaces.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Spaces with Events */}
      <div className="space-y-4">
        {eventsBySpace.map(({ space, events: spaceEvents }) => (
          <Card
            key={space.id}
            className={cn(
              "border-border/20 bg-background/40 backdrop-blur-sm transition-all hover:shadow-lg",
              spaceEvents.length === 0 && "opacity-60",
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {getSpaceIcon(space.type)}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-foreground">
                      {space.name}
                    </CardTitle>
                    <div className="flex items-center gap-3 mt-1 text-xs text-foreground/60">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        Capacity: {space.capacity}
                      </span>
                      <span className="capitalize">{space.type}</span>
                    </div>
                  </div>
                </div>
                {spaceEvents.length > 0 && (
                  <Badge variant="outline" className="ml-auto">
                    {spaceEvents.length} event
                    {spaceEvents.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {spaceEvents.length > 0 ? (
                <div className="space-y-3">
                  {spaceEvents.map((event) => {
                    const isSelected = selectedEvent?.id === event.id;
                    const guestCountRatio =
                      event.guestCountCurrent / event.guestCountExpected;
                    const isBelowExpected = guestCountRatio < 0.9;

                    return (
                      <div
                        key={event.id}
                        onClick={() => onSelectEvent?.(event)}
                        className={cn(
                          "p-4 rounded-lg border transition-all cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border/20 bg-background/60 hover:border-primary/30 hover:bg-background/80",
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">
                                {event.name}
                              </h3>
                              <Badge
                                className={cn(
                                  "text-xs font-medium",
                                  getEventStatusColor(event.status),
                                )}
                              >
                                {event.status.charAt(0).toUpperCase() +
                                  event.status.slice(1)}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-foreground/70">
                              <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-foreground/50" />
                                <span>
                                  {event.guestCountCurrent} /{" "}
                                  {event.guestCountExpected} guests
                                </span>
                                {isBelowExpected && (
                                  <span className="flex items-center gap-1 text-amber-600">
                                    <TrendingDown className="w-3.5 h-3.5" />
                                    <span className="text-xs">
                                      Below expected
                                    </span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-foreground/50" />
                                <span>{formatTime(event.startDateTime)}</span>
                              </div>
                              <div className="text-xs text-foreground/50">
                                {formatDate(event.startDateTime)}
                              </div>
                            </div>

                            {event.departmentIds &&
                              event.departmentIds.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-foreground/60">
                                    Departments:
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {event.departmentIds.map((dept) => (
                                      <Badge
                                        key={dept}
                                        variant="outline"
                                        className="text-xs bg-background/40"
                                      >
                                        {dept}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Calendar className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-foreground/60">
                    No events scheduled for this space
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
