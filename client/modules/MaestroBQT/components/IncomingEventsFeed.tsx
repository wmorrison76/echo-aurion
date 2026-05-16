/**
 * Incoming Events Feed Component - Enhanced UI/UX
 * Professional event feed display
 */

import React from "react";
import { Calendar, Bell, Clock, Users, ArrowRight } from "lucide-react";
import { osBus } from "@/lib/os-bus";
import type { Event } from "../types";
import { cn } from "@/lib/glass";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function IncomingEventsFeed() {
  const [events, setEvents] = React.useState<Event[]>([]);

  React.useEffect(() => {
    const toMaestroEvent = (raw: any): Event | null => {
      if (!raw || typeof raw !== "object") return null;
      const id = String(raw.id ?? raw.eventId ?? raw.event_id ?? "").trim();
      if (!id) return null;

      const name =
        String(raw.title ?? raw.name ?? raw.eventName ?? "").trim() ||
        `event-${id}`;
      const startDateTime = String(
        raw.start_time ?? raw.startDateTime ?? raw.start ?? "",
      ).trim();
      const endDateTime = String(
        raw.end_time ?? raw.endDateTime ?? raw.end ?? "",
      ).trim();

      const guestCountRaw =
        raw.guest_count ??
        raw.guestCountExpected ??
        raw.guestCount ??
        raw.capacity ??
        0;
      const guestCount = Math.max(
        0,
        Number.isFinite(Number(guestCountRaw)) ? Number(guestCountRaw) : 0,
      );

      const statusRaw = String(raw.status ?? "")
        .toLowerCase()
        .trim();
      const status: Event["status"] =
        statusRaw === "possible"
          ? "tentative"
          : statusRaw === "pending"
            ? "definite"
            : statusRaw === "tentative" ||
                statusRaw === "definite" ||
                statusRaw === "in_house" ||
                statusRaw === "completed"
              ? (statusRaw as Event["status"])
              : statusRaw === "cancelled" || statusRaw === "canceled"
                ? "canceled"
                : "definite";

      return {
        id,
        name,
        status,
        guestCountCurrent: guestCount,
        guestCountExpected: guestCount,
        startDateTime,
        endDateTime,
        spaceIds: [],
        departmentIds: [],
        metadata: { source: "osbus/calendar", raw },
      };
    };

    const handleCalendarCreated = (payload: any) => {
      const raw = payload?.event;
      if (!raw) return;
      const evt = toMaestroEvent(raw);
      if (!evt) return;
      setEvents((prev) => [evt, ...prev].slice(0, 10));
    };

    const unsubCreated = osBus.on(
      "calendar:event_created",
      handleCalendarCreated,
    );

    const handleEchoEventCreated = (evt: Event) => {
      const ce = evt as unknown as CustomEvent<any>;
      const raw = ce?.detail?.event ?? ce?.detail;
      const parsed = toMaestroEvent(raw);
      if (!parsed) return;
      setEvents((prev) => [parsed, ...prev].slice(0, 10));
    };

    window.addEventListener(
      "echo-event-created",
      handleEchoEventCreated as EventListener,
    );

    return () => {
      unsubCreated();
      window.removeEventListener(
        "echo-event-created",
        handleEchoEventCreated as EventListener,
      );
    };
  }, []);

  const formatTime = (dateTime: string): string => {
    try {
      const date = new Date(dateTime);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString();
    } catch {
      return "—";
    }
  };

  const getStatusColor = (status: Event["status"]) => {
    switch (status) {
      case "definite":
        return "bg-blue-500/10 text-blue-700 border-blue-500/30";
      case "tentative":
        return "bg-amber-500/10 text-amber-700 border-amber-500/30";
      case "in_house":
        return "bg-green-500/10 text-green-700 border-green-500/30";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-500/30";
    }
  };

  return (
    <Card className="border-border/20 bg-background/40 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-foreground">
              Maestro Incoming Events
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Auto-receives events from EchoEventStudio via OSBus
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-3 rounded-lg border border-border/20 bg-background/60 hover:bg-background/80 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-foreground truncate">
                      {event.name}
                    </h4>
                    <Badge
                      className={cn(
                        "text-xs mt-1",
                        getStatusColor(event.status),
                      )}
                    >
                      {event.status.charAt(0).toUpperCase() +
                        event.status.slice(1)}
                    </Badge>
                  </div>
                  <span className="text-xs text-foreground/50 whitespace-nowrap">
                    {formatTime(event.startDateTime)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-foreground/70">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{event.guestCountCurrent} guests</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {new Date(event.startDateTime).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Calendar className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-foreground/60 mb-1">
              No events received yet
            </p>
            <p className="text-xs text-foreground/50">
              Create an event in EchoEventStudio to test
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
