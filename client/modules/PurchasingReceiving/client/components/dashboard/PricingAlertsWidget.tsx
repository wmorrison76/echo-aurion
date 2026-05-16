import React from "react";
/** * Pricing Alerts Widget * Dashboard widget to display pricing changes and affected recipes */ import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import type { PricingAlert } from "@/services/invoice-recipe-integration";
interface PricingAlertsWidgetProps {
  alerts: PricingAlert[];
  isLoading?: boolean;
}
export function PricingAlertsWidget({
  alerts,
  isLoading = false,
}: PricingAlertsWidgetProps) {
  const sortedAlerts = useMemo(
    () =>
      [...alerts].sort(
        (a, b) => Math.abs(b.percentageChange) - Math.abs(a.percentageChange),
      ),
    [alerts],
  );
  const topAlerts = sortedAlerts.slice(0, 5);
  const totalImpactedRecipes = useMemo(
    () => new Set(sortedAlerts.flatMap((a) => a.affectedRecipes)).size,
    [sortedAlerts],
  );
  if (isLoading) {
    return (
      <Card className="border border-border bg-slate-800/30">
        {" "}
        <CardHeader className="pb-2">
          {" "}
          <CardTitle className="text-sm">Pricing Alerts</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="animate-pulse space-y-2">
            {" "}
            <div className="h-4 w-3/4 rounded bg-slate-700" />{" "}
            <div className="h-4 w-1/2 rounded bg-slate-700" />{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  if (alerts.length === 0) {
    return (
      <Card className="border border-border bg-slate-800/30">
        {" "}
        <CardHeader className="pb-2">
          {" "}
          <CardTitle className="text-sm">Pricing Alerts</CardTitle>{" "}
          <CardDescription className="text-xs">
            {" "}
            No significant price changes detected{" "}
          </CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-slate-700/20 py-6 text-center">
            {" "}
            <p className="text-xs text-slate-300">
              {" "}
              Monitor pricing changes that affect your menu{" "}
            </p>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  return (
    <Card className="border border-border bg-slate-800/30">
      {" "}
      <CardHeader className="pb-3">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div>
            {" "}
            <CardTitle className="text-sm">Pricing Alerts</CardTitle>{" "}
            <CardDescription className="text-xs">
              {" "}
              {sortedAlerts.length} price change{" "}
              {sortedAlerts.length !== 1 ? "s" : ""} detected{" "}
              {totalImpactedRecipes > 0 &&
                ` • ${totalImpactedRecipes} recipes affected`}{" "}
            </CardDescription>{" "}
          </div>{" "}
          <AlertCircle className="h-4 w-4 text-yellow-500" />{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-3">
        {" "}
        {topAlerts.map((alert, idx) => (
          <div
            key={`${alert.ingredientName}-${alert.vendor}-${idx}`}
            className="space-y-2 rounded-lg border border-border bg-slate-700/20 p-3"
          >
            {" "}
            <div className="flex items-start justify-between gap-2">
              {" "}
              <div>
                {" "}
                <p className="text-sm font-semibold text-slate-50">
                  {" "}
                  {alert.ingredientName}{" "}
                </p>{" "}
                <p className="text-xs text-slate-300">{alert.vendor}</p>{" "}
              </div>{" "}
              <Badge
                variant="outline"
                className={
                  alert.percentageChange > 0
                    ? "border-red-500/50 bg-red-500/20 text-red-200"
                    : "border-green-500/50 bg-green-500/20 text-green-200"
                }
              >
                {" "}
                <span className="flex items-center gap-1">
                  {" "}
                  {alert.percentageChange > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}{" "}
                  {Math.abs(alert.percentageChange).toFixed(1)}%{" "}
                </span>{" "}
              </Badge>{" "}
            </div>{" "}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {" "}
              <div className="rounded bg-slate-700/40 p-2">
                {" "}
                <p className="text-slate-300">Previous</p>{" "}
                <p className="font-semibold text-slate-50">
                  {" "}
                  ${alert.previousPrice.toFixed(2)}{" "}
                </p>{" "}
              </div>{" "}
              <div className="rounded bg-slate-700/40 p-2">
                {" "}
                <p className="text-slate-300">Current</p>{" "}
                <p className="font-semibold text-slate-50">
                  {" "}
                  ${alert.currentPrice.toFixed(2)}{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
            {alert.affectedRecipes.length > 0 && (
              <div className="rounded bg-slate-700/30 p-2">
                {" "}
                <p className="text-xs font-semibold text-slate-200 mb-1">
                  {" "}
                  Affected Recipes ({alert.affectedRecipes.length}){" "}
                </p>{" "}
                <div className="flex flex-wrap gap-1">
                  {" "}
                  {alert.affectedRecipes.map((recipe) => (
                    <Badge key={recipe} variant="secondary" className="text-xs">
                      {" "}
                      {recipe}{" "}
                    </Badge>
                  ))}{" "}
                </div>{" "}
              </div>
            )}{" "}
          </div>
        ))}{" "}
        {sortedAlerts.length > topAlerts.length && (
          <p className="text-xs text-slate-400">
            {" "}
            +{sortedAlerts.length - topAlerts.length} more alert{" "}
            {sortedAlerts.length - topAlerts.length !== 1 ? "s" : ""}{" "}
          </p>
        )}{" "}
      </CardContent>{" "}
    </Card>
  );
}
