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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { maestroEventBus, EVENT_TYPES } from "@/modules/MaestroBQT/event-bus";
import {
  AlertCircle,
  Bell,
  BellOff,
  Building2,
  CheckCircle2,
  Clock,
  Info,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

interface NotificationPanelProps {
  onClose?: () => void;
  onMinimize?: () => void;
}

export type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "event"
  | "system";
export type NotificationChannel = "in-app" | "email" | "sms" | "push";
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: string; // ISO
  read: boolean;
  source: string;
  channels: NotificationChannel[];
  category: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

interface NotificationPreferences {
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
  };
  batching: {
    enabled: boolean;
    batchWindowMinutes: number;
  };
}

const STORAGE_KEY = "luccca:notifications:v1";
const STORAGE_PREFS_KEY = "luccca:notification_prefs:v1";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  channels: { inApp: true, email: true, sms: false, push: true },
  quietHours: { enabled: true, start: "22:00", end: "08:00" },
  batching: { enabled: true, batchWindowMinutes: 15 },
};

function loadPrefs(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_PREFS_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return {
      ...DEFAULT_PREFERENCES,
      ...(JSON.parse(raw) as NotificationPreferences),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function savePrefs(p: NotificationPreferences) {
  try {
    localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

function loadNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Notification[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveNotifications(list: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 500)));
  } catch {
    // ignore
  }
}

function priorityVariant(
  priority: NotificationPriority,
): "destructive" | "default" | "secondary" | "outline" {
  if (priority === "urgent") return "destructive";
  if (priority === "high") return "default";
  if (priority === "normal") return "secondary";
  return "outline";
}

function iconForType(type: NotificationType) {
  if (type === "success")
    return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  if (type === "warning")
    return <AlertCircle className="h-5 w-5 text-amber-500" />;
  if (type === "error") return <AlertCircle className="h-5 w-5 text-red-500" />;
  if (type === "system")
    return <Settings2 className="h-5 w-5 text-muted-foreground" />;
  if (type === "event") return <Bell className="h-5 w-5 text-blue-500" />;
  return <Info className="h-5 w-5 text-blue-500" />;
}

export default function NotificationCenter(_props: NotificationPanelProps) {
  const { toast } = useToast();

  const [preferences, setPreferences] = React.useState<NotificationPreferences>(
    () => loadPrefs(),
  );
  const [notifications, setNotifications] = React.useState<Notification[]>(() =>
    loadNotifications(),
  );
  const [filterType, setFilterType] = React.useState<NotificationType | "all">(
    "all",
  );
  const [filterPriority, setFilterPriority] = React.useState<
    NotificationPriority | "all"
  >("all");
  const [filterRead, setFilterRead] = React.useState<"all" | "unread" | "read">(
    "all",
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showPreferences, setShowPreferences] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"all" | "unread">("all");

  React.useEffect(() => {
    savePrefs(preferences);
  }, [preferences]);

  React.useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const inQuietHours = React.useCallback((): boolean => {
    if (!preferences.quietHours.enabled) return false;
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const start = preferences.quietHours.start;
    const end = preferences.quietHours.end;
    if (start < end) return currentTime >= start && currentTime < end;
    return currentTime >= start || currentTime < end;
  }, [
    preferences.quietHours.enabled,
    preferences.quietHours.end,
    preferences.quietHours.start,
  ]);

  const addNotification = React.useCallback(
    (n: Notification) => {
      if (inQuietHours() && n.priority !== "urgent") return;

      setNotifications((prev) => {
        const nowMs = Date.now();
        if (preferences.batching.enabled) {
          const windowMs = preferences.batching.batchWindowMinutes * 60_000;
          const existing = prev.find(
            (x) =>
              x.category === n.category &&
              nowMs - parseISO(x.timestamp).getTime() < windowMs,
          );
          if (existing) {
            return prev.map((x) =>
              x.id === existing.id
                ? {
                    ...x,
                    message: `${x.message} (+1)`,
                    timestamp: n.timestamp,
                    read: false,
                    priority: n.priority,
                  }
                : x,
            );
          }
        }
        return [n, ...prev];
      });
    },
    [
      inQuietHours,
      preferences.batching.batchWindowMinutes,
      preferences.batching.enabled,
    ],
  );

  React.useEffect(() => {
    // Seed once from storage (already loaded in state init), then listen to MaestroBQT events.
    const unsubscribers = [
      maestroEventBus.subscribeTo(EVENT_TYPES.EVENT_CREATED, (payload: any) => {
        addNotification({
          id: `event-${payload?.eventId || Date.now()}`,
          type: "event",
          priority: "normal",
          title: "Event Created",
          message: payload?.message || "A new event was created",
          timestamp: new Date().toISOString(),
          read: false,
          source: "Calendar",
          channels: ["in-app", "email", "push"],
          category: "events",
          metadata: payload,
          actionUrl: "/events",
          actionLabel: "View Event",
        });
      }),
      maestroEventBus.subscribeTo(EVENT_TYPES.EVENT_UPDATED, (payload: any) => {
        addNotification({
          id: `event-upd-${payload?.eventId || Date.now()}`,
          type: "event",
          priority: "normal",
          title: "Event Updated",
          message: payload?.message || "An event was updated",
          timestamp: new Date().toISOString(),
          read: false,
          source: "Calendar",
          channels: ["in-app", "email"],
          category: "events",
          metadata: payload,
        });
      }),
      maestroEventBus.subscribeTo(
        EVENT_TYPES.BEO_DETAIL_CHANGED,
        (payload: any) => {
          addNotification({
            id: `beo-${payload?.beoId || Date.now()}`,
            type: "info",
            priority: "high",
            title: "BEO Updated",
            message: payload?.message || "A BEO was updated",
            timestamp: new Date().toISOString(),
            read: false,
            source: "BEO",
            channels: ["in-app", "email"],
            category: "beo",
            metadata: payload,
            actionUrl: "/beo",
            actionLabel: "View BEO",
          });
        },
      ),
      maestroEventBus.subscribeTo(
        EVENT_TYPES.SHORTAGE_DETECTED,
        (payload: any) => {
          addNotification({
            id: `shortage-${Date.now()}`,
            type: "error",
            priority: "urgent",
            title: "Urgent: Shortage Detected",
            message: payload?.message || "A shortage was detected",
            timestamp: new Date().toISOString(),
            read: false,
            source: "Inventory",
            channels: ["in-app", "email", "sms", "push"],
            category: "inventory",
            metadata: payload,
            actionUrl: "/inventory",
            actionLabel: "Open Inventory",
          });
        },
      ),
    ];

    return () => unsubscribers.forEach((u) => u());
  }, [addNotification]);

  const filtered = React.useMemo(() => {
    let list = notifications;
    if (activeTab === "unread") list = list.filter((n) => !n.read);
    if (filterType !== "all") list = list.filter((n) => n.type === filterType);
    if (filterPriority !== "all")
      list = list.filter((n) => n.priority === filterPriority);
    if (filterRead !== "all")
      list = list.filter((n) => (filterRead === "read" ? n.read : !n.read));
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q),
      );
    }
    return list;
  }, [
    activeTab,
    filterPriority,
    filterRead,
    filterType,
    notifications,
    searchQuery,
  ]);

  const markAsRead = (id: string) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  const deleteNotification = (id: string) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast({ title: "All notifications marked as read" });
  };

  const clearRead = () => {
    setNotifications((prev) => prev.filter((n) => !n.read));
    toast({ title: "Read notifications cleared" });
  };

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="border-b border-border/30 p-4 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Notifications
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearRead}
              disabled={notifications.filter((n) => n.read).length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Read
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreferences((v) => !v)}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Preferences
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={filterType}
            onValueChange={(v) => setFilterType(v as any)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filterPriority}
            onValueChange={(v) => setFilterPriority(v as any)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filterRead}
            onValueChange={(v) => setFilterRead(v as any)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {showPreferences ? (
        <Card className="m-4 border-primary/20">
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-base font-medium mb-3 block">
                Delivery Channels
              </Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="inapp">In-App</Label>
                  <Switch
                    id="inapp"
                    checked={preferences.channels.inApp}
                    onCheckedChange={(checked) =>
                      setPreferences((p) => ({
                        ...p,
                        channels: { ...p.channels, inApp: checked },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="email">Email</Label>
                  <Switch
                    id="email"
                    checked={preferences.channels.email}
                    onCheckedChange={(checked) =>
                      setPreferences((p) => ({
                        ...p,
                        channels: { ...p.channels, email: checked },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sms">SMS</Label>
                  <Switch
                    id="sms"
                    checked={preferences.channels.sms}
                    onCheckedChange={(checked) =>
                      setPreferences((p) => ({
                        ...p,
                        channels: { ...p.channels, sms: checked },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="push">Push</Label>
                  <Switch
                    id="push"
                    checked={preferences.channels.push}
                    onCheckedChange={(checked) =>
                      setPreferences((p) => ({
                        ...p,
                        channels: { ...p.channels, push: checked },
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-base font-medium mb-3 block">
                Quiet Hours
              </Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="quiet">Enable Quiet Hours</Label>
                  <Switch
                    id="quiet"
                    checked={preferences.quietHours.enabled}
                    onCheckedChange={(checked) =>
                      setPreferences((p) => ({
                        ...p,
                        quietHours: { ...p.quietHours, enabled: checked },
                      }))
                    }
                  />
                </div>
                {preferences.quietHours.enabled ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="qstart">Start</Label>
                      <Input
                        id="qstart"
                        type="time"
                        value={preferences.quietHours.start}
                        onChange={(e) =>
                          setPreferences((p) => ({
                            ...p,
                            quietHours: {
                              ...p.quietHours,
                              start: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="qend">End</Label>
                      <Input
                        id="qend"
                        type="time"
                        value={preferences.quietHours.end}
                        onChange={(e) =>
                          setPreferences((p) => ({
                            ...p,
                            quietHours: {
                              ...p.quietHours,
                              end: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium mb-3 block">
                Batching
              </Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="batch">Enable Batching</Label>
                  <Switch
                    id="batch"
                    checked={preferences.batching.enabled}
                    onCheckedChange={(checked) =>
                      setPreferences((p) => ({
                        ...p,
                        batching: { ...p.batching, enabled: checked },
                      }))
                    }
                  />
                </div>
                {preferences.batching.enabled ? (
                  <div>
                    <Label htmlFor="batchWindow">Batch Window (minutes)</Label>
                    <Input
                      id="batchWindow"
                      type="number"
                      min={1}
                      max={60}
                      value={preferences.batching.batchWindowMinutes}
                      onChange={(e) =>
                        setPreferences((p) => ({
                          ...p,
                          batching: {
                            ...p.batching,
                            batchWindowMinutes: Math.max(
                              1,
                              Math.min(
                                60,
                                parseInt(e.target.value || "15", 10),
                              ),
                            ),
                          },
                        }))
                      }
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="h-full flex flex-col"
        >
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="all">
              All{" "}
              {notifications.length > 0 ? (
                <Badge variant="secondary" className="ml-2">
                  {notifications.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread{" "}
              {unreadCount > 0 ? (
                <Badge variant="default" className="ml-2">
                  {unreadCount}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="flex-1 overflow-auto p-4">
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {filtered.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <BellOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">
                        No notifications found
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filtered.map((n) => (
                    <Card
                      key={n.id}
                      className={cn(
                        "transition-all hover:shadow-md cursor-pointer",
                        !n.read && "border-l-4 border-l-primary bg-primary/5",
                        n.read && "opacity-60",
                      )}
                      onClick={() => {
                        if (!n.read) markAsRead(n.id);
                        if (n.actionUrl) window.location.href = n.actionUrl;
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="mt-1">{iconForType(n.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-foreground">
                                    {n.title}
                                  </h3>
                                  <Badge variant={priorityVariant(n.priority)}>
                                    {n.priority}
                                  </Badge>
                                  {!n.read ? (
                                    <Badge
                                      variant="default"
                                      className="h-2 w-2 rounded-full p-0"
                                    />
                                  ) : null}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {n.message}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDistanceToNow(
                                      parseISO(n.timestamp),
                                      { addSuffix: true },
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {n.source}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {n.actionUrl && n.actionLabel ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.location.href = n.actionUrl!;
                                    }}
                                  >
                                    {n.actionLabel}
                                  </Button>
                                ) : null}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(n.id);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="unread" className="flex-1 overflow-auto p-4">
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {filtered.filter((n) => !n.read).length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p className="text-foreground font-medium">
                        All caught up!
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        You have no unread notifications.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Unread notifications are shown in the “All” tab and
                    highlighted.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      <div className="p-3 border-t border-border/20 bg-background/50 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {notifications.length} total
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setNotifications([])}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All
        </Button>
      </div>
    </div>
  );
}
