/**
 * AI Schedule Generator Panel
 *
 * Interface for generating AI-powered schedules from BEO/REO events
 * Integrates with performance tracking and staff preferences
 */

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Brain,
  Calendar,
  Users,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  createEmptyShifts,
  saveSchedule,
  startOfWeekISO,
  weekdayToDayKey,
  type ScheduleState,
} from "../../lib/schedule";

interface ScheduleAssignment {
  employeeId: string;
  employeeName: string;
  role: string;
  startTime: string;
  endTime: string;
  matchScore: number;
  reasoning: string;
}

interface GeneratedSchedule {
  eventId: string;
  eventDate: string;
  assignments: ScheduleAssignment[];
  summary: {
    totalStaff: number;
    totalHours: number;
    estimatedCost: number;
    coverageScore: number;
    preferenceScore: number;
    skillMatchScore: number;
  };
  conflicts: Array<{
    employeeId: string;
    conflictType: string;
    description: string;
    severity: "low" | "medium" | "high";
  }>;
  recommendations: string[];
  confidence: number;
}

function AIScheduleGeneratorPanel() {
  const { toast } = useToast();
  const [eventId, setEventId] = React.useState("");
  const [beoId, setBeoId] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [schedule, setSchedule] = React.useState<GeneratedSchedule | null>(null);
  const [options, setOptions] = React.useState({
    respectPreferences: true,
    allowOvertime: false,
    minSkillMatch: 70,
    prioritizePerformance: true,
  });

  const applyScheduleToShiftflow = async (generated: GeneratedSchedule) => {
    const weekStartISO = startOfWeekISO(new Date(generated.eventDate));
    const employeesMap = new Map<
      string,
      { id: string; name: string; role?: string }
    >();

    const state: ScheduleState = {
      weekStartISO,
      employees: [],
    };

    for (const assignment of generated.assignments) {
      if (!employeesMap.has(assignment.employeeId)) {
        employeesMap.set(assignment.employeeId, {
          id: assignment.employeeId,
          name: assignment.employeeName,
          role: assignment.role,
        });
      }
    }

    for (const employee of employeesMap.values()) {
      state.employees.push({
        id: employee.id,
        name: employee.name,
        role: employee.role,
        shifts: createEmptyShifts(),
      });
    }

    const employeeById = new Map(state.employees.map((e) => [e.id, e]));

    for (const assignment of generated.assignments) {
      const row = employeeById.get(assignment.employeeId);
      if (!row) continue;

      const start = new Date(assignment.startTime);
      const end = new Date(assignment.endTime);
      const dayKey = weekdayToDayKey(start.getDay());
      const formatTime = (d: Date) =>
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const inTime = formatTime(start);
      const outTime = formatTime(end);
      row.shifts[dayKey] = {
        ...row.shifts[dayKey],
        in: inTime,
        out: outTime,
        value: `${inTime}-${outTime}`,
        position: assignment.role,
      };
    }

    saveSchedule(state);
    try {
      localStorage.setItem("shiftflow:focusWeekStartISO", weekStartISO);
    } catch {
      // ignore
    }

    try {
      await fetch("/api/schedule/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlet: "Main", weekStartISO, data: state }),
      });
    } catch {
      // ignore
    }
  };

  const handleGenerate = async () => {
    if (!eventId) {
      toast({
        title: "Error",
        description: "Event ID is required",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/performance/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          beoId: beoId || undefined,
          options,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSchedule(data.data);
        toast({
          title: "Schedule Generated",
          description: `Generated schedule with ${data.data.assignments.length} assignments`,
        });
      } else {
        throw new Error(data.error || "Failed to generate schedule");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate schedule",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!schedule) return;

    try {
      await applyScheduleToShiftflow(schedule);
      toast({
        title: "Schedule Approved",
        description: "Schedule has been synced to Shiftflow",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve schedule",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" />
            AI Schedule Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automatically generate optimal schedules from BEO/REO events
          </p>
        </div>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>Event Information</CardTitle>
          <CardDescription>
            Enter event details to generate schedule
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventId">Event ID *</Label>
              <Input
                id="eventId"
                placeholder="Enter event ID"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="beoId">BEO ID (Optional)</Label>
              <Input
                id="beoId"
                placeholder="Enter BEO ID"
                value={beoId}
                onChange={(e) => setBeoId(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Generation Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="respectPreferences"
                  checked={options.respectPreferences}
                  onCheckedChange={(checked) =>
                    setOptions({
                      ...options,
                      respectPreferences: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="respectPreferences" className="cursor-pointer">
                  Respect staff preferences
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allowOvertime"
                  checked={options.allowOvertime}
                  onCheckedChange={(checked) =>
                    setOptions({
                      ...options,
                      allowOvertime: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="allowOvertime" className="cursor-pointer">
                  Allow overtime if needed
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="prioritizePerformance"
                  checked={options.prioritizePerformance}
                  onCheckedChange={(checked) =>
                    setOptions({
                      ...options,
                      prioritizePerformance: checked as boolean,
                    })
                  }
                />
                <Label
                  htmlFor="prioritizePerformance"
                  className="cursor-pointer"
                >
                  Prioritize high performers
                </Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minSkillMatch">Minimum Skill Match (%)</Label>
              <Input
                id="minSkillMatch"
                type="number"
                min="0"
                max="100"
                value={options.minSkillMatch}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    minSkillMatch: parseInt(e.target.value) || 70,
                  })
                }
              />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!eventId || generating}
            className="w-full"
            size="lg"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Generate Schedule
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Schedule */}
      {schedule && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Generated Schedule</CardTitle>
                <CardDescription>
                  Event Date: {format(new Date(schedule.eventDate), "PPP")}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={schedule.confidence >= 80 ? "default" : "secondary"}
                >
                  {schedule.confidence}% Confidence
                </Badge>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button onClick={handleApprove} size="sm">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Sync to Schedule
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Total Staff
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {schedule.summary.totalStaff}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Total Hours
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {schedule.summary.totalHours}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Est. Cost
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    ${schedule.summary.estimatedCost.toFixed(0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Coverage
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {schedule.summary.coverageScore.toFixed(0)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Conflicts */}
            {schedule.conflicts.length > 0 && (
              <Alert
                variant={
                  schedule.conflicts.some((c) => c.severity === "high")
                    ? "destructive"
                    : "default"
                }
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">
                    {schedule.conflicts.length} Conflict(s) Detected
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {schedule.conflicts.map((conflict, idx) => (
                      <li key={idx}>
                        <span
                          className={cn(
                            conflict.severity === "high"
                              ? "text-destructive font-semibold"
                              : conflict.severity === "medium"
                                ? "text-yellow-600"
                                : "text-muted-foreground",
                          )}
                        >
                          {conflict.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Assignments Table */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Staff Assignments
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Match Score</TableHead>
                    <TableHead>Reasoning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.assignments.map((assignment, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {assignment.employeeName}
                      </TableCell>
                      <TableCell>{assignment.role}</TableCell>
                      <TableCell>
                        {format(new Date(assignment.startTime), "h:mm a")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(assignment.endTime), "h:mm a")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            assignment.matchScore >= 80
                              ? "default"
                              : "secondary"
                          }
                        >
                          {assignment.matchScore}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                        {assignment.reasoning}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Recommendations */}
            {schedule.recommendations.length > 0 && (
              <Alert>
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">AI Recommendations</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {schedule.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AIScheduleGeneratorPanel;
export { AIScheduleGeneratorPanel };
