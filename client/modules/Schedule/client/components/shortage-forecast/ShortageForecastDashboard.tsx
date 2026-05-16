/**
 * Shortage Forecast Dashboard
 *
 * Displays staff shortage forecasts 4+ weeks ahead
 * Shows job share opportunities and recommendations
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
  TrendingUp,
  AlertTriangle,
  Calendar,
  Users,
  Brain,
  RefreshCw,
  Download,
} from "lucide-react";
import { format, addWeeks } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/glass";

interface ShortageForecast {
  forecastId: string;
  forecastPeriod: {
    start: string;
    end: string;
  };
  shortages: Array<{
    date: string;
    role: string;
    roleName: string;
    needed: number;
    available: number;
    shortage: number;
    confidence: number;
    severity: "critical" | "high" | "medium" | "low";
    recommendedActions: string[];
    jobShareOpportunities: number;
  }>;
  summary: {
    totalShortageDays: number;
    criticalShortages: number;
    highShortages: number;
    totalJobShareOpportunities: number;
    estimatedCost: number;
  };
  recommendations: Array<{
    type: string;
    priority: string;
    description: string;
    affectedRoles: string[];
    estimatedCost?: number;
    timeline: string;
  }>;
}

function ShortageForecastDashboard() {
  const { toast } = useToast();
  const [startDate, setStartDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = React.useState(
    format(addWeeks(new Date(), 4), "yyyy-MM-dd"),
  );
  const [forecasting, setForecasting] = React.useState(false);
  const [forecast, setForecast] = React.useState<ShortageForecast | null>(null);

  const handleForecast = async () => {
    setForecasting(true);
    try {
      const response = await fetch("/api/scheduling/forecast-shortages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          lookAheadWeeks: 4,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setForecast(data.data);
        toast({
          title: "Forecast Complete",
          description: `Identified ${data.data.summary.totalShortageDays} shortage days`,
        });
      } else {
        throw new Error(data.error || "Failed to forecast");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to forecast shortages",
        variant: "destructive",
      });
    } finally {
      setForecasting(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-primary" />
            Staff Shortage Forecast
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Forecast staff shortages 4+ weeks ahead and generate job share
            opportunities
          </p>
        </div>
      </div>

      {/* Forecast Period */}
      <Card>
        <CardHeader>
          <CardTitle>Forecast Period</CardTitle>
          <CardDescription>Select the period to forecast</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleForecast}
                disabled={forecasting}
                className="w-full"
                size="lg"
              >
                {forecasting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Forecasting...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Generate Forecast
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forecast Results */}
      {forecast && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Shortage Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {forecast.summary.totalShortageDays}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Critical
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {forecast.summary.criticalShortages}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  High Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {forecast.summary.highShortages}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Job Share Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {forecast.summary.totalJobShareOpportunities}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Est. Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ${forecast.summary.estimatedCost.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Shortages Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Shortages</CardTitle>
              <CardDescription>
                {forecast.shortages.length} shortage(s) identified
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
                    <TableHead>Severity</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Job Shares</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecast.shortages.map((shortage, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {format(new Date(shortage.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {shortage.roleName}
                      </TableCell>
                      <TableCell>{shortage.needed}</TableCell>
                      <TableCell>{shortage.available}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{shortage.shortage}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            shortage.severity === "critical"
                              ? "destructive"
                              : shortage.severity === "high"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {shortage.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>{shortage.confidence}%</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {shortage.jobShareOpportunities}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Generate job share postings
                            toast({
                              title: "Job Share Postings",
                              description: `Creating ${shortage.jobShareOpportunities} job share postings...`,
                            });
                          }}
                        >
                          Create Job Shares
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>
                {forecast.recommendations.length} recommendation(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {forecast.recommendations.map((rec, idx) => (
                  <Alert key={idx}>
                    <Brain className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold mb-1">
                            {rec.description}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Timeline: {rec.timeline} • Cost: $
                            {rec.estimatedCost?.toLocaleString() || "N/A"}
                          </div>
                        </div>
                        <Badge
                          variant={
                            rec.priority === "critical"
                              ? "destructive"
                              : "default"
                          }
                        >
                          {rec.priority}
                        </Badge>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default ShortageForecastDashboard;
export { ShortageForecastDashboard };
