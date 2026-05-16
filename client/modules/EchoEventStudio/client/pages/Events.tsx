import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateEventModal } from "../components/CreateEventModal";
import {
  Calendar,
  Plus,
  Search,
  MapPin,
  Users,
  DollarSign,
  Clock,
  RefreshCw,
  Loader2,
} from "lucide-react";

type CalendarEvent = {
  id: string;
  title: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  location_room?: string;
  guest_count?: number;
  revenue?: number;
  status?: string;
  department?: string;
  contact_person?: string;
  notes?: string;
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

export default function EventsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) || null,
    [events, selectedEventId],
  );

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/calendar/events", {
        headers: { "X-Org-ID": getOrgIdForRequest() },
      });
      if (!response.ok)
        throw new Error(`Failed to fetch events (${response.status})`);
      const data = await response.json();
      const list = Array.isArray(data?.data?.events)
        ? (data.data.events as CalendarEvent[])
        : [];
      setEvents(list);
      if (selectedEventId && !list.some((e) => e.id === selectedEventId)) {
        setSelectedEventId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch events");
      setEvents([]);
      setSelectedEventId(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const handleCreated = (evt: Event) => {
      const ce = evt as CustomEvent<any>;
      const created = ce?.detail?.event || ce?.detail;
      if (created?.id) {
        fetchEvents();
        setSelectedEventId(created.id);
      }
    };
    window.addEventListener(
      "echo-event-created",
      handleCreated as EventListener,
    );
    return () =>
      window.removeEventListener(
        "echo-event-created",
        handleCreated as EventListener,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((e) => {
      const matchesSearch =
        q.length === 0 ||
        String(e.title || "")
          .toLowerCase()
          .includes(q) ||
        String(e.location_room || "")
          .toLowerCase()
          .includes(q);
      const matchesStatus =
        statusFilter === "all" || String(e.status || "") === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [events, searchQuery, statusFilter]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) if (e.status) set.add(String(e.status));
    return Array.from(set).sort();
  }, [events]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Events</h1>
            <p className="text-muted-foreground">
              Calendar events with org isolation and conflict detection.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={fetchEvents}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            <Button
              className="shadow-glow"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
        </div>

        <CreateEventModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onEventCreated={(event) => {
            if (event?.id) setSelectedEventId(event.id);
          }}
        />

        {error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search events..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <Card>
                <CardContent className="p-12 flex flex-col items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                  <p className="text-muted-foreground">Loading events…</p>
                </CardContent>
              </Card>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="p-12 flex flex-col items-center justify-center">
                  <Calendar className="h-10 w-10 text-muted-foreground mb-2 opacity-60" />
                  <p className="text-muted-foreground">No events found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((event) => {
                  const active = event.id === selectedEventId;
                  return (
                    <Card
                      key={event.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${active ? "ring-2 ring-primary" : ""}`}
                      onClick={() => setSelectedEventId(event.id)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg truncate">
                                {event.title}
                              </h3>
                              <Badge variant="outline">
                                {event.status || "pending"}
                              </Badge>
                            </div>
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span className="truncate">
                                  {event.date ||
                                    (event.start_time
                                      ? event.start_time.slice(0, 10)
                                      : "—")}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span className="truncate">
                                  {event.start_time
                                    ? new Date(
                                        event.start_time,
                                      ).toLocaleTimeString()
                                    : "—"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span className="truncate">
                                  {event.location_room || "TBA"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                <span>{event.guest_count || 0}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <div className="flex items-center justify-end gap-2">
                              <DollarSign className="h-4 w-4" />
                              <span>
                                $
                                {Math.round(
                                  Number(event.revenue || 0),
                                ).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-xs mt-1">
                              {event.department || "Events"}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
                <CardDescription>
                  Live data from `calendar_events`.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!selectedEvent ? (
                  <div className="text-sm text-muted-foreground">
                    Select an event to view details.
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="text-lg font-semibold">
                        {selectedEvent.title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedEvent.notes || "—"}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Date
                        </div>
                        <div>
                          {selectedEvent.date ||
                            (selectedEvent.start_time
                              ? selectedEvent.start_time.slice(0, 10)
                              : "—")}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Status
                        </div>
                        <div>{selectedEvent.status || "pending"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Room
                        </div>
                        <div>{selectedEvent.location_room || "TBA"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Guests
                        </div>
                        <div>{selectedEvent.guest_count || 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Revenue
                        </div>
                        <div>
                          $
                          {Math.round(
                            Number(selectedEvent.revenue || 0),
                          ).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Contact
                        </div>
                        <div>{selectedEvent.contact_person || "—"}</div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
