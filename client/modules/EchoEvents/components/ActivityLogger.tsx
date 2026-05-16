import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Activity,
  Monitor,
  MousePointer,
  Keyboard,
  Navigation,
  Wifi,
  WifiOff,
  Filter,
  Download,
  Clock,
  Play,
  Pause,
  BarChart3,
  Repeat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ActivityLog,
  ActivityAction,
  SystemModule,
} from "@shared/time-management-types";
interface ActivityLoggerProps {
  userId?: string;
  showRealTime?: boolean;
  onActivityLog?: (activity: ActivityLog) => void;
}
interface ActivityFilter {
  module: "all" | SystemModule;
  action: "all" | ActivityAction;
}
const moduleLabels: Record<SystemModule, string> = {
  "sales-pipeline": "Sales Pipeline",
  events: "Events",
  "beo-management": "BEO Management",
  calendar: "Calendar",
  contacts: "Contacts",
  analytics: "Analytics",
  admin: "Administration",
  settings: "Settings",
  gantt: "Gantt Planner",
  "time-management": "Time Management",
};
const actionBadges: Record<ActivityAction, string> = {
  view: "bg-primary/15 text-primary",
  edit: "bg-amber-500/15 text-amber-600",
  create: "bg-emerald-500/15 text-emerald-600",
  delete: "bg-red-500/15 text-red-600",
  navigate: "bg-purple-500/15 text-purple-600",
  search: "bg-teal-500/15 text-teal-600",
  export: "bg-slate-500/15 text-muted-foreground",
  import: "bg-indigo-500/15 text-indigo-600",
  login: "bg-primary/15 text-primary",
  logout: "bg-slate-500/15 text-muted-foreground",
  idle: "bg-rose-500/15 text-rose-600",
  focus: "bg-emerald-500/15 text-emerald-600",
  break: "bg-amber-500/15 text-amber-600",
};
const baseActivities: ActivityLog[] = [
  {
    id: "1",
    userId: "current-user",
    timestamp: new Date(Date.now() - 1000 * 60 * 4),
    action: "view",
    module: "sales-pipeline",
    details: { page: "deals", dealId: "deal-123" },
    duration: 120,
  },
  {
    id: "2",
    userId: "current-user",
    timestamp: new Date(Date.now() - 1000 * 60 * 11),
    action: "edit",
    module: "events",
    details: { eventId: "event-456", field: "venue" },
    duration: 300,
  },
  {
    id: "3",
    userId: "current-user",
    timestamp: new Date(Date.now() - 1000 * 60 * 17),
    action: "create",
    module: "contacts",
    details: { contactId: "contact-789", type: "lead" },
    duration: 180,
  },
  {
    id: "4",
    userId: "current-user",
    timestamp: new Date(Date.now() - 1000 * 60 * 23),
    action: "navigate",
    module: "calendar",
    details: { from: "/events", to: "/calendar" },
    duration: 45,
  },
];
function generateSyntheticActivity(userId: string): ActivityLog {
  const modules = Object.keys(moduleLabels) as SystemModule[];
  const actions: ActivityAction[] = [
    "view",
    "edit",
    "create",
    "navigate",
    "search",
    "export",
  ];
  const module = modules[Math.floor(Math.random() * modules.length)];
  const action = actions[Math.floor(Math.random() * actions.length)];
  return {
    id: `${Date.now()}`,
    userId,
    timestamp: new Date(),
    action,
    module,
    details: { context: module, action },
    duration: Math.floor(Math.random() * 240) + 30,
  };
}
export default function ActivityLogger({
  userId = "current-user",
  showRealTime = true,
  onActivityLog,
}: ActivityLoggerProps) {
  const [isTracking, setIsTracking] = useState(showRealTime);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<ActivityFilter>({
    module: "all",
    action: "all",
  });
  const [view, setView] = useState<"timeline" | "summary">("timeline");
  const [activities, setActivities] = useState<ActivityLog[]>(baseActivities);
  const [networkHealthy, setNetworkHealthy] = useState(true);
  useEffect(() => {
    setIsTracking(showRealTime);
  }, [showRealTime]);
  useEffect(() => {
    if (!isTracking) return;
    const interval = window.setInterval(() => {
      const synthetic = generateSyntheticActivity(userId);
      setActivities((prev) => {
        const next = [synthetic, ...prev].slice(0, 120);
        onActivityLog?.(synthetic);
        return next;
      });
    }, 90000);
    return () => window.clearInterval(interval);
  }, [isTracking, onActivityLog, userId]);
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      const matchesText = searchTerm
        ? JSON.stringify(activity.details)
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        : true;
      const matchesModule =
        filter.module === "all" || activity.module === filter.module;
      const matchesAction =
        filter.action === "all" || activity.action === filter.action;
      return matchesText && matchesModule && matchesAction;
    });
  }, [activities, filter, searchTerm]);
  const summaryMetrics = useMemo(() => {
    const totalDuration = filteredActivities.reduce(
      (sum, item) => sum + (item.duration || 0),
      0,
    );
    const idleMinutes = filteredActivities
      .filter((item) => item.action === "idle")
      .reduce((sum, item) => sum + (item.duration || 0), 0);
    const modulesTouched = new Set(
      filteredActivities.map((item) => item.module),
    ).size;
    return {
      totalEvents: filteredActivities.length,
      totalDuration,
      idleMinutes,
      modulesTouched,
    };
  }, [filteredActivities]);
  const moduleSummary = useMemo(() => {
    const grouped = filteredActivities.reduce<
      Record<SystemModule, { count: number; duration: number }>
    >(
      (acc, activity) => {
        if (!acc[activity.module]) {
          acc[activity.module] = { count: 0, duration: 0 };
        }
        acc[activity.module].count += 1;
        acc[activity.module].duration += activity.duration || 0;
        return acc;
      },
      {} as Record<SystemModule, { count: number; duration: number }>,
    );
    return Object.entries(grouped)
      .map(([module, data]) => ({ module: module as SystemModule, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [filteredActivities]);
  const actionSummary = useMemo(() => {
    const grouped = filteredActivities.reduce<Record<ActivityAction, number>>(
      (acc, activity) => {
        acc[activity.action] = (acc[activity.action] || 0) + 1;
        return acc;
      },
      {} as Record<ActivityAction, number>,
    );
    return Object.entries(grouped)
      .map(([action, count]) => ({ action: action as ActivityAction, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredActivities]);
  const handleExport = useCallback(() => {
    const payload = {
      generatedAt: new Date().toISOString(),
      userId,
      total: filteredActivities.length,
      activities: filteredActivities,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `activity-log-${userId}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [filteredActivities, userId]);
  return (
    <Card className="glass-panel">
      {" "}
      <CardHeader className="pb-3">
        {" "}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {" "}
          <div>
            {" "}
            <CardTitle className="text-base font-semibold sm:text-lg">
              EchoCRM Activity Log
            </CardTitle>{" "}
            <CardDescription className="text-xs sm:text-sm">
              {" "}
              Unified audit of user interactions, navigation events, and SaaS
              sync activity.{" "}
            </CardDescription>{" "}
          </div>{" "}
          <div className="flex flex-wrap items-center gap-3">
            {" "}
            <div className="flex items-center gap-2">
              {" "}
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Live tracking
              </span>{" "}
              <Switch
                checked={isTracking}
                onCheckedChange={setIsTracking}
              />{" "}
            </div>{" "}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="apple-button"
            >
              {" "}
              <Download className="mr-2 h-4 w-4" /> Export JSON{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-6">
        {" "}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {" "}
          <div className="rounded-lg border border-border/60 bg-card/80 p-4">
            {" "}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {" "}
              <span>Total events</span> <Activity className="h-4 w-4" />{" "}
            </div>{" "}
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {summaryMetrics.totalEvents}
            </p>{" "}
            <p className="text-xs text-muted-foreground">
              Captured in the current filter
            </p>{" "}
          </div>{" "}
          <div className="rounded-lg border border-border/60 bg-card/80 p-4">
            {" "}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {" "}
              <span>Active minutes</span> <Clock className="h-4 w-4" />{" "}
            </div>{" "}
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {" "}
              {(summaryMetrics.totalDuration / 60).toFixed(1)}m{" "}
            </p>{" "}
            <p className="text-xs text-muted-foreground">
              Session duration tracked
            </p>{" "}
          </div>{" "}
          <div className="rounded-lg border border-border/60 bg-card/80 p-4">
            {" "}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {" "}
              <span>Idle minutes</span> <Pause className="h-4 w-4" />{" "}
            </div>{" "}
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {" "}
              {(summaryMetrics.idleMinutes / 60).toFixed(1)}m{" "}
            </p>{" "}
            <p className="text-xs text-muted-foreground">
              Automation auto-pauses during idle
            </p>{" "}
          </div>{" "}
          <div className="rounded-lg border border-border/60 bg-card/80 p-4">
            {" "}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {" "}
              <span>Modules touched</span>{" "}
              <BarChart3 className="h-4 w-4" />{" "}
            </div>{" "}
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {summaryMetrics.modulesTouched}
            </p>{" "}
            <p className="text-xs text-muted-foreground">
              Cross-team footprint
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {" "}
          <Input
            placeholder="Search activity details"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="apple-input"
          />{" "}
          <Select
            value={filter.module}
            onValueChange={(value) =>
              setFilter((prev) => ({
                ...prev,
                module: value as ActivityFilter["module"],
              }))
            }
          >
            {" "}
            <SelectTrigger className="apple-input">
              {" "}
              <SelectValue placeholder="Module" />{" "}
            </SelectTrigger>{" "}
            <SelectContent>
              {" "}
              <SelectItem value="all">All modules</SelectItem>{" "}
              {Object.entries(moduleLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {" "}
                  {label}{" "}
                </SelectItem>
              ))}{" "}
            </SelectContent>{" "}
          </Select>{" "}
          <Select
            value={filter.action}
            onValueChange={(value) =>
              setFilter((prev) => ({
                ...prev,
                action: value as ActivityFilter["action"],
              }))
            }
          >
            {" "}
            <SelectTrigger className="apple-input">
              {" "}
              <SelectValue placeholder="Action" />{" "}
            </SelectTrigger>{" "}
            <SelectContent>
              {" "}
              <SelectItem value="all">All actions</SelectItem>{" "}
              {Object.keys(actionBadges).map((action) => (
                <SelectItem key={action} value={action}>
                  {" "}
                  {action}{" "}
                </SelectItem>
              ))}{" "}
            </SelectContent>{" "}
          </Select>{" "}
          <Button variant="outline" className="apple-button">
            {" "}
            <Filter className="mr-2 h-4 w-4" /> Advanced filters{" "}
          </Button>{" "}
        </div>{" "}
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/80 px-4 py-3 text-xs text-muted-foreground">
          {" "}
          <div className="flex items-center gap-3">
            {" "}
            {networkHealthy ? (
              <Wifi className="h-4 w-4 text-emerald-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}{" "}
            <span>
              {" "}
              {networkHealthy
                ? "Streaming events in real time from EchoCRM pods"
                : "Reconnecting … some activity may be delayed"}{" "}
            </span>{" "}
          </div>{" "}
          <Button
            variant="ghost"
            size="sm"
            className="apple-button px-2"
            onClick={() => setNetworkHealthy((prev) => !prev)}
          >
            {" "}
            <Repeat className="mr-2 h-3.5 w-3.5" /> Toggle network state{" "}
          </Button>{" "}
        </div>{" "}
        <Tabs
          value={view}
          onValueChange={(value) => setView(value as "timeline" | "summary")}
        >
          {" "}
          <TabsList className="grid grid-cols-2">
            {" "}
            <TabsTrigger value="timeline">Timeline</TabsTrigger>{" "}
            <TabsTrigger value="summary">Summaries</TabsTrigger>{" "}
          </TabsList>{" "}
          <TabsContent value="timeline" className="mt-4">
            {" "}
            <ScrollArea className="max-h-[320px]">
              {" "}
              <div className="space-y-3">
                {" "}
                {filteredActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/80 p-3"
                  >
                    {" "}
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {" "}
                      <Activity className="h-4 w-4" />{" "}
                    </span>{" "}
                    <div className="flex-1">
                      {" "}
                      <div className="flex flex-wrap items-center gap-2">
                        {" "}
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize",
                            actionBadges[activity.action],
                          )}
                        >
                          {" "}
                          {activity.action}{" "}
                        </Badge>{" "}
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          {moduleLabels[activity.module]}{" "}
                        </span>{" "}
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          {activity.timestamp.toLocaleTimeString()}{" "}
                        </span>{" "}
                      </div>{" "}
                      <p className="mt-1 text-sm text-foreground">
                        {" "}
                        {"details" in activity &&
                        typeof activity.details === "object"
                          ? Object.entries(activity.details)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(" •")
                          : "Event captured"}{" "}
                      </p>{" "}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {" "}
                        Duration{" "}
                        {(activity.duration || 0) / 60 < 1
                          ? `${activity.duration || 0}s`
                          : `${((activity.duration || 0) / 60).toFixed(1)}m`}{" "}
                      </p>{" "}
                    </div>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
            </ScrollArea>{" "}
          </TabsContent>{" "}
          <TabsContent value="summary" className="mt-4 space-y-6">
            {" "}
            <Card className="border border-border/60">
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm font-semibold">
                  Module engagement
                </CardTitle>{" "}
                <CardDescription className="text-xs">
                  Top touchpoints over the selected period
                </CardDescription>{" "}
              </CardHeader>{" "}
              <CardContent className="p-0">
                {" "}
                <Table>
                  {" "}
                  <TableHeader>
                    {" "}
                    <TableRow>
                      {" "}
                      <TableHead>Module</TableHead>{" "}
                      <TableHead>Events</TableHead>{" "}
                      <TableHead>Total minutes</TableHead>{" "}
                    </TableRow>{" "}
                  </TableHeader>{" "}
                  <TableBody>
                    {" "}
                    {moduleSummary.map((entry) => (
                      <TableRow key={entry.module}>
                        {" "}
                        <TableCell>{moduleLabels[entry.module]}</TableCell>{" "}
                        <TableCell>{entry.count}</TableCell>{" "}
                        <TableCell>
                          {(entry.duration / 60).toFixed(1)}
                        </TableCell>{" "}
                      </TableRow>
                    ))}{" "}
                  </TableBody>{" "}
                </Table>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card className="border border-border/60">
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm font-semibold">
                  Action mix
                </CardTitle>{" "}
                <CardDescription className="text-xs">
                  Distribution of tracked actions
                </CardDescription>{" "}
              </CardHeader>{" "}
              <CardContent className="flex flex-wrap gap-2">
                {" "}
                {actionSummary.map((entry) => (
                  <Badge
                    key={entry.action}
                    className={cn("capitalize", actionBadges[entry.action])}
                  >
                    {" "}
                    {entry.action} · {entry.count}{" "}
                  </Badge>
                ))}{" "}
              </CardContent>{" "}
            </Card>{" "}
          </TabsContent>{" "}
        </Tabs>{" "}
        <div className="grid gap-3 md:grid-cols-3">
          {" "}
          <div className="rounded-lg border border-border/60 bg-card/80 p-4 text-xs text-muted-foreground">
            {" "}
            <div className="flex items-center gap-2 text-foreground">
              {" "}
              <Monitor className="h-4 w-4" /> Screen Tracking{" "}
            </div>{" "}
            <p className="mt-2">
              Captures page navigations and module time.
            </p>{" "}
          </div>{" "}
          <div className="rounded-lg border border-border/60 bg-card/80 p-4 text-xs text-muted-foreground">
            {" "}
            <div className="flex items-center gap-2 text-foreground">
              {" "}
              <MousePointer className="h-4 w-4" /> Interaction Heatmap{" "}
            </div>{" "}
            <p className="mt-2">
              Logs clicks and focus events to surface friction.
            </p>{" "}
          </div>{" "}
          <div className="rounded-lg border border-border/60 bg-card/80 p-4 text-xs text-muted-foreground">
            {" "}
            <div className="flex items-center gap-2 text-foreground">
              {" "}
              <Keyboard className="h-4 w-4" /> Keyboard & Idle{" "}
            </div>{" "}
            <p className="mt-2">
              Auto-pauses tracking when idle thresholds are met.
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/80 px-4 py-3 text-xs text-muted-foreground">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <Navigation className="h-4 w-4" />{" "}
            <span>
              Latest navigation action recorded at{" "}
              {filteredActivities[0]?.timestamp.toLocaleTimeString() ?? "—"}
            </span>{" "}
          </div>{" "}
          <div className="flex items-center gap-2">
            {" "}
            <Play className="h-4 w-4" />{" "}
            <span>{isTracking ? "Tracking live" : "Tracking paused"}</span>{" "}
          </div>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
