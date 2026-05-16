/** * EventFinancialSummaryPanel * Displays financial summary for an event integrating Aurum data */ import { useEventFinancials } from "@/client/hooks/useEventFinancials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
interface EventFinancialSummaryProps {
  eventId: string;
  beoId?: string;
  className?: string;
}
export function EventFinancialSummaryPanel({
  eventId,
  beoId,
  className,
}: EventFinancialSummaryProps) {
  const { summary, loading, error, isReady } = useEventFinancials(eventId);
  if (loading) {
    return (
      <Card className={className}>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="text-base">Financial Summary</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-3">
          {" "}
          <Skeleton className="h-4 w-3/4" /> <Skeleton className="h-4 w-1/2" />{" "}
          <Skeleton className="h-4 w-full" />{" "}
          <Skeleton className="h-4 w-2/3" />{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  if (error || !summary) {
    return (
      <Card
        className={cn(
          "border-amber-200 bg-amber-50 dark:bg-amber-950/20",
          className,
        )}
      >
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="flex items-center gap-2 text-base text-amber-900 dark:text-amber-300">
            {" "}
            <AlertCircle className="h-5 w-5" /> Financial Summary{" "}
          </CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <p className="text-sm text-amber-700 dark:text-amber-200">
            {" "}
            {error || "Financial data not available yet"}{" "}
          </p>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  const marginPct =
    summary.forecastRevenueTotal > 0
      ? (summary.grossMargin / summary.forecastRevenueTotal) * 100
      : 0;
  const marginHealth =
    marginPct >= 35
      ? "text-green-600 dark:text-green-400"
      : marginPct >= 25
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";
  return (
    <Card className={className}>
      {" "}
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        {" "}
        <div className="flex flex-col gap-1">
          {" "}
          <CardTitle className="text-base">Financial Summary</CardTitle>{" "}
          <p className="text-xs text-muted-foreground">
            {" "}
            Event ID: {eventId}{" "}
          </p>{" "}
        </div>{" "}
        {beoId && <Badge variant="secondary">{beoId}</Badge>}{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-4">
        {" "}
        {/* Revenue Section */}{" "}
        <div className="space-y-2 rounded-lg bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/20 dark:to-blue-950/10 p-3">
          {" "}
          <p className="text-xs font-semibold text-blue-900 dark:text-primary">
            {" "}
            REVENUE{" "}
          </p>{" "}
          <div className="space-y-1.5 text-xs">
            {" "}
            <div className="flex justify-between">
              {" "}
              <span className="text-muted-foreground">Forecast</span>{" "}
              <span className="font-medium">
                {" "}
                {summary.currency}{" "}
                {summary.forecastRevenueTotal.toFixed(2)}{" "}
              </span>{" "}
            </div>{" "}
            <div className="flex justify-between">
              {" "}
              <span className="text-muted-foreground">Billed</span>{" "}
              <span className="font-medium">
                {" "}
                {summary.currency} {summary.billedRevenueTotal.toFixed(2)}{" "}
              </span>{" "}
            </div>{" "}
            <div className="flex justify-between">
              {" "}
              <span className="text-muted-foreground">Paid</span>{" "}
              <span className="font-medium text-green-600 dark:text-green-400">
                {" "}
                {summary.currency} {summary.amountPaidTotal.toFixed(2)}{" "}
              </span>{" "}
            </div>{" "}
            <div className="flex justify-between border-t border-blue-200 dark:border-blue-900 pt-1.5">
              {" "}
              <span className="text-muted-foreground">Outstanding</span>{" "}
              <span
                className={cn(
                  "font-medium",
                  summary.outstandingBalance > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-green-600 dark:text-green-400",
                )}
              >
                {" "}
                {summary.currency} {summary.outstandingBalance.toFixed(2)}{" "}
              </span>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        {/* Cost & Margin Section */}{" "}
        <div className="space-y-2 rounded-lg bg-gradient-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/20 dark:to-purple-950/10 p-3">
          {" "}
          <p className="text-xs font-semibold text-purple-900 dark:text-purple-300">
            {" "}
            PROFITABILITY{" "}
          </p>{" "}
          <div className="space-y-1.5 text-xs">
            {" "}
            <div className="flex justify-between">
              {" "}
              <span className="text-muted-foreground">Total COGS</span>{" "}
              <span className="font-medium">
                {" "}
                {summary.currency} {summary.cogsTotal.toFixed(2)}{" "}
              </span>{" "}
            </div>{" "}
            <div className="flex justify-between">
              {" "}
              <span className="text-muted-foreground">COGS / Cover</span>{" "}
              <span className="font-medium">
                {" "}
                {summary.currency} {summary.cogsPerCover.toFixed(2)}{" "}
              </span>{" "}
            </div>{" "}
            <div className="flex justify-between border-t border-purple-200 dark:border-purple-900 pt-1.5">
              {" "}
              <span className="text-muted-foreground">Gross Margin</span>{" "}
              <span
                className={cn(
                  "font-bold flex items-center gap-1",
                  marginHealth,
                )}
              >
                {" "}
                <TrendingUp className="h-3 w-3" /> {summary.currency}{" "}
                {summary.grossMargin.toFixed(2)}{" "}
                <span className="text-xs opacity-75">
                  {" "}
                  ({marginPct.toFixed(1)}%){" "}
                </span>{" "}
              </span>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        {/* Breakdown */}{" "}
        <div className="space-y-2 text-xs">
          {" "}
          <div className="flex justify-between">
            {" "}
            <span className="text-muted-foreground">Food Revenue</span>{" "}
            <span>
              {summary.currency} {summary.forecastFoodRevenue.toFixed(2)}
            </span>{" "}
          </div>{" "}
          <div className="flex justify-between">
            {" "}
            <span className="text-muted-foreground">Beverage Revenue</span>{" "}
            <span>
              {summary.currency} {summary.forecastBeverageRevenue.toFixed(2)}
            </span>{" "}
          </div>{" "}
        </div>{" "}
        {/* Last Update */}{" "}
        {summary.lastCostUpdatedAt && (
          <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
            {" "}
            Last cost update:{""}{" "}
            {new Date(summary.lastCostUpdatedAt).toLocaleString()}{" "}
          </p>
        )}{" "}
      </CardContent>{" "}
    </Card>
  );
}
export default EventFinancialSummaryPanel;
