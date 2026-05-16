import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { maestroEventBus, EVENT_TYPES } from "@/modules/MaestroBQT/event-bus";
import { useMultiOutlet } from "@/modules/PurchasingReceiving/client/context/MultiOutletContext";
import { addDays, format, formatDistanceToNow, parseISO } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  CheckCircle2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

interface WaitlistPanelProps {
  onClose?: () => void;
  onMinimize?: () => void;
}

type WaitlistStatus = "waiting" | "notified" | "converted" | "cancelled";
type ClientValue = "low" | "medium" | "high" | "premium";

interface WaitlistEntry {
  id: string;
  outletId: string;
  outletName: string;
  clientName: string;
  contactEmail: string;
  contactPhone?: string;
  company?: string;
  eventType: string;
  preferredDate: string; // yyyy-MM-dd
  guestCount: number;
  estimatedBudget?: number;
  priority: number;
  status: WaitlistStatus;
  addedAt: string; // ISO
  notifiedAt?: string; // ISO
  convertedAt?: string; // ISO
  clientValue: ClientValue;
  source: string;
}

function valueVariant(v: ClientValue): "default" | "secondary" | "outline" {
  if (v === "premium" || v === "high") return "default";
  if (v === "medium") return "secondary";
  return "outline";
}

function mockWaitlist(
  outlets: Array<{ id: string; name: string }>,
): WaitlistEntry[] {
  const eventTypes = [
    "wedding",
    "corporate",
    "banquet",
    "conference",
    "cocktail",
  ];
  const values: ClientValue[] = ["low", "medium", "high", "premium"];
  const statuses: WaitlistStatus[] = [
    "waiting",
    "waiting",
    "waiting",
    "notified",
    "converted",
  ];

  const list: WaitlistEntry[] = [];
  outlets.forEach((o, oi) => {
    for (let i = 0; i < 6 + oi * 2; i++) {
      const preferred = addDays(new Date(), 1 + Math.floor(Math.random() * 60));
      const status = statuses[i % statuses.length];
      list.push({
        id: `wait-${o.id}-${i}`,
        outletId: o.id,
        outletName: o.name,
        clientName: `Client ${i + 1}`,
        contactEmail: `client${i + 1}@example.com`,
        contactPhone:
          i % 2 === 0
            ? `+1 (555) ${Math.floor(Math.random() * 9000) + 1000}`
            : undefined,
        company: i % 3 === 0 ? `Company ${i + 1}` : undefined,
        eventType: eventTypes[i % eventTypes.length],
        preferredDate: format(preferred, "yyyy-MM-dd"),
        guestCount: 50 + Math.floor(Math.random() * 200),
        estimatedBudget: 6000 + Math.round(Math.random() * 24000),
        priority: 20 + Math.floor(Math.random() * 80),
        status,
        addedAt: new Date(Date.now() - i * 86_400_000).toISOString(),
        notifiedAt:
          status === "notified" || status === "converted"
            ? new Date(Date.now() - (i - 2) * 86_400_000).toISOString()
            : undefined,
        convertedAt:
          status === "converted"
            ? new Date(Date.now() - (i - 5) * 86_400_000).toISOString()
            : undefined,
        clientValue: values[i % values.length],
        source: ["website", "referral", "phone", "email"][i % 4],
      });
    }
  });
  return list;
}

