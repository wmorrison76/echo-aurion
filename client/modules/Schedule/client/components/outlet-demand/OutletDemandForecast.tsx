/**
 * Outlet Demand Forecast Dashboard
 *
 * Forecasts guest counts and peak times for outlets
 * Generates job share opportunities for peak periods
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
  Store,
  TrendingUp,
  Users,
  Clock,
  Brain,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/glass";

interface OutletDemandForecast {
  outletId: string;
  outletName: string;
  dailyForecasts: Array<{
    date: string;
    dayOfWeek: string;
    expectedGuestCount: number;
    confidence: number;
    peakPeriods: Array<{
      period: string;
      startTime: string;
      endTime: string;
      expectedGuestCount: number;
      peakIntensity: "low" | "medium" | "high" | "extreme";
      staffNeeded: number;
      currentStaff: number;
      shortage: number;
      jobShareOpportunities: number;
    }>;
    totalStaffNeeded: number;
    currentStaff: number;
    totalShortage: number;
  }>;
  summary: {
    totalExpectedGuests: number;
    averageDailyGuests: number;
    peakDays: number;
    totalJobShareOpportunities: number;
    estimatedRevenue: number;
  };
}

interface StaffingForecastResponse {
  success: boolean;
  data: {
    outletId: string;
    startDate: string;
    endDate: string;
    staffing: Array<{
      date: string;
      guestCount: number;
      banquetGuests: number;
      breakdown: {
        front_of_house: number;
        back_of_house: number;
        stewarding: number;
        banquet_ops: number;
        housekeeping: number;
        front_desk: number;
        bell_services: number;
      };
    }>;
    totals: {
      front_of_house: number;
      back_of_house: number;
      stewarding: number;
      banquet_ops: number;
      housekeeping: number;
      front_desk: number;
      bell_services: number;
    };
  };
}

function OutletDemandForecast() {
  const { toast } = useToast();
  const [outletId, setOutletId] = React.useState("");
  const [startDate, setStartDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = React.useState(
    format(addDays(new Date(), 7), "yyyy-MM-dd"),
  );
  const [forecasting, setForecasting] = React.useState(false);
  const [forecast, setForecast] = React.useState<OutletDemandForecast | null>(null);
  const [staffingForecast, setStaffingForecast] = React.useState<
    StaffingForecastResponse["data"] | null
  >(null);
  const [staffingLoading, setStaffingLoading] = React.useState(false);

  const handleForecast = async () => {
    if (!outletId) {
      toast({
        title: "Error",
        description: "Please select an outlet",
        variant: "destructive",
      });
      return;
    }

    setForecasting(true);
    try {
      const response = await fetch("/api/scheduling/forecast-outlet-demand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          startDate,
          endDate,
          lookBackDays: 90,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setForecast(data.data);
        toast({
          title: "Forecast Complete",
          description: `Forecasted ${data.data.summary.totalExpectedGuests} guests`,
        });
        setStaffingForecast(null);
      } else {
        throw new Error(data.error || "Failed to forecast");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to forecast demand",
        variant: "destructive",
      });
    } finally {
      setForecasting(false);
    }
  };

  const handleStaffingForecast = async () => {
    if (!outletId) return;
    setStaffingLoading(true);
    try {
      const response = await fetch(
        "/api/schedule-forecasting/forecast/resort-staffing",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outletId,
            startDate,
            endDate,
          }),
        },
      );
      const data = await response.json();
      if (data.success) {
        setStaffingForecast(data.data);
        toast({
          title: "Staffing Forecast Ready",
          description: `Computed staffing for ${data.data.staffing.length} day(s)`,
        });
      } else {
        throw new Error(data.error || "Failed to forecast staffing");
      }
    } catch (error: any) {
      toast({
        title: "Staffing Forecast Error",
        description: error.message || "Failed to forecast staffing",
        variant: "destructive",
      });
    } finally {
      setStaffingLoading(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Store className="w-8 h-8 text-primary" />
            Outlet Demand Forecast
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Forecast guest counts and peak times for outlets, generate job share
            opportunities
          </p>
        </div>
      </div>

      {/* Forecast Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Forecast Parameters</CardTitle>
          <CardDescription>Select outlet and forecast period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="outletId">Outlet</Label>
              <Input
                id="outletId"
                placeholder="Enter outlet ID"
                value={outletId}
                onChange={(e) => setOutletId(e.target.value)}
              />
            </div>
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
            <div className="flex items-end gap-3">
              <Button
                onClick={handleForecast}
                disabled={forecasting || !outletId}
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
              <Button
                onClick={handleStaffingForecast}
                disabled={staffingLoading || !outletId}
                className="w-full"
                size="lg"
                variant="outline"
              >
                {staffingLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Staffing...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Staffing Forecast
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
                  Total Guests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {forecast.summary.totalExpectedGuests.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Avg Daily
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {forecast.summary.averageDailyGuests}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Peak Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {forecast.summary.peakDays}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Job Shares
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
                  Est. Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${forecast.summary.estimatedRevenue.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Forecasts */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Forecasts</CardTitle>
              <CardDescription>
                {forecast.dailyForecasts.length} day(s) forecasted
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {forecast.dailyForecasts.map((daily, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {format(new Date(daily.date), "EEEE, MMM d, yyyy")}
                          </CardTitle>
                          <CardDescription>
                            {daily.expectedGuestCount} guests expected •{" "}
                            {daily.confidence}% confidence
                          </CardDescription>
                        </div>
                        {daily.totalShortage > 0 && (
                          <Badge variant="destructive">
                            {daily.totalShortage} shortage(s)
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {daily.peakPeriods.map((peak, pIdx) => (
                          <div
                            key={pIdx}
                            className={cn(
                              "p-3 rounded-lg border",
                              peak.peakIntensity === "extreme"
                                ? "bg-red-500/10 border-red-500/20"
                                : peak.peakIntensity === "high"
                                  ? "bg-orange-500/10 border-orange-500/20"
                                  : peak.peakIntensity === "medium"
                                    ? "bg-yellow-500/10 border-yellow-500/20"
                                    : "bg-muted border-border",
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="font-semibold text-foreground capitalize">
                                  {peak.period}
                                </span>
                                <Badge
                                  variant={
                                    peak.peakIntensity === "extreme"
                                      ? "destructive"
                                      : peak.peakIntensity === "high"
                                        ? "default"
                                        : "secondary"
                                  }
                                >
                                  {peak.peakIntensity}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(peak.startTime), "h:mm a")} -{" "}
                                {format(new Date(peak.endTime), "h:mm a")}
                              </div>
                            </div>
                            <div className="grid grid-cols-5 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">
                                  Guests:
                                </span>
                                <span className="font-semibold ml-2">
                                  {peak.expectedGuestCount}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Staff Needed:
                                </span>
                                <span className="font-semibold ml-2">
                                  {peak.staffNeeded}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Current:
                                </span>
                                <span className="font-semibold ml-2">
                                  {peak.currentStaff}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Shortage:
                                </span>
                                <span
                                  className={cn(
                                    "font-semibold ml-2",
                                    peak.shortage > 0 && "text-destructive",
                                  )}
                                >
                                  {peak.shortage}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Job Shares:
                                </span>
                                <Badge variant="outline" className="ml-2">
                                  {peak.jobShareOpportunities}
                                </Badge>
                              </div>
                            </div>
                            {peak.jobShareOpportunities > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                                onClick={() => {
                                  toast({
                                    title: "Job Share Postings",
                                    description: `Creating ${peak.jobShareOpportunities} job share postings for ${peak.period}...`,
                                  });
                                }}
                              >
                                Create Job Shares
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {staffingForecast && (
        <Card>
          <CardHeader>
            <CardTitle>Staffing Breakdown (FOH / BOH / Stewarding)</CardTitle>
            <CardDescription>
              Includes banquet ops, housekeeping, front desk, and bell services.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Guests</TableHead>
                    <TableHead className="text-right">FOH</TableHead>
                    <TableHead className="text-right">BOH</TableHead>
                    <TableHead className="text-right">Steward</TableHead>
                    <TableHead className="text-right">Banquet</TableHead>
                    <TableHead className="text-right">Housekeeping</TableHead>
                    <TableHead className="text-right">Front Desk</TableHead>
                    <TableHead className="text-right">Bell</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffingForecast.staffing.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell>
                        {format(new Date(day.date), "MMM d")}
                      </TableCell>
                      <TableCell className="text-right">
                        {day.guestCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {day.breakdown.front_of_house}
                      </TableCell>
                      <TableCell className="text-right">
                        {day.breakdown.back_of_house}
                      </TableCell>
                      <TableCell className="text-right">
                        {day.breakdown.stewarding}
                      </TableCell>
                      <TableCell className="text-right">
                        {day.breakdown.banquet_ops}
                      </TableCell>
                      <TableCell className="text-right">
                        {day.breakdown.housekeeping}
                      </TableCell>
                      <TableCell className="text-right">
                        {day.breakdown.front_desk}
                      </TableCell>
                      <TableCell className="text-right">
                        {day.breakdown.bell_services}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default OutletDemandForecast;
export { OutletDemandForecast };
