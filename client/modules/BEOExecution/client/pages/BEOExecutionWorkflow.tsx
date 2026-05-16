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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  EVENT_TYPES,
  maestroEventBus,
  publishEvent,
} from "@/modules/MaestroBQT/event-bus";
import {
  addDays,
  addHours,
  format,
  formatDistanceToNow,
  parseISO,
} from "date-fns";
import {
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Play,
  RefreshCw,
  Square,
  Users2,
} from "lucide-react";

interface BEOExecutionWorkflowProps {
  beoId?: string;
  onClose?: () => void;
  onMinimize?: () => void;
}

type ChecklistStatus = "pending" | "in-progress" | "completed" | "blocked";
type ChecklistPriority = "low" | "normal" | "high" | "urgent";

interface ChecklistItem {
  id: string;
  category: string;
  task: string;
  assignedTo?: string;
  dueDate?: string; // ISO
  status: ChecklistStatus;
  priority: ChecklistPriority;
  notes?: string;
}

type TimelineStatus = "upcoming" | "in-progress" | "completed" | "delayed";
interface TimelineEvent {
  id: string;
  time: string; // ISO
  title: string;
  description: string;
  status: TimelineStatus;
  category: string;
  assignedTo?: string;
}

type UpdateType = "status" | "issue" | "note" | "photo";
interface RealTimeUpdate {
  id: string;
  timestamp: string; // ISO
  type: UpdateType;
  message: string;
  author: string;
  category: string;
}

interface PostEventMetric {
  category: string;
  planned: number;
  actual: number;
}

function statusVariant(
  s: ChecklistStatus | TimelineStatus,
): "default" | "destructive" | "secondary" {
  if (s === "completed" || s === "in-progress") return "default";
  if (s === "blocked" || s === "delayed") return "destructive";
  return "secondary";
}

function priorityVariant(
  p: ChecklistPriority,
): "destructive" | "default" | "secondary" {
  if (p === "urgent") return "destructive";
  if (p === "high") return "default";
  return "secondary";
}

function mockChecklist(beoId: string): ChecklistItem[] {
  const cats = [
    "Menu & Recipes",
    "Inventory & Purchasing",
    "Staff & Scheduling",
    "Equipment & Setup",
    "Service & Logistics",
    "Final Confirmation",
  ];
  const tasks: Record<string, string[]> = {
    "Menu & Recipes": [
      "Confirm menu",
      "Scale recipes",
      "Prep lists",
      "Dietary restrictions",
    ],
    "Inventory & Purchasing": [
      "Verify orders",
      "Confirm deliveries",
      "Check inventory",
      "Reserve equipment",
    ],
    "Staff & Scheduling": [
      "Assign chef",
      "Schedule prep staff",
      "Schedule service staff",
      "Brief leads",
    ],
    "Equipment & Setup": ["Reserve space", "Set stations", "Test equipment"],
    "Service & Logistics": [
      "Confirm guest count",
      "Service timeline",
      "Vendor drops",
    ],
    "Final Confirmation": [
      "Final walkthrough",
      "Staff brief",
      "Final approval",
    ],
  };

  const base = new Date();
  let idx = 1;
  const out: ChecklistItem[] = [];
  for (const c of cats) {
    for (const t of tasks[c]) {
      const due = addDays(base, Math.floor(idx / 2));
      out.push({
        id: `beo-${beoId}-task-${idx}`,
        category: c,
        task: t,
        assignedTo:
          idx % 3 === 0
            ? "Chef Smith"
            : idx % 5 === 0
              ? "Event Manager"
              : undefined,
        dueDate: due.toISOString(),
        status: idx <= 3 ? "completed" : idx <= 6 ? "in-progress" : "pending",
        priority: idx % 4 === 0 ? "urgent" : idx % 3 === 0 ? "high" : "normal",
      });
      idx += 1;
    }
  }
  return out;
}

function mockTimeline(eventDateISO: string): TimelineEvent[] {
  const start = parseISO(eventDateISO);
  return [
    {
      id: "t-24",
      time: addHours(start, -24).toISOString(),
      title: "Final Prep Review",
      description: "Confirm prep is complete",
      status: "completed",
      category: "Prep",
      assignedTo: "Chef Smith",
    },
    {
      id: "t-12",
      time: addHours(start, -12).toISOString(),
      title: "Equipment Setup",
      description: "Set up all service equipment",
      status: "in-progress",
      category: "Setup",
      assignedTo: "Setup Team",
    },
    {
      id: "t-2",
      time: addHours(start, -2).toISOString(),
      title: "Staff Briefing",
      description: "Brief staff on service plan",
      status: "upcoming",
      category: "Staff",
      assignedTo: "Event Manager",
    },
    {
      id: "t-0",
      time: start.toISOString(),
      title: "Event Start",
      description: "Guests arrive; service begins",
      status: "upcoming",
      category: "Service",
    },
  ];
}