export default function WaitlistManager(_props: WaitlistPanelProps) {
  const { toast } = useToast();
  const { outlets } = useMultiOutlet();

  const outletOptions = React.useMemo(() => {
    const fallback = [{ id: "main", name: "Main Outlet" }];
    return outlets?.length ? outlets : fallback;
  }, [outlets]);

  const [waitlist, setWaitlist] = React.useState<WaitlistEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const [filterOutlet, setFilterOutlet] = React.useState<string>("all");
  const [filterStatus, setFilterStatus] = React.useState<
    WaitlistStatus | "all"
  >("all");
  const [sortBy, setSortBy] = React.useState<"priority" | "date" | "value">(
    "priority",
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<
    "waiting" | "notified" | "converted" | "analytics"
  >("waiting");

  const [selectedEntry, setSelectedEntry] =
    React.useState<WaitlistEntry | null>(null);
  const [showNotifyDialog, setShowNotifyDialog] = React.useState(false);
  const [showConvertDialog, setShowConvertDialog] = React.useState(false);

  const load = React.useCallback(() => {
    setIsLoading(true);
    try {
      setWaitlist(mockWaitlist(outletOptions));
    } catch (e) {
      toast({
        title: "Error loading waitlist",
        description: e instanceof Error ? e.message : "Failed to load waitlist",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [outletOptions, toast]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    const unsubs = [
      maestroEventBus.subscribeTo(EVENT_TYPES.EVENT_CREATED, () => {
        // Future: auto-match availability -> notify
      }),
      maestroEventBus.subscribeTo(EVENT_TYPES.EVENT_DELETED, () => {
        // Future: auto-match availability -> notify
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const filtered = React.useMemo(() => {
    let list = waitlist;
    if (filterOutlet !== "all")
      list = list.filter((e) => e.outletId === filterOutlet);
    if (filterStatus !== "all")
      list = list.filter((e) => e.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.clientName.toLowerCase().includes(q) ||
          e.contactEmail.toLowerCase().includes(q) ||
          (e.company || "").toLowerCase().includes(q),
      );
    }
    list = [...list].sort((a, b) => {
      if (sortBy === "priority") return b.priority - a.priority;
      if (sortBy === "date")
        return (
          parseISO(a.preferredDate).getTime() -
          parseISO(b.preferredDate).getTime()
        );
      return (b.estimatedBudget || 0) - (a.estimatedBudget || 0);
    });
    return list;
  }, [filterOutlet, filterStatus, searchQuery, sortBy, waitlist]);

  const waitingEntries = React.useMemo(
    () => filtered.filter((e) => e.status === "waiting"),
    [filtered],
  );
  const notifiedEntries = React.useMemo(
    () => filtered.filter((e) => e.status === "notified"),
    [filtered],
  );
  const convertedEntries = React.useMemo(
    () => filtered.filter((e) => e.status === "converted"),
    [filtered],
  );

  const conversionRate = React.useMemo(() => {
    const total = waitlist.length;
    const converted = waitlist.filter((e) => e.status === "converted").length;
    return total > 0 ? (converted / total) * 100 : 0;
  }, [waitlist]);

  const adjustPriority = (id: string, dir: "up" | "down") => {
    setWaitlist((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              priority:
                dir === "up" ? e.priority + 10 : Math.max(0, e.priority - 10),
            }
          : e,
      ),
    );
  };

  const notifyClient = async (entry: WaitlistEntry) => {
    setWaitlist((prev) =>
      prev.map((e) =>
        e.id === entry.id
          ? { ...e, status: "notified", notifiedAt: new Date().toISOString() }
          : e,
      ),
    );
    maestroEventBus.publish({
      type: "waitlist:notified",
      source: "Waitlist",
      payload: {
        waitlistId: entry.id,
        outletId: entry.outletId,
        clientName: entry.clientName,
        preferredDate: entry.preferredDate,
      },
    });
    toast({
      title: "Client notified",
      description: `${entry.clientName} notified of availability.`,
    });
    setShowNotifyDialog(false);
  };

  const convertEntry = async (entry: WaitlistEntry) => {
    setWaitlist((prev) =>
      prev.map((e) =>
        e.id === entry.id
          ? { ...e, status: "converted", convertedAt: new Date().toISOString() }
          : e,
      ),
    );
    maestroEventBus.publish({
      type: "waitlist:converted",
      source: "Waitlist",
      payload: {
        waitlistId: entry.id,
        outletId: entry.outletId,
        clientName: entry.clientName,
        eventType: entry.eventType,
        guestCount: entry.guestCount,
      },
    });
    toast({
      title: "Converted",
      description: `Converted ${entry.clientName} (wire to event creation next).`,
    });
    setShowConvertDialog(false);
  };

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="border-b border-border/30 p-4 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Waitlist Management
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Prioritize, notify, and convert inquiries
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-foreground">
                    {waitlist.length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Waiting</p>
                  <p className="text-2xl font-bold text-foreground">
                    {waitingEntries.length}
                  </p>
                </div>
                <Bell className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Notified</p>
                  <p className="text-2xl font-bold text-foreground">
                    {notifiedEntries.length}
                  </p>
                </div>
                <Bell className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Conversion</p>
                  <p className="text-2xl font-bold text-foreground">
                    {conversionRate.toFixed(1)}%
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select value={filterOutlet} onValueChange={setFilterOutlet}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Outlets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outlets</SelectItem>
              {outletOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as any)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="notified">Notified</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="value">Value</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="h-full flex flex-col"
        >
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="waiting">
              Waiting{" "}
              {waitingEntries.length ? (
                <Badge variant="secondary" className="ml-2">
                  {waitingEntries.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="notified">
              Notified{" "}
              {notifiedEntries.length ? (
                <Badge variant="default" className="ml-2">
                  {notifiedEntries.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="converted">Converted</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="waiting" className="flex-1 overflow-auto p-4">
            <Card>
              <CardHeader>
                <CardTitle>Waiting List</CardTitle>
                <CardDescription>
                  Top entries are highest priority
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Priority</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Guests</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitingEntries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>
                          <div className="flex flex-col items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => adjustPriority(e.id, "up")}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Badge variant="outline" className="text-xs">
                              {e.priority}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => adjustPriority(e.id, "down")}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{e.clientName}</div>
                            {e.company ? (
                              <div className="text-xs text-muted-foreground">
                                {e.company}
                              </div>
                            ) : null}
                            <div className="text-xs text-muted-foreground mt-1">
                              <Mail className="h-3 w-3 inline mr-1" />
                              {e.contactEmail}
                            </div>
                            {e.contactPhone ? (
                              <div className="text-xs text-muted-foreground">
                                <Phone className="h-3 w-3 inline mr-1" />
                                {e.contactPhone}
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">
                          {e.eventType}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>
                              {format(parseISO(e.preferredDate), "MMM d, yyyy")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(parseISO(e.preferredDate), {
                                addSuffix: true,
                              })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{e.guestCount}</TableCell>
                        <TableCell>
                          {(e.estimatedBudget || 0).toLocaleString("en-US", {
                            style: "currency",
                            currency: "USD",
                            minimumFractionDigits: 0,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={valueVariant(e.clientValue)}>
                            {e.clientValue}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedEntry(e);
                                setShowNotifyDialog(true);
                              }}
                            >
                              <Bell className="h-4 w-4 mr-2" />
                              Notify
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedEntry(e);
                                setShowConvertDialog(true);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Convert
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notified" className="flex-1 overflow-auto p-4">
            <Card>
              <CardHeader>
                <CardTitle>Notified</CardTitle>
                <CardDescription>
                  Clients notified of availability
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Notified</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifiedEntries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">
                          {e.clientName}
                        </TableCell>
                        <TableCell>
                          {format(parseISO(e.preferredDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {e.notifiedAt
                            ? format(parseISO(e.notifiedAt), "MMM d, h:mm a")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedEntry(e);
                              setShowConvertDialog(true);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Convert
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="converted" className="flex-1 overflow-auto p-4">
            <Card>
              <CardHeader>
                <CardTitle>Converted</CardTitle>
                <CardDescription>
                  Converted to bookings (event creation wiring pending)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Converted</TableHead>
                      <TableHead>Guests</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {convertedEntries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">
                          {e.clientName}
                        </TableCell>
                        <TableCell>
                          {format(parseISO(e.preferredDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {e.convertedAt
                            ? format(parseISO(e.convertedAt), "MMM d, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>{e.guestCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="flex-1 overflow-auto p-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Conversion</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Conversion rate
                    </p>
                    <p className="text-3xl font-bold">
                      {conversionRate.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Revenue potential
                    </p>
                    <p className="text-3xl font-bold">
                      {waitlist
                        .reduce((sum, e) => sum + (e.estimatedBudget || 0), 0)
                        .toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                          minimumFractionDigits: 0,
                        })}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Status breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Waiting</span>
                    <Badge variant="secondary">{waitingEntries.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Notified</span>
                    <Badge variant="default">{notifiedEntries.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Converted</span>
                    <Badge variant="default">{convertedEntries.length}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showNotifyDialog} onOpenChange={setShowNotifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notify Client</DialogTitle>
            <DialogDescription>
              Send availability notification
            </DialogDescription>
          </DialogHeader>
          {selectedEntry ? (
            <div className="space-y-3">
              <div>
                <Label>Client</Label>
                <p className="text-sm font-medium">
                  {selectedEntry.clientName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedEntry.contactEmail}
                </p>
              </div>
              <div>
                <Label>Preferred Date</Label>
                <p className="text-sm font-medium">
                  {format(
                    parseISO(selectedEntry.preferredDate),
                    "MMMM d, yyyy",
                  )}
                </p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNotifyDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedEntry && notifyClient(selectedEntry)}
            >
              <Bell className="h-4 w-4 mr-2" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Booking</DialogTitle>
            <DialogDescription>
              Convert waitlist entry to booking
            </DialogDescription>
          </DialogHeader>
          {selectedEntry ? (
            <div className="space-y-3">
              <div>
                <Label>Client</Label>
                <p className="text-sm font-medium">
                  {selectedEntry.clientName}
                </p>
              </div>
              <div>
                <Label>Event</Label>
                <p className="text-sm capitalize">
                  {selectedEntry.eventType} • {selectedEntry.guestCount} guests
                </p>
              </div>
              <div>
                <Label>Date</Label>
                <p className="text-sm font-medium">
                  {format(
                    parseISO(selectedEntry.preferredDate),
                    "MMMM d, yyyy",
                  )}
                </p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConvertDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedEntry && convertEntry(selectedEntry)}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Convert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
