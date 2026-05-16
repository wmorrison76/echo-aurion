import React, { useMemo, useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { generateId } from "./shared";

export type ControlPoint = {
  id: string;
  step: string;
  hazard: string;
  criticalLimits: string;
  monitoring: string;
  frequency: string;
  responsibleRole: string;
  verification: string;
  record: string;
};

export type TemperatureLogEntry = {
  id: string;
  location: string;
  sample: string;
  reading: number;
  unit: "°C" | "°F";
  takenAt: string;
  takenBy: string;
  status: "ok" | "warning" | "critical";
  correctiveAction?: string;
};

export type CorrectiveAction = {
  id: string;
  description: string;
  createdAt: string;
  owner: string;
  status: "open" | "closed";
  relatedLogId?: string;
  resolutionNotes?: string;
};

export type ChecklistTask = {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
};

const CONTROL_POINTS: ControlPoint[] = [
  {
    id: "haccp-ccp-01",
    step: "Cook - Pastry Cream",
    hazard: "Biological (Salmonella)",
    criticalLimits: "≥ 82°C for 2 min",
    monitoring: "Probe center of batch before cooling",
    frequency: "Each batch",
    responsibleRole: "Pastry Lead",
    verification: "Executive pastry chef reviews daily",
    record: "Hot process log",
  },
  {
    id: "haccp-ccp-02",
    step: "Cool - Blast chiller",
    hazard: "Biological (Clostridium perfringens)",
    criticalLimits: "From 60°C to 21°C within 2 hours, ≤ 5°C within 6 hours",
    monitoring: "Chart recorder + probe verification",
    frequency: "Each batch",
    responsibleRole: "Production Supervisor",
    verification: "QA signs off weekly",
    record: "Cooling log",
  },
  {
    id: "haccp-ccp-03",
    step: "Cold Storage",
    hazard: "Biological (Listeria)",
    criticalLimits: "≤ 4°C",
    monitoring: "Digital logger with SMS alert + manual check a.m./p.m.",
    frequency: "Twice daily",
    responsibleRole: "AM Sous Chef",
    verification: "Facilities trending report",
    record: "Walk-in temperature log",
  },
];

const INITIAL_TEMPERATURE_LOGS: TemperatureLogEntry[] = [
  {
    id: "log-cc-01",
    location: "Cook Chill Kettle",
    sample: "Lemon curd",
    reading: 84.5,
    unit: "°C",
    takenAt: new Date().toISOString(),
    takenBy: "Maria",
    status: "ok",
  },
  {
    id: "log-blast-01",
    location: "Blast Chiller",
    sample: "Chocolate mousse",
    reading: 8.2,
    unit: "°C",
    takenAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    takenBy: "Noah",
    status: "warning",
    correctiveAction: "Rotate trays / extend chill 15 min",
  },
  {
    id: "log-walkin-01",
    location: "Walk-in Cooler",
    sample: "Ambient",
    reading: 6.4,
    unit: "°C",
    takenAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    takenBy: "Amelia",
    status: "critical",
    correctiveAction: "Moved product to backup cooler, notified facilities",
  },
];

const INITIAL_ACTIONS: CorrectiveAction[] = [
  {
    id: "action-01",
    description: "Walk-in cooler above 5°C. Facilities ticket #FM-221 raised.",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    owner: "QA Team",
    status: "open",
    relatedLogId: "log-walkin-01",
  },
];

const CHECKLIST_TEMPLATE: ChecklistTask[] = [
  {
    id: "task-01",
    label: "Verify CCP thermometer calibrated",
    required: true,
    completed: false,
  },
  {
    id: "task-02",
    label: "Review overnight temp alerts",
    required: true,
    completed: false,
  },
  {
    id: "task-03",
    label: "Confirm sanitation buckets ≥ 200 ppm",
    required: true,
    completed: false,
  },
  {
    id: "task-04",
    label: "File previous shift production logs",
    required: false,
    completed: false,
  },
];

const LOCATION_LIMITS: Record<string, { min?: number; max?: number }> = {
  "Cook Chill Kettle": { min: 82 },
  "Blast Chiller": { max: 5 },
  "Walk-in Cooler": { max: 4 },
  Freezer: { max: -15 },
};

function classifyReading(
  location: string,
  value: number,
): TemperatureLogEntry["status"] {
  const limits = LOCATION_LIMITS[location];
  if (!limits) return "ok";
  if (typeof limits.min === "number" && value < limits.min) return "warning";
  if (typeof limits.max === "number" && value > limits.max + 2)
    return "critical";
  if (typeof limits.max === "number" && value > limits.max) return "warning";
  if (typeof limits.min === "number" && value < limits.min - 5)
    return "critical";
  return "ok";
}

function ControlPointBoard({ points }: { points: ControlPoint[] }) {
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>Critical control points</CardTitle>
        <CardDescription>
          Active CCPs with monitoring steps, limits, and verification plans.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {points.map((point) => (
          <div key={point.id} className="rounded-lg border bg-muted/60 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">{point.step}</div>
                <div className="text-xs text-muted-foreground">
                  Hazard: {point.hazard}
                </div>
              </div>
              <Badge variant="secondary">{point.frequency}</Badge>
            </div>
            <div className="mt-2 grid gap-2 text-xs text-foreground/80">
              <div>
                <span className="font-semibold">Critical limits:</span>{" "}
                {point.criticalLimits}
              </div>
              <div>
                <span className="font-semibold">Monitoring:</span>{" "}
                {point.monitoring}
              </div>
              <div className="grid gap-1 sm:grid-cols-2">
                <span>
                  <span className="font-semibold">Responsible:</span>{" "}
                  {point.responsibleRole}
                </span>
                <span>
                  <span className="font-semibold">Verification:</span>{" "}
                  {point.verification}
                </span>
              </div>
              <div>
                <span className="font-semibold">Record:</span> {point.record}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TemperatureLog({
  logs,
  onCreate,
}: {
  logs: TemperatureLogEntry[];
  onCreate: (entry: Omit<TemperatureLogEntry, "id" | "status">) => void;
}) {
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState("Walk-in Cooler");
  const [sample, setSample] = useState("Ambient");
  const [reading, setReading] = useState("4.0");
  const [unit, setUnit] = useState<"°C" | "°F">("°C");
  const [takenBy, setTakenBy] = useState("William Morrison");
  const [corrective, setCorrective] = useState("");

  const sortedLogs = useMemo(
    () =>
      [...logs].sort(
        (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime(),
      ),
    [logs],
  );

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>Temperature monitoring</CardTitle>
          <CardDescription>
            Capture cooling/cold-hold logs with automatic limit validation and
            corrective tracking.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Log temperature</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New temperature log</DialogTitle>
              <DialogDescription>
                Enter monitoring details for CCP verification.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex flex-col text-sm">
                  <span className="text-muted-foreground">Location</span>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(LOCATION_LIMITS).map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="flex flex-col text-sm">
                  <span className="text-muted-foreground">
                    Sample / product
                  </span>
                  <Input
                    value={sample}
                    onChange={(e) => setSample(e.target.value)}
                  />
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex flex-col text-sm">
                  <span className="text-muted-foreground">Reading</span>
                  <Input
                    value={reading}
                    onChange={(e) => setReading(e.target.value)}
                  />
                </label>
                <label className="flex flex-col text-sm">
                  <span className="text-muted-foreground">Unit</span>
                  <Select
                    value={unit}
                    onValueChange={(value) => setUnit(value as typeof unit)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="°C">°C</SelectItem>
                      <SelectItem value="°F">°F</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
              </div>
              <label className="flex flex-col text-sm">
                <span className="text-muted-foreground">Taken by</span>
                <Input
                  value={takenBy}
                  onChange={(e) => setTakenBy(e.target.value)}
                />
              </label>
              <label className="flex flex-col text-sm">
                <span className="text-muted-foreground">
                  Corrective action (if applicable)
                </span>
                <Textarea
                  rows={3}
                  value={corrective}
                  onChange={(e) => setCorrective(e.target.value)}
                />
              </label>
            </div>
            <DialogFooter className="pt-4">
              <Button
                onClick={() => {
                  const value = Number(reading);
                  if (!Number.isFinite(value)) return;
                  onCreate({
                    location,
                    sample,
                    reading: value,
                    unit,
                    takenAt: new Date().toISOString(),
                    takenBy,
                    correctiveAction: corrective.trim()
                      ? corrective.trim()
                      : undefined,
                  });
                  setOpen(false);
                  setSample("Ambient");
                  setReading("4.0");
                  setCorrective("");
                }}
              >
                Save log
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-muted/70 text-muted-foreground">
              <tr>
                <th className="p-2">Timestamp</th>
                <th className="p-2">Location</th>
                <th className="p-2">Sample</th>
                <th className="p-2">Reading</th>
                <th className="p-2">Status</th>
                <th className="p-2">Corrective action</th>
              </tr>
            </thead>
            <tbody>
              {sortedLogs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="p-2 text-muted-foreground">
                    {new Date(log.takenAt).toLocaleString()}
                  </td>
                  <td className="p-2">{log.location}</td>
                  <td className="p-2">{log.sample}</td>
                  <td className="p-2">
                    {log.reading.toFixed(1)} {log.unit}
                  </td>
                  <td className="p-2">
                    <Badge
                      variant={
                        log.status === "ok"
                          ? "secondary"
                          : log.status === "warning"
                            ? "outline"
                            : "destructive"
                      }
                    >
                      {log.status === "ok"
                        ? "Within limit"
                        : log.status === "warning"
                          ? "Check"
                          : "Critical"}
                    </Badge>
                  </td>
                  <td className="p-2 text-muted-foreground">
                    {log.correctiveAction || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
          Logs flagged as critical automatically notify QA and create a
          corrective action task.
        </div>
      </CardContent>
    </Card>
  );
}

function ChecklistBoard({
  tasks,
  onToggle,
  signatures,
  onSignOff,
}: {
  tasks: ChecklistTask[];
  onToggle: (id: string, completed: boolean) => void;
  signatures: { name: string; at: string }[];
  onSignOff: (name: string) => void;
}) {
  const [signer, setSigner] = useState("");
  const [error, setError] = useState("");
  const requiredComplete =
    tasks.filter((task) => task.required && !task.completed).length === 0;

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>Shift compliance checklist</CardTitle>
        <CardDescription>
          Ensure HACCP paperwork and sanitation tasks are complete before
          sign-off.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {tasks.map((task) => (
            <label
              key={task.id}
              className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm"
            >
              <Checkbox
                className="mt-1"
                checked={task.completed}
                onCheckedChange={(next) => onToggle(task.id, Boolean(next))}
              />
              <div>
                <div
                  className={cn(
                    "font-medium",
                    task.completed ? "text-foreground" : "text-foreground/80",
                  )}
                >
                  {task.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {task.required ? "Required" : "Optional"}
                  {task.completedBy ? ` · ${task.completedBy}` : ""}
                </div>
              </div>
            </label>
          ))}
        </div>
        <div className="rounded-lg border p-3 text-xs">
          <div className="font-semibold text-foreground">Sign-off</div>
          {error ? <div className="mt-1 text-destructive">{error}</div> : null}
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Name"
              value={signer}
              onChange={(e) => setSigner(e.target.value)}
            />
            <Button
              variant="secondary"
              onClick={() => {
                if (!signer.trim()) {
                  setError("Enter a name to sign");
                  return;
                }
                if (!requiredComplete) {
                  setError("Complete all required tasks before sign-off");
                  return;
                }
                onSignOff(signer.trim());
                setSigner("");
                setError("");
              }}
            >
              Sign shift
            </Button>
          </div>
          <div className="mt-3 space-y-1">
            {signatures.length === 0 ? (
              <div className="text-muted-foreground">No sign-offs yet.</div>
            ) : (
              signatures.map((sig, idx) => (
                <div
                  key={`${sig.name}-${idx}`}
                  className="flex justify-between text-muted-foreground"
                >
                  <span>{sig.name}</span>
                  <span>{new Date(sig.at).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CorrectiveActionsPanel({
  actions,
  onResolve,
}: {
  actions: CorrectiveAction[];
  onResolve: (id: string, resolution: string) => void;
}) {
  const [resolution, setResolution] = useState<Record<string, string>>({});
  const openActions = actions.filter((action) => action.status === "open");
  const closedActions = actions.filter((action) => action.status === "closed");

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>Corrective actions</CardTitle>
        <CardDescription>
          Track open items and document resolution for inspections.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="open" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="open">Open ({openActions.length})</TabsTrigger>
            <TabsTrigger value="closed">
              Closed ({closedActions.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="open" className="space-y-3">
            {openActions.length === 0 ? (
              <div className="rounded-md bg-emerald-100 p-3 text-xs text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100">
                No open actions. Great job!
              </div>
            ) : (
              openActions.map((action) => (
                <div
                  key={action.id}
                  className="rounded-lg border bg-muted/60 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="font-semibold">{action.description}</div>
                    <Badge variant="outline">{action.owner}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Logged {new Date(action.createdAt).toLocaleString()}
                  </div>
                  <Textarea
                    rows={3}
                    className="mt-2"
                    placeholder="Resolution notes"
                    value={resolution[action.id] ?? ""}
                    onChange={(e) =>
                      setResolution((prev) => ({
                        ...prev,
                        [action.id]: e.target.value,
                      }))
                    }
                  />
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      const note = resolution[action.id]?.trim();
                      if (!note) return;
                      onResolve(action.id, note);
                      setResolution((prev) => ({ ...prev, [action.id]: "" }));
                    }}
                  >
                    Close action
                  </Button>
                </div>
              ))
            )}
          </TabsContent>
          <TabsContent value="closed" className="space-y-3">
            {closedActions.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                No closed actions yet.
              </div>
            ) : (
              closedActions.map((action) => (
                <div
                  key={action.id}
                  className="rounded-lg border bg-muted/40 p-3 text-xs"
                >
                  <div className="font-medium text-foreground">
                    {action.description}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    Closed {new Date(action.createdAt).toLocaleString()} ·{" "}
                    {action.owner}
                  </div>
                  {action.resolutionNotes ? (
                    <div className="mt-1 text-foreground/80">
                      {action.resolutionNotes}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function HaccpComplianceWorkspace() {
  const [tempLogs, setTempLogs] = useState(INITIAL_TEMPERATURE_LOGS);
  const [actions, setActions] = useState(INITIAL_ACTIONS);
  const [tasks, setTasks] = useState(CHECKLIST_TEMPLATE);
  const [signatures, setSignatures] = useState<{ name: string; at: string }[]>(
    [],
  );

  const handleCreateLog = (
    entry: Omit<TemperatureLogEntry, "id" | "status">,
  ) => {
    const status = classifyReading(entry.location, entry.reading);
    const id = generateId("log");
    const log: TemperatureLogEntry = { ...entry, id, status };
    setTempLogs((prev) => [log, ...prev]);
    if (status === "warning" || status === "critical") {
      setActions((prev) => [
        {
          id: generateId("action"),
          description: `${entry.location} reading ${entry.reading}${entry.unit} flagged (${status}).`,
          createdAt: new Date().toISOString(),
          owner: "QA Team",
          status: "open",
          relatedLogId: id,
        },
        ...prev,
      ]);
    }
  };

  const handleResolveAction = (id: string, resolution: string) => {
    setActions((prev) =>
      prev.map((action) =>
        action.id === id
          ? {
              ...action,
              status: "closed",
              resolutionNotes: resolution,
            }
          : action,
      ),
    );
  };

  const handleToggleTask = (taskId: string, completed: boolean) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              completed,
              completedBy: completed ? "QA" : undefined,
              completedAt: completed ? new Date().toISOString() : undefined,
            }
          : task,
      ),
    );
  };

  const handleSignOff = (name: string) => {
    setSignatures((prev) => [{ name, at: new Date().toISOString() }, ...prev]);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <ControlPointBoard points={CONTROL_POINTS} />
        <ChecklistBoard
          tasks={tasks}
          onToggle={handleToggleTask}
          signatures={signatures}
          onSignOff={handleSignOff}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <TemperatureLog logs={tempLogs} onCreate={handleCreateLog} />
        <CorrectiveActionsPanel
          actions={actions}
          onResolve={handleResolveAction}
        />
      </div>
    </div>
  );
}