function mockUpdates(): RealTimeUpdate[] {
  return [
    {
      id: "u-1",
      timestamp: new Date().toISOString(),
      type: "status",
      message: "Prep on schedule. Stations green.",
      author: "Chef Smith",
      category: "Prep",
    },
    {
      id: "u-2",
      timestamp: addHours(new Date(), -2).toISOString(),
      type: "note",
      message: "Guest count confirmed at 150.",
      author: "Event Manager",
      category: "Service",
    },
  ];
}

function mockMetrics(): PostEventMetric[] {
  return [
    { category: "Guest Count", planned: 150, actual: 148 },
    { category: "Food Cost", planned: 5000, actual: 4850 },
    { category: "Labor Hours", planned: 120, actual: 115 },
  ];
}

export default function BEOExecutionWorkflow({
  beoId = "beo-123",
}: BEOExecutionWorkflowProps) {
  const { toast } = useToast();

  const [eventDate] = React.useState<string>(() =>
    addDays(new Date(), 3).toISOString(),
  );
  const [activeTab, setActiveTab] = React.useState<
    "checklist" | "timeline" | "updates" | "analysis"
  >("checklist");
  const [isEventActive, setIsEventActive] = React.useState(false);

  const [checklist, setChecklist] = React.useState<ChecklistItem[]>([]);
  const [timeline, setTimeline] = React.useState<TimelineEvent[]>([]);
  const [updates, setUpdates] = React.useState<RealTimeUpdate[]>([]);
  const [metrics, setMetrics] = React.useState<PostEventMetric[]>([]);

  const [selectedItem, setSelectedItem] = React.useState<ChecklistItem | null>(
    null,
  );
  const [showItemDialog, setShowItemDialog] = React.useState(false);
  const [newUpdate, setNewUpdate] = React.useState("");

  const loadData = React.useCallback(() => {
    setChecklist(mockChecklist(beoId));
    setTimeline(mockTimeline(eventDate));
    setUpdates(mockUpdates());
    setMetrics(mockMetrics());
  }, [beoId, eventDate]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    const unsub = maestroEventBus.subscribeTo(
      EVENT_TYPES.BEO_DETAIL_CHANGED,
      (payload: any) => {
        if (payload?.beoId && payload.beoId !== beoId) return;
        loadData();
        toast({
          title: "BEO Updated",
          description: "Event details have been updated.",
        });
      },
    );
    return () => unsub();
  }, [beoId, loadData, toast]);

  const completedCount = React.useMemo(
    () => checklist.filter((i) => i.status === "completed").length,
    [checklist],
  );
  const progressPercent = React.useMemo(
    () => (checklist.length ? (completedCount / checklist.length) * 100 : 0),
    [checklist.length, completedCount],
  );

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, status: i.status === "completed" ? "pending" : "completed" }
          : i,
      ),
    );
    publishEvent(
      EVENT_TYPES.BEO_CHECKLIST_UPDATED,
      { beoId, itemId: id },
      "BEOExecution",
    );
  };

  const addUpdate = () => {
    const msg = newUpdate.trim();
    if (!msg) return;
    const u: RealTimeUpdate = {
      id: `u-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: "note",
      message: msg,
      author: "Current User",
      category: "General",
    };
    setUpdates((prev) => [u, ...prev]);
    setNewUpdate("");
    publishEvent(
      EVENT_TYPES.BEO_UPDATE_ADDED,
      { beoId, update: u },
      "BEOExecution",
    );
    toast({ title: "Update posted" });
  };

  const startEvent = () => {
    setIsEventActive(true);
    toast({
      title: "Event started",
      description: "Day-of coordination is active.",
    });
  };

  const endEvent = () => {
    setIsEventActive(false);
    setActiveTab("analysis");
    toast({
      title: "Event completed",
      description: "Post-event analysis available.",
    });
  };

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="border-b border-border/30 p-4 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              BEO Execution Workflow
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              BEO #{beoId} •{" "}
              {format(parseISO(eventDate), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isEventActive ? (
              <Button onClick={startEvent}>
                <Play className="h-4 w-4 mr-2" />
                Start Event
              </Button>
            ) : (
              <Button variant="destructive" onClick={endEvent}>
                <Square className="h-4 w-4 mr-2" />
                End Event
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pre-Event Checklist</span>
            <span className="font-medium">
              {completedCount} / {checklist.length} completed
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="h-full flex flex-col"
        >
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="checklist">
              Checklist{" "}
              {checklist.filter((i) => i.status !== "completed").length ? (
                <Badge variant="secondary" className="ml-2">
                  {checklist.filter((i) => i.status !== "completed").length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="updates">
              Updates{" "}
              {updates.length ? (
                <Badge variant="default" className="ml-2">
                  {updates.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="flex-1 overflow-auto p-4">
            <div className="space-y-4">
              {Array.from(new Set(checklist.map((i) => i.category))).map(
                (cat) => (
                  <Card key={cat}>
                    <CardHeader>
                      <CardTitle className="text-lg">{cat}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {checklist
                        .filter((i) => i.category === cat)
                        .map((i) => (
                          <div
                            key={i.id}
                            className="flex items-start gap-3 p-3 border rounded-lg"
                          >
                            <Checkbox
                              checked={i.status === "completed"}
                              onCheckedChange={() => toggleChecklistItem(i.id)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={
                                    i.status === "completed"
                                      ? "line-through text-muted-foreground"
                                      : "font-medium"
                                  }
                                >
                                  {i.task}
                                </span>
                                <Badge
                                  variant={priorityVariant(i.priority)}
                                  className="text-xs"
                                >
                                  {i.priority}
                                </Badge>
                                <Badge
                                  variant={statusVariant(i.status)}
                                  className="text-xs"
                                >
                                  {i.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {i.assignedTo ? (
                                  <div className="flex items-center gap-1">
                                    <Users2 className="h-3 w-3" />
                                    {i.assignedTo}
                                  </div>
                                ) : null}
                                {i.dueDate ? (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(
                                      parseISO(i.dueDate),
                                      "MMM d, h:mm a",
                                    )}
                                  </div>
                                ) : null}
                              </div>
                              {i.notes ? (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {i.notes}
                                </p>
                              ) : null}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(i);
                                setShowItemDialog(true);
                              }}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                ),
              )}
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="flex-1 overflow-auto p-4">
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
                <CardDescription>Milestones and checkpoints</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {timeline.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                  >
                    <div className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center bg-muted">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{t.title}</h3>
                        <Badge variant={statusVariant(t.status)}>
                          {t.status}
                        </Badge>
                        <Badge variant="outline">{t.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(t.time), "MMM d, h:mm a")}
                        </div>
                        {t.assignedTo ? (
                          <div className="flex items-center gap-1">
                            <Users2 className="h-3 w-3" />
                            {t.assignedTo}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="updates" className="flex-1 overflow-auto p-4">
            <Card>
              <CardHeader>
                <CardTitle>Real-Time Updates</CardTitle>
                <CardDescription>
                  Day-of notes and communication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add an update…"
                    value={newUpdate}
                    onChange={(e) => setNewUpdate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addUpdate();
                    }}
                  />
                  <Button onClick={addUpdate}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Post
                  </Button>
                </div>
                <div className="space-y-2">
                  {updates.map((u) => (
                    <div key={u.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{u.author}</span>
                            <Badge variant="outline">{u.category}</Badge>
                            <Badge variant="secondary">{u.type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(parseISO(u.timestamp), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm mt-2">{u.message}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="flex-1 overflow-auto p-4">
            <Card>
              <CardHeader>
                <CardTitle>Post-Event Analysis</CardTitle>
                <CardDescription>Planned vs actual</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead>Planned</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Variance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map((m) => {
                      const variance = m.actual - m.planned;
                      return (
                        <TableRow key={m.category}>
                          <TableCell className="font-medium">
                            {m.category}
                          </TableCell>
                          <TableCell>{m.planned.toLocaleString()}</TableCell>
                          <TableCell>{m.actual.toLocaleString()}</TableCell>
                          <TableCell
                            className={
                              variance <= 0 ? "text-green-600" : "text-red-600"
                            }
                          >
                            {variance > 0 ? "+" : ""}
                            {variance.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedItem?.task}</DialogTitle>
            <DialogDescription>{selectedItem?.category}</DialogDescription>
          </DialogHeader>
          {selectedItem ? (
            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={selectedItem.status}
                  onValueChange={(value) => {
                    const next = value as ChecklistStatus;
                    setChecklist((prev) =>
                      prev.map((i) =>
                        i.id === selectedItem.id ? { ...i, status: next } : i,
                      ),
                    );
                    setSelectedItem((prev) =>
                      prev ? { ...prev, status: next } : prev,
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={selectedItem.notes || ""}
                  onChange={(e) => {
                    const notes = e.target.value;
                    setChecklist((prev) =>
                      prev.map((i) =>
                        i.id === selectedItem.id ? { ...i, notes } : i,
                      ),
                    );
                    setSelectedItem((prev) =>
                      prev ? { ...prev, notes } : prev,
                    );
                  }}
                  placeholder="Add notes…"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
