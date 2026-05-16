import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertCircle,
  Calendar as CalendarIcon,
} from "lucide-react";
import { CreateEventModal } from "../components/CreateEventModal";

type CalendarCellEvent = {
  id: string;
  date: number;
  title: string;
  type: "confirmed" | "potential";
  guests?: number;
  revenue?: number;
  riskLevel?: "low" | "medium" | "high";
  status?: string;
};

function getOrgIdForRequest(): string {
  if (typeof window === "undefined") return "default";
  const orgRaw = localStorage.getItem("auth_org");
  if (orgRaw) {
    try {
      const parsed = JSON.parse(orgRaw);
      const id = String(parsed?.id || "").trim();
      if (id) return id;
    } catch {
      // ignore
    }
  }
  const userRaw = localStorage.getItem("auth_user");
  if (userRaw) {
    try {
      const parsed = JSON.parse(userRaw);
      const id = String(parsed?.org_id || "").trim();
      if (id) return id;
    } catch {
      // ignore
    }
  }
  return "default";
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarCellEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const fetchMonth = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const monthStart = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth(),
          1,
        );
        const monthEnd = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1,
          0,
        );

        const response = await fetch(
          `/api/calendar/events?date_from=${monthStart.toISOString()}&date_to=${monthEnd.toISOString()}`,
          { headers: { "X-Org-ID": getOrgIdForRequest() } },
        );
        if (!response.ok)
          throw new Error(`Failed to fetch events (${response.status})`);
        const data = await response.json();
        const list = Array.isArray(data?.data?.events) ? data.data.events : [];

        const mapped: CalendarCellEvent[] = list
          .map((e: any) => {
            const dateIso = String(
              e.date || (e.start_time ? String(e.start_time).slice(0, 10) : ""),
            );
            const day = dateIso ? new Date(dateIso).getDate() : NaN;
            if (!Number.isFinite(day)) return null;
            const status = String(e.status || "pending");
            const type: CalendarCellEvent["type"] =
              status === "possible" ? "potential" : "confirmed";
            return {
              id: e.id,
              date: day,
              title: String(e.title || "Untitled"),
              type,
              guests: Number(e.guest_count || 0),
              revenue: Number(e.revenue || 0),
              status,
            } as CalendarCellEvent;
          })
          .filter(Boolean) as CalendarCellEvent[];

        setEvents(mapped);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch events");
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMonth();
  }, [currentMonth]);

  const eventsByDate = useMemo(() => {
    return events.reduce(
      (acc, event) => {
        if (!acc[event.date]) acc[event.date] = [];
        acc[event.date].push(event);
        return acc;
      },
      {} as Record<number, CalendarCellEvent[]>,
    );
  }, [events]);

  const monthName = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate();
  const firstDay = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1,
  ).getDay();

  const days: Array<number | null> = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const typeColors = {
    confirmed: "bg-green-500/10 text-green-600 border-green-500/20",
    potential: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Calendar</h1>
            <p className="text-muted-foreground">
              Centralized scheduling from `calendar_events`.
            </p>
          </div>
          <Button
            className="shadow-glow"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> New Event
          </Button>
        </div>

        <CreateEventModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onEventCreated={() => {
            // re-fetch by changing month state (force effect run)
            setCurrentMonth((d) => new Date(d));
          }}
        />

        {error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{monthName}</h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentMonth(
                          new Date(
                            currentMonth.getFullYear(),
                            currentMonth.getMonth() - 1,
                          ),
                        )
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentMonth(
                          new Date(
                            currentMonth.getFullYear(),
                            currentMonth.getMonth() + 1,
                          ),
                        )
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="text-center text-sm font-semibold text-muted-foreground py-2"
                      >
                        {day}
                      </div>
                    ),
                  )}
                </div>

                {isLoading ? (
                  <div className="py-10 text-center text-muted-foreground">
                    Loading…
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-2">
                    {days.map((day, index) => {
                      const dayEvents = day ? eventsByDate[day] || [] : [];
                      const hasPotential = dayEvents.some(
                        (e) => e.type === "potential",
                      );
                      const hasConfirmed = dayEvents.some(
                        (e) => e.type === "confirmed",
                      );
                      return (
                        <div
                          key={index}
                          className={`min-h-24 p-2 rounded-lg border ${
                            day
                              ? dayEvents.length > 0
                                ? hasPotential
                                  ? "bg-amber-500/5 border-amber-500/30"
                                  : hasConfirmed
                                    ? "bg-green-500/5 border-green-500/30"
                                    : "border-border"
                                : "border-border hover:bg-muted/30"
                              : "bg-muted/20 border-muted"
                          }`}
                        >
                          {day ? (
                            <div>
                              <p className="font-semibold text-sm mb-1">
                                {day}
                              </p>
                              {dayEvents.length > 0 ? (
                                <div className="text-xs space-y-1">
                                  {dayEvents.slice(0, 2).map((event) => (
                                    <div key={event.id}>
                                      <p className="font-medium truncate text-xs">
                                        {event.title}
                                      </p>
                                      <Badge
                                        className={typeColors[event.type]}
                                        variant="outline"
                                      >
                                        {event.type === "potential"
                                          ? "Possible"
                                          : "Confirmed"}
                                      </Badge>
                                    </div>
                                  ))}
                                  {dayEvents.length > 2 ? (
                                    <p className="text-xs text-muted-foreground">
                                      +{dayEvents.length - 2} more
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Events This Month</CardTitle>
                <CardDescription>{monthName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : events.length === 0 ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" /> No events this month
                  </div>
                ) : (
                  events.slice(0, 6).map((event) => (
                    <div
                      key={event.id}
                      className="pb-4 border-b border-border last:border-0"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-semibold text-sm">{event.title}</p>
                        <Badge
                          className={typeColors[event.type]}
                          variant="outline"
                        >
                          {event.type === "potential"
                            ? "Possible"
                            : "Confirmed"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Day {event.date}
                        {event.guests ? ` • ${event.guests} guests` : ""}
                        {event.revenue
                          ? ` • $${Math.round(event.revenue).toLocaleString()}`
                          : ""}
                      </p>
                      {event.status === "conflict" ? (
                        <p className="text-xs flex items-center gap-1 mt-1 text-red-600">
                          <AlertCircle className="h-3 w-3" /> Conflict
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Total Events
                  </span>
                  <span className="font-semibold">{events.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Possible
                  </span>
                  <span className="font-semibold">
                    {events.filter((e) => e.type === "potential").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Total Guests
                  </span>
                  <span className="font-semibold">
                    {events.reduce((sum, e) => sum + (e.guests || 0), 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Total Revenue
                  </span>
                  <span className="font-semibold">
                    $
                    {Math.round(
                      events.reduce((sum, e) => sum + (e.revenue || 0), 0),
                    ).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
