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
import { BeoGenerationFlow } from "../components/BeoGenerationFlow";
import type { BEODocumentStatus } from "@/../shared/types/beo";
import { listBeos, setBeoApproval } from "@/lib/beo-store";
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

export default function BeoPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | BEODocumentStatus
  >("all");

  const [isSelectingEvent, setIsSelectingEvent] = React.useState(false);
  const [isGeneratingBeo, setIsGeneratingBeo] = React.useState(false);
  const [selectedEventForBeo, setSelectedEventForBeo] =
    React.useState<any>(null);

  const [events, setEvents] = React.useState<CalendarEventLite[]>([]);
  const [eventsError, setEventsError] = React.useState<string | null>(null);

  const [manualEvent, setManualEvent] = React.useState({
    title: "",
    date: new Date().toISOString().slice(0, 10),
    guestCount: 100,
    venue: "TBA",
    eventTypeCode: "OTH",
    outletId: "outlet-1",
    outletName: "Banquet Outlet",
  });

  const [docs, setDocs] = React.useState(() => listBeos());

  const refreshDocs = React.useCallback(() => setDocs(listBeos()), []);

  React.useEffect(() => {
    // Refresh if another tab writes a BEO
    const handler = (e: StorageEvent) => {
      if (String(e.key || "").includes("luccca.beo.docs")) refreshDocs();
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
        String(d.contacts?.primaryContactName || "")
          .toLowerCase()
          .includes(q) ||
        String(d.contacts?.primaryContactEmail || "")
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

  const handleGenerateBeoClick = React.useCallback(
    () => setIsSelectingEvent(true),
    [],
  );

  const handleEventSelectedForBeo = React.useCallback(
    (event: CalendarEventLite) => {
      setSelectedEventForBeo({
        id: event.id,
        title: event.title,
        guestCount: event.guest_count || 0,
        date:
          event.date ||
          safeDateFromIso(String(event.start_time || "")) ||
          new Date().toISOString().slice(0, 10),
        venue: event.location_room || "TBA",
        eventTypeCode: event.event_type_code || "OTH",
        eventType: event.department || "other",
        outletId: event.outlet_id,
        outletName: event.outlet_name,
      });
      setIsSelectingEvent(false);
      setIsGeneratingBeo(true);
    },
    [],
  );

  const handleManualEventContinue = React.useCallback(() => {
    if (!manualEvent.title.trim()) return;
    setSelectedEventForBeo({
      id: `manual-${Date.now()}`,
      title: manualEvent.title.trim(),
      guestCount: Number(manualEvent.guestCount) || 0,
      date: manualEvent.date,
      venue: manualEvent.venue || "TBA",
      eventTypeCode: manualEvent.eventTypeCode || "OTH",
      eventType: "Events",
      outletId: manualEvent.outletId,
      outletName: manualEvent.outletName,
    });
    setIsSelectingEvent(false);
    setIsGeneratingBeo(true);
  }, [manualEvent]);

  const handleBeoGenerated = React.useCallback(() => {
    setIsGeneratingBeo(false);
    setSelectedEventForBeo(null);
    refreshDocs();
  }, [refreshDocs]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {isSelectingEvent ? (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <Card className="w-full max-w-2xl mx-4">
              <CardHeader>
                <CardTitle>Select Event for BEO Generation</CardTitle>
                <CardDescription>
                  Pick an event, or create a manual BEO starter if calendar is
                  offline.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {events.length > 0 ? (
                  events.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => handleEventSelectedForBeo(event)}
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
                            {event.location_room || "TBA"}
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
                        Calendar is currently unavailable: {eventsError}. Use
                        manual event details below.
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No events found. Use manual event details below.
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
                          placeholder="e.g., Smith Wedding Reception"
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
                          Space / room
                        </div>
                        <Input
                          value={manualEvent.venue}
                          onChange={(e) =>
                            setManualEvent((p) => ({
                              ...p,
                              venue: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <div className="text-xs text-muted-foreground">
                          Event type code
                        </div>
                        <Select
                          value={manualEvent.eventTypeCode}
                          onValueChange={(v) =>
                            setManualEvent((p) => ({ ...p, eventTypeCode: v }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="WED">Wedding</SelectItem>
                            <SelectItem value="COR">Corporate</SelectItem>
                            <SelectItem value="BAN">Banquet</SelectItem>
                            <SelectItem value="SEM">Seminar</SelectItem>
                            <SelectItem value="OTH">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 md:col-span-2">
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
                          placeholder="Banquet outlet or venue"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleManualEventContinue}
                      disabled={!manualEvent.title.trim()}
                    >
                      Continue with manual event
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

        {selectedEventForBeo ? (
          <BeoGenerationFlow
            event={selectedEventForBeo}
            isOpen={isGeneratingBeo}
            onClose={() => {
              setIsGeneratingBeo(false);
              setSelectedEventForBeo(null);
            }}
            onBeoGenerated={handleBeoGenerated}
          />
        ) : null}

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">BEO/Contracts</h1>
            <p className="text-muted-foreground">
              Generate, manage, and execute Banquet Event Orders.
            </p>
          </div>
          <Button className="shadow-glow" onClick={handleGenerateBeoClick}>
            <Plus className="h-4 w-4 mr-2" /> Generate BEO
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total BEOs</CardTitle>
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
                  placeholder="Search by BEO #, event name, or contact…"
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
                No BEO documents found
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Generate your first BEO to populate this list.
              </div>
              <div className="mt-4">
                <Button size="sm" onClick={handleGenerateBeoClick}>
                  <Plus className="h-4 w-4 mr-2" /> Generate BEO
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDocs.map((beo) => {
              const date =
                safeDateFromIso(beo.start) ||
                safeDateFromIso(beo.updatedAt) ||
                "—";
              const guests = Number(beo.gtd ?? beo.exp ?? 0);
              const perPerson = Number(beo.menu?.perPersonPrice ?? 0);
              const value =
                perPerson > 0 && guests > 0 ? perPerson * guests : 0;
              const client =
                beo.contacts?.primaryContactName ||
                beo.contacts?.primaryContactEmail ||
                "—";
              const approval = beo.approvalStatus || "pending";
              return (
                <Card
                  key={beo.beoId}
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
                            {beo.beoNumber}
                          </Badge>
                          <h3 className="font-semibold text-lg truncate">
                            {beo.title}
                          </h3>
                          <Badge className={statusBadgeClass(beo.status)}>
                            {beo.status}
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
                              Client
                            </p>
                            <p className="truncate">{client}</p>
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
                            <p className="truncate">{beo.room || "—"}</p>
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
                                const updated = setBeoApproval(beo.beoId, {
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
                                const updated = setBeoApproval(beo.beoId, {
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
