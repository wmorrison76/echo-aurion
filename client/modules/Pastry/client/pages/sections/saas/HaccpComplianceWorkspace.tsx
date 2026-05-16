import * as React from "react";

import { AlertTriangle, ClipboardCheck, ThermometerSun } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Severity = "ok" | "warning" | "critical";

type ControlPoint = {
  id: string;
  step: string;
  hazard: string;
  criticalLimit: string;
  monitoring: string;
};

type TempLog = {
  id: string;
  location: string;
  product: string;
  readingC: number;
  takenAt: string;
  takenBy: string;
  severity: Severity;
  correctiveAction?: string;
};

const CONTROL_POINTS: ControlPoint[] = [
  {
    id: "ccp-01",
    step: "Cook pastry cream",
    hazard: "Biological",
    criticalLimit: "≥ 82°C (180°F)",
    monitoring: "Probe center of batch before cooling",
  },
  {
    id: "ccp-02",
    step: "Blast chill fillings",
    hazard: "Biological",
    criticalLimit: "≤ 5°C within 6 hours",
    monitoring: "Chiller log + spot probe",
  },
  {
    id: "ccp-03",
    step: "Cold holding",
    hazard: "Biological",
    criticalLimit: "≤ 4°C",
    monitoring: "Walk-in checks twice daily",
  },
];

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function classify(location: string, readingC: number): Severity {
  const loc = location.toLowerCase();
  if (loc.includes("walk") || loc.includes("cool")) {
    if (readingC > 6) return "critical";
    if (readingC > 4) return "warning";
    return "ok";
  }
  if (loc.includes("blast")) {
    if (readingC > 7) return "critical";
    if (readingC > 5) return "warning";
    return "ok";
  }
  if (loc.includes("kettle") || loc.includes("cook")) {
    if (readingC < 80) return "warning";
    if (readingC < 78) return "critical";
    return "ok";
  }
  return "ok";
}

const SEVERITY_BADGE: Record<Severity, { label: string; variant: "secondary" | "destructive" | "outline" }> = {
  ok: { label: "OK", variant: "secondary" },
  warning: { label: "Warning", variant: "outline" },
  critical: { label: "Critical", variant: "destructive" },
};

export default function HaccpComplianceWorkspace() {
  const [logs, setLogs] = React.useState<TempLog[]>(() => [
    {
      id: "log-001",
      location: "Walk-in Cooler",
      product: "Whipped cream",
      readingC: 3.6,
      takenAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
      takenBy: "QA",
      severity: "ok",
    },
    {
      id: "log-002",
      location: "Blast Chiller",
      product: "Chocolate mousse",
      readingC: 6.1,
      takenAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
      takenBy: "Line",
      severity: "warning",
      correctiveAction: "Rotate trays, extend chill 15 minutes",
    },
  ]);

  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({
    location: "Walk-in Cooler",
    product: "",
    readingC: "4.0",
    takenBy: "",
    correctiveAction: "",
  });

  const stats = React.useMemo(() => {
    const total = logs.length;
    const warning = logs.filter((l) => l.severity === "warning").length;
    const critical = logs.filter((l) => l.severity === "critical").length;
    return { total, warning, critical };
  }, [logs]);

  const submit = React.useCallback(() => {
    const reading = Number(draft.readingC);
    if (!draft.product.trim()) return;
    if (!draft.takenBy.trim()) return;
    if (!Number.isFinite(reading)) return;

    const severity = classify(draft.location, reading);

    setLogs((prev) => [
      {
        id: newId("log"),
        location: draft.location,
        product: draft.product.trim(),
        readingC: reading,
        takenAt: new Date().toISOString(),
        takenBy: draft.takenBy.trim(),
        severity,
        correctiveAction: draft.correctiveAction.trim() || undefined,
      },
      ...prev,
    ]);

    setDraft((p) => ({ ...p, product: "", takenBy: "", correctiveAction: "" }));
    setOpen(false);
  }, [draft]);

  return (
    <div className="space-y-4">
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            HACCP compliance
          </CardTitle>
          <CardDescription>
            Lightweight monitoring board for CCPs, temperature logs, and corrective action notes.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Logs</div>
              <div className="text-xl font-semibold">{stats.total}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Warnings</div>
              <div className="text-xl font-semibold">{stats.warning}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Critical</div>
              <div className="text-xl font-semibold">{stats.critical}</div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle>Critical control points</CardTitle>
                <CardDescription>Reference CCPs for pastry production steps.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {CONTROL_POINTS.map((p) => (
                  <div key={p.id} className="rounded-lg border bg-muted/40 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{p.step}</div>
                        <div className="text-xs text-muted-foreground">Hazard: {p.hazard}</div>
                      </div>
                      <Badge variant="outline">{p.criticalLimit}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">Monitoring: {p.monitoring}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ThermometerSun className="h-5 w-5" />
                    Temperature logs
                  </CardTitle>
                  <CardDescription>Log readings and document corrective action when needed.</CardDescription>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">New log</Button>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                      <DialogTitle>New temperature log</DialogTitle>
                      <DialogDescription>
                        Enter the reading and the system will classify it (ok / warning / critical).
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1 text-sm">
                        <span className="text-muted-foreground">Location</span>
                        <Input
                          value={draft.location}
                          onChange={(e) => setDraft((p) => ({ ...p, location: e.target.value }))}
                        />
                      </label>

                      <label className="grid gap-1 text-sm">
                        <span className="text-muted-foreground">Reading (°C)</span>
                        <Input
                          inputMode="decimal"
                          value={draft.readingC}
                          onChange={(e) => setDraft((p) => ({ ...p, readingC: e.target.value }))}
                        />
                      </label>

                      <label className="grid gap-1 text-sm sm:col-span-2">
                        <span className="text-muted-foreground">Product / sample</span>
                        <Input
                          value={draft.product}
                          onChange={(e) => setDraft((p) => ({ ...p, product: e.target.value }))}
                          placeholder="e.g., Pastry cream"
                        />
                      </label>

                      <label className="grid gap-1 text-sm sm:col-span-2">
                        <span className="text-muted-foreground">Taken by</span>
                        <Input
                          value={draft.takenBy}
                          onChange={(e) => setDraft((p) => ({ ...p, takenBy: e.target.value }))}
                        />
                      </label>

                      <label className="grid gap-1 text-sm sm:col-span-2">
                        <span className="text-muted-foreground">Corrective action (optional)</span>
                        <Textarea
                          rows={3}
                          value={draft.correctiveAction}
                          onChange={(e) =>
                            setDraft((p) => ({ ...p, correctiveAction: e.target.value }))
                          }
                        />
                      </label>
                    </div>

                    <DialogFooter>
                      <Button variant="secondary" onClick={() => setOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={submit}
                        disabled={!draft.product.trim() || !draft.takenBy.trim()}
                      >
                        Save
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>

              <CardContent>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Location</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">°C</TableHead>
                        <TableHead>When</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.location}</TableCell>
                          <TableCell>
                            <div>{log.product}</div>
                            {log.correctiveAction ? (
                              <div className="mt-1 flex items-start gap-2 text-xs text-muted-foreground">
                                <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                                <span>{log.correctiveAction}</span>
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right">{log.readingC.toFixed(1)}</TableCell>
                          <TableCell>{new Date(log.takenAt).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={SEVERITY_BADGE[log.severity].variant}>
                              {SEVERITY_BADGE[log.severity].label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
