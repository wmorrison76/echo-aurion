import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Plus, Search } from "lucide-react";
import { ReoGenerationFlow } from "../components/ReoGenerationFlow";
import type { BEODocumentStatus } from "@/../shared/types/beo";
import { listReos, setReoApproval } from "@/lib/reo-store";
import { osBus } from "@/lib/os-bus";

type CalendarEventLite = {
  id: string;
  title: string;
  date?: string;
  start_time?: string;
  guest_count?: number;
  location_room?: string;
  event_type_code?: string;
  outlet_id?: string;
  outlet_name?: string;
  department?: string;
  status?: string;
};

function safeDateFromIso(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function statusBadgeClass(status: BEODocumentStatus): string {
  switch (status) {
    case "Draft":
      return "bg-surface/10 text-muted-foreground border-gray-500/20";
    case "Confirmed":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "Revised":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "Cancelled":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    case "Closed":
      return "bg-slate-500/10 text-muted-foreground border-slate-500/20";
    default:
      return "bg-surface/10 text-muted-foreground border-gray-500/20";
  }
}

export default function ReoPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | BEODocumentStatus
  >("all");

  const [isSelectingEvent, setIsSelectingEvent] = React.useState(false);
  const [isGeneratingReo, setIsGeneratingReo] = React.useState(false);
  const [selectedEventForReo, setSelectedEventForReo] =
    React.useState<any>(null);

  const [events, setEvents] = React.useState<CalendarEventLite[]>([]);
  const [eventsError, setEventsError] = React.useState<string | null>(null);

  const [manualEvent, setManualEvent] = React.useState({
    title: "",
    date: new Date().toISOString().slice(0, 10),
    guestCount: 40,
    venue: "Outlet Dining",
    outletId: "outlet-1",
    outletName: "Main Restaurant",
  });

  const [docs, setDocs] = React.useState(() => listReos());

  const refreshDocs = React.useCallback(() => setDocs(listReos()), []);

  React.useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (String(e.key || "").includes("luccca.reo.docs")) refreshDocs();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [refreshDocs]);

  const filteredDocs = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return docs.filter((d) => {
      const matchesSearch =
        q.length === 0 ||
        d.title.toLowerCase().includes(q) ||
        d.beoNumber.toLowerCase().includes(q) ||
        String(d.outletName || "")
          .toLowerCase()
          .includes(q);
      const matchesStatus = statusFilter === "all" || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [docs, searchQuery, statusFilter]);

  const stats = React.useMemo(() => {
    return {
      total: docs.length,
      draft: docs.filter((b) => b.status === "Draft").length,
      revised: docs.filter((b) => b.status === "Revised").length,
      confirmed: docs.filter((b) => b.status === "Confirmed").length,
    };
  }, [docs]);

  const getOrgIdForRequest = React.useCallback((): string => {
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
    return "default";
  }, []);

  React.useEffect(() => {
    const fetchEvents = async () => {
      setEventsError(null);
      try {
        const response = await fetch("/api/calendar/events", {
          headers: { "X-Org-ID": getOrgIdForRequest() },
        });
        if (!response.ok)
          throw new Error(`Failed to fetch events (${response.status})`);
        const data = await response.json();
        const list = Array.isArray(data?.data?.events)
          ? (data.data.events as CalendarEventLite[])
          : [];
        setEvents(list);
      } catch (err) {
        setEvents([]);
        setEventsError(
          err instanceof Error ? err.message : "Failed to fetch events",
        );
      }
    };
    if (isSelectingEvent) void fetchEvents();
  }, [getOrgIdForRequest, isSelectingEvent]);

  const handleGenerateReoClick = React.useCallback(
    () => setIsSelectingEvent(true),
    [],
  );

  const handleEventSelectedForReo = React.useCallback(
    (event: CalendarEventLite) => {
      setSelectedEventForReo({
        id: event.id,
        title: event.title,
        guestCount: event.guest_count || 0,
        date:
          event.date ||
          safeDateFromIso(String(event.start_time || "")) ||
          new Date().toISOString().slice(0, 10),
        venue: event.location_room || "Outlet Dining",
        eventTypeCode: event.event_type_code || "RES",
        eventType: event.department || "Restaurant",
        outletId: event.outlet_id,
        outletName: event.outlet_name,
      });
      setIsSelectingEvent(false);
      setIsGeneratingReo(true);
    },
    [],
  );

  const handleManualEventContinue = React.useCallback(() => {
    if (!manualEvent.title.trim()) return;
    setSelectedEventForReo({
      id: `manual-${Date.now()}`,
      title: manualEvent.title.trim(),
      guestCount: Number(manualEvent.guestCount) || 0,
      date: manualEvent.date,
      venue: manualEvent.venue || "Outlet Dining",
      eventTypeCode: "RES",
      eventType: "Restaurant",
      outletId: manualEvent.outletId,
      outletName: manualEvent.outletName,
    });
    setIsSelectingEvent(false);
    setIsGeneratingReo(true);
  }, [manualEvent]);

  const handleReoGenerated = React.useCallback(() => {
    setIsGeneratingReo(false);
    setSelectedEventForReo(null);
    refreshDocs();
  }, [refreshDocs]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {isSelectingEvent ? (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <Card className="w-full max-w-2xl mx-4">
              <CardHeader>
                <CardTitle>Select Event for REO Generation</CardTitle>
                <CardDescription>
                  Pick an event or create a manual outlet REO.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {events.length > 0 ? (
                  events.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => handleEventSelectedForReo(event)}
                      className="p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{event.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {event.date ||
                              safeDateFromIso(String(event.start_time || "")) ||
                              "—"}{" "}
                            • {event.guest_count || 0} guests
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {event.location_room || "Outlet Dining"}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {event.status === "pending"
                            ? "Confirmed"
                            : "Possible"}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-3">
                    {eventsError ? (
                      <div className="p-3 rounded-md border border-amber-500/25 bg-amber-500/10 text-sm text-amber-700 dark:text-amber-300">
                        Calendar unavailable: {eventsError}. Use manual details
                        below.
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No events found. Use manual details below.
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          Event title
                        </div>
                        <Input
                          value={manualEvent.title}
                          onChange={(e) =>
                            setManualEvent((p) => ({
                              ...p,
                              title: e.target.value,
                            }))
                          }
                          placeholder="e.g., Chef Tasting"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          Date
                        </div>
                        <Input
                          type="date"
                          value={manualEvent.date}
                          onChange={(e) =>
                            setManualEvent((p) => ({
                              ...p,
                              date: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          Guest count
                        </div>
                        <Input
                          type="number"
                          min="0"
                          value={String(manualEvent.guestCount)}
                          onChange={(e) =>
                            setManualEvent((p) => ({
                              ...p,
                              guestCount: Number(e.target.value || 0),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          Outlet
                        </div>
                        <Input
                          value={manualEvent.outletName}
                          onChange={(e) =>
                            setManualEvent((p) => ({
                              ...p,
                              outletName: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleManualEventContinue}
                      disabled={!manualEvent.title.trim()}
                    >
                      Continue with manual outlet
                    </Button>
                  </div>
                )}
              </CardContent>
              <div className="flex gap-2 justify-end border-t p-4">
                <Button
                  variant="outline"
                  onClick={() => setIsSelectingEvent(false)}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        ) : null}

        {selectedEventForReo ? (
          <ReoGenerationFlow
            event={selectedEventForReo}
            isOpen={isGeneratingReo}
            onClose={() => {
              setIsGeneratingReo(false);
              setSelectedEventForReo(null);
            }}
            onReoGenerated={handleReoGenerated}
          />
        ) : null}

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">REO / Outlet Orders</h1>
            <p className="text-muted-foreground">
              Restaurant Event Orders by outlet and daypart.
            </p>
          </div>
          <Button className="shadow-glow" onClick={handleGenerateReoClick}>
            <Plus className="h-4 w-4 mr-2" /> Generate REO
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total REOs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All documents</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draft}</div>
              <p className="text-xs text-muted-foreground">Building</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revised</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.revised}</div>
              <p className="text-xs text-muted-foreground">
                Changed since issue
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.confirmed}
              </div>
              <p className="text-xs text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by REO #, event name, or outlet…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as any)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Revised">Revised</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {filteredDocs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <div className="text-sm font-semibold">
                No REO documents found
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Generate your first REO to populate this list.
              </div>
              <div className="mt-4">
                <Button size="sm" onClick={handleGenerateReoClick}>
                  <Plus className="h-4 w-4 mr-2" /> Generate REO
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDocs.map((reo) => {
              const date =
                safeDateFromIso(reo.start) ||
                safeDateFromIso(reo.updatedAt) ||
                "—";
              const guests = Number(reo.gtd ?? reo.exp ?? 0);
              const perPerson = Number(reo.menu?.perPersonPrice ?? 0);
              const value =
                perPerson > 0 && guests > 0 ? perPerson * guests : 0;
              const approval = reo.approvalStatus || "pending";
              return (
                <Card
                  key={reo.beoId}
                  className="hover:shadow-lg transition-all duration-200"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className="font-mono text-xs"
                          >
                            {reo.beoNumber}
                          </Badge>
                          <h3 className="font-semibold text-lg truncate">
                            {reo.title}
                          </h3>
                          <Badge className={statusBadgeClass(reo.status)}>
                            {reo.status}
                          </Badge>
                          <Badge
                            variant={
                              approval === "approved"
                                ? "secondary"
                                : approval === "rejected"
                                  ? "destructive"
                                  : "outline"
                            }
                          >
                            {approval}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-muted-foreground mt-4">
                          <div>
                            <p className="font-medium text-foreground">
                              Outlet
                            </p>
                            <p className="truncate">{reo.outletName || "—"}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Date</p>
                            <p>{date}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              Guests
                            </p>
                            <p>{guests || "—"}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              Location
                            </p>
                            <p className="truncate">{reo.room || "—"}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Value</p>
                            <p className="text-green-600 font-semibold">
                              {value ? `$${value.toLocaleString()}` : "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        {approval === "pending" ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                const updated = setReoApproval(reo.beoId, {
                                  by: "manager",
                                  status: "approved",
                                });
                                if (updated) {
                                  osBus.emit("beo:updated", {
                                    beoId: updated.beoId,
                                    eventId: updated.eventId,
                                    source: "EchoEventStudio",
                                  });
                                }
                                refreshDocs();
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const updated = setReoApproval(reo.beoId, {
                                  by: "manager",
                                  status: "rejected",
                                });
                                if (updated) {
                                  osBus.emit("beo:updated", {
                                    beoId: updated.beoId,
                                    eventId: updated.eventId,
                                    source: "EchoEventStudio",
                                  });
                                }
                                refreshDocs();
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
