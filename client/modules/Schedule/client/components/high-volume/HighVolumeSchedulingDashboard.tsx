/**
 * High-Volume Scheduling Dashboard
 *
 * Interface for processing 100+ BEOs per week
 * Displays shortages, conflicts, and job share opportunities
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Users,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  RefreshCw,
  Download,
  Brain,
} from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/glass";

interface BatchProcessingResult {
  batchId: string;
  weekStart: string;
  weekEnd: string;
  processedBEOs: number;
  generatedSchedules: number;
  conflicts: Array<{
    type: string;
    severity: "critical" | "high" | "medium" | "low";
    description: string;
    affectedBEOs: string[];
  }>;
  shortages: Array<{
    date: string;
    role: string;
    needed: number;
    available: number;
    shortage: number;
    recommendedActions: string[];
  }>;
  processingTime: number;
  status: "processing" | "completed" | "failed" | "partial";
}

function HighVolumeSchedulingDashboard() {
  const { toast } = useToast();
  const [weekStart, setWeekStart] = React.useState(
    format(startOfWeek(new Date()), "yyyy-MM-dd"),
  );
  const [weekEnd, setWeekEnd] = React.useState(
    format(endOfWeek(new Date()), "yyyy-MM-dd"),
  );
  const [processing, setProcessing] = React.useState(false);
  const [result, setResult] = React.useState<BatchProcessingResult | null>(null);
  const [options, setOptions] = React.useState({
    autoResolveConflicts: true,
    allowOvertime: false,
    prioritizeHighPriority: true,
  });

  const handleProcessWeek = async () => {
    setProcessing(true);
    try {
      const response = await fetch("/api/scheduling/batch-process-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart,
          weekEnd,
          options,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
        toast({
          title: "Batch Processing Complete",
          description: `Processed ${data.data.processedBEOs} BEOs in ${(data.data.processingTime / 1000).toFixed(1)}s`,
        });
      } else {
        throw new Error(data.error || "Failed to process batch");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process batch",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-8 h-8 text-primary" />
            High-Volume Scheduling
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Process 100+ BEOs per week with automated conflict detection and
            shortage forecasting
          </p>
        </div>
      </div>

      {/* Week Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Week Selection</CardTitle>
          <CardDescription>Select the week to process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weekStart">Week Start</Label>
              <Input
                id="weekStart"
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekEnd">Week End</Label>
              <Input
                id="weekEnd"
                type="date"
                value={weekEnd}
                onChange={(e) => setWeekEnd(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleProcessWeek}
                disabled={processing}
                className="w-full"
                size="lg"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Process Week
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label>Processing Options</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.autoResolveConflicts}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      autoResolveConflicts: e.target.checked,
                    })
                  }
                />
                <span className="text-sm">Auto-resolve conflicts</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.allowOvertime}
                  onChange={(e) =>
                    setOptions({ ...options, allowOvertime: e.target.checked })
                  }
                />
                <span className="text-sm">Allow overtime</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.prioritizeHighPriority}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      prioritizeHighPriority: e.target.checked,
                    })
                  }
                />
                <span className="text-sm">Prioritize high-priority events</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="shortages">Shortages</TabsTrigger>
            <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
            <TabsTrigger value="schedules">Schedules</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4 mt-4">
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    Processed BEOs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {result.processedBEOs}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    Schedules Generated
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {result.generatedSchedules}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    Shortages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {result.shortages.length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    Processing Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {(result.processingTime / 1000).toFixed(1)}s
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant={
                    result.status === "completed"
                      ? "default"
                      : result.status === "partial"
                        ? "secondary"
                        : "destructive"
                  }
                  className="text-lg px-4 py-2"
                >
                  {result.status.toUpperCase()}
                </Badge>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shortages" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Staff Shortages</CardTitle>
                <CardDescription>
                  {result.shortages.length} shortage(s) identified
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Needed</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Shortage</TableHead>
                      <TableHead>Recommendations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.shortages.map((shortage, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          {format(new Date(shortage.date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {shortage.role}
                        </TableCell>
                        <TableCell>{shortage.needed}</TableCell>
                        <TableCell>{shortage.available}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {shortage.shortage}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ul className="list-disc list-inside text-sm text-muted-foreground">
                            {shortage.recommendedActions.map((action, i) => (
                              <li key={i}>{action}</li>
                            ))}
                          </ul>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conflicts" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Conflicts</CardTitle>
                <CardDescription>
                  {result.conflicts.length} conflict(s) detected
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.conflicts.map((conflict, idx) => (
                    <Alert
                      key={idx}
                      variant={
                        conflict.severity === "critical"
                          ? "destructive"
                          : "default"
                      }
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-semibold mb-1">
                          {conflict.type}
                        </div>
                        <p className="text-sm">{conflict.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Affected BEOs: {conflict.affectedBEOs.join(", ")}
                        </p>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedules" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Generated Schedules</CardTitle>
                <CardDescription>
                  {result.generatedSchedules} schedule(s) created
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Schedule details will be displayed here
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default HighVolumeSchedulingDashboard;
export { HighVolumeSchedulingDashboard };
