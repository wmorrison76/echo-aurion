import React, { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Zap,
  AlertCircle,
  RefreshCw,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/glass";
import { CalendarEvent, CalendarOutlet } from "@/types/calendar";

interface TodaysEventsWidgetProps {
  minimized?: boolean;
}

export function TodaysEventsWidget({
  minimized = false,
}: TodaysEventsWidgetProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [outlets, setOutlets] = useState<CalendarOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openEventModal, setOpenEventModal] = useState(false);

  // Fetch outlets
  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const response = await fetch("/api/calendar/outlets");
        if (!response.ok) throw new Error("Failed to fetch outlets");
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          // Dev stub may return HTML; treat as empty
          setOutlets([]);
          return;
        }
        const data = await response.json();
        setOutlets(data.outlets || []);
      } catch {
        setOutlets([]);
      }
    };

    fetchOutlets();
  }, []);

  // Fetch today's events
  const fetchTodaysEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split("T")[0];
      const params = new URLSearchParams({
        start_date: today,
        end_date: today,
      });

      // Include all outlets if available
      if (outlets.length > 0) {
        params.append("outlet_ids", outlets.map((o) => o.id).join(","));
      }

      const response = await fetch(`/api/calendar/events?${params}`);
      if (!response.ok) throw new Error("Failed to fetch events");
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        setEvents([]);
        return;
      }
      const data = await response.json();
      setEvents((data.events || []).slice(0, 5));
    } catch {
      setError(null);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (outlets.length > 0) {
      fetchTodaysEvents();
    }
  }, [outlets]);

  const getOutletColor = (outletId: string) => {
    const outlet = outlets.find((o) => o.id === outletId);
    return outlet?.color || "#3b82f6";
  };

  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800";
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
      case "conflict":
        return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800";
      case "locked":
        return "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      default:
        return "bg-slate-100 dark:bg-slate-900/20 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-800";
    }
  };

  if (minimized) {
    return (
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 h-full">
        <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
          <Calendar size={24} className="text-slate-400 mb-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {events.length} events today
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 h-full flex flex-col">
      <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Today's Events
            </h3>
          </div>
          <button
            onClick={() => fetchTodaysEvents()}
            disabled={loading}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors disabled:opacity-50"
            title="Refresh events"
          >
            <RefreshCw size={16} className={cn(loading && "animate-spin")} />
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && (
          <div className="flex items-center justify-center h-24">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Loading events...
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 text-center">
            <Calendar size={20} className="text-slate-300 mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No events today
            </p>
          </div>
        )}

        {events.map((event) => (
          <div
            key={event.id}
            className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
          >
            {/* Event Title & Status */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:underline">
                  {event.title}
                </p>
              </div>
              {event.status && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs px-1.5 py-0.5 flex-shrink-0",
                    getStatusBadgeColor(event.status),
                  )}
                >
                  {event.status}
                </Badge>
              )}
            </div>

            {/* Outlet Color Indicator & Time */}
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-1">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: getOutletColor(event.outlet_id) }}
              />
              {event.start_time && (
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>
                    {event.start_time.substring(0, 5)}
                    {event.end_time && ` - ${event.end_time.substring(0, 5)}`}
                  </span>
                </div>
              )}
            </div>

            {/* Location & Guest Count */}
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              {event.location_room && (
                <div className="flex items-center gap-1">
                  <MapPin size={12} />
                  <span className="truncate">{event.location_room}</span>
                </div>
              )}
              {event.guest_count && (
                <div className="flex items-center gap-1">
                  <Users size={12} />
                  <span>{event.guest_count}</span>
                </div>
              )}
            </div>

            {/* Conflict Indicator */}
            {event.status === "conflict" && (
              <div className="flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-400">
                <AlertCircle size={12} />
                <span>Conflict detected</span>
              </div>
            )}
          </div>
        ))}
      </CardContent>

      {/* Footer: Quick Actions */}
      {!loading && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-3 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-7"
            onClick={() => setOpenEventModal(true)}
          >
            <Plus size={12} className="mr-1" />
            Add Event
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-7"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("open-global-calendar", {
                  detail: { date: new Date().toISOString().split("T")[0] },
                }),
              );
            }}
          >
            <Calendar size={12} className="mr-1" />
            View All
          </Button>
        </div>
      )}
    </Card>
  );
}
