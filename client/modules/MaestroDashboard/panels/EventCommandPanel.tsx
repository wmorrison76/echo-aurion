import React, { useMemo } from "react";
import { useMaestro } from "@/contexts/MaestroContext";
import { PermissionButton } from "@/lib/maestro-role-guard";
import type { RiskFlag } from "@shared/types/maestro";
interface EventCommandPanelProps {
  eventId: string;
}
const severityColors: Record<string, string> = {
  critical: "bg-red-900 text-red-200 border-red-700",
  high: "bg-orange-900 text-orange-200 border-orange-700",
  medium: "bg-yellow-900 text-yellow-200 border-yellow-700",
  low: "bg-blue-900 text-blue-200 border-blue-700",
};
export const EventCommandPanel: React.FC<EventCommandPanelProps> = ({
  eventId,
}) => {
  const { currentEvent, isLoading } = useMaestro();
  const riskSummary = useMemo(() => {
    if (!currentEvent?.riskFlags)
      return { critical: 0, high: 0, medium: 0, low: 0 };
    return currentEvent.riskFlags.reduce(
      (acc, flag) => {
        acc[flag.severity] = (acc[flag.severity] ?? 0) + 1;
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>,
    );
  }, [currentEvent?.riskFlags]);
  if (isLoading) {
    return (
      <div className="animate-pulse">
        {" "}
        <div className="h-8 bg-slate-700 rounded mb-4 w-3/4" />{" "}
        <div className="h-20 bg-slate-700 rounded" />{" "}
      </div>
    );
  }
  if (!currentEvent) {
    return <p className="text-slate-400">No event selected</p>;
  }
  return (
    <div>
      {" "}
      {/* Event Header */}{" "}
      <div className="mb-6">
        {" "}
        <h2 className="text-2xl font-bold text-white mb-2">
          {" "}
          {currentEvent.name}{" "}
        </h2>{" "}
        <div className="flex items-center gap-3">
          {" "}
          <span
            className={`px-3 py-1 rounded text-sm font-medium ${currentEvent.status === "confirmed" ? "bg-green-900 text-green-200" : currentEvent.status === "in_production" ? "bg-blue-900 text-blue-200" : currentEvent.status === "draft" ? "bg-slate-700 text-slate-300" : "bg-gray-900 text-gray-200"}`}
          >
            {" "}
            {currentEvent.status}{" "}
          </span>{" "}
          <span className="text-slate-300 text-sm">
            {" "}
            {new Date(currentEvent.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
          </span>{" "}
        </div>{" "}
      </div>{" "}
      {/* Event Metrics */}{" "}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {" "}
        <div className="bg-slate-700 rounded p-3">
          {" "}
          <div className="text-xs text-slate-400 mb-1">Guest Count</div>{" "}
          <div className="text-2xl font-bold text-white">
            {" "}
            {currentEvent.guestCount}{" "}
          </div>{" "}
          <div className="text-xs text-muted-foreground">
            {" "}
            ({currentEvent.guaranteedGuests} guaranteed){" "}
          </div>{" "}
        </div>{" "}
        <div className="bg-slate-700 rounded p-3">
          {" "}
          <div className="text-xs text-slate-400 mb-1">Recipes</div>{" "}
          <div className="text-2xl font-bold text-white">
            {" "}
            {currentEvent.recipes.length}{" "}
          </div>{" "}
          <div className="text-xs text-muted-foreground">
            in production plan
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Risk Summary */}{" "}
      {(riskSummary.critical ||
        riskSummary.high ||
        riskSummary.medium ||
        riskSummary.low) > 0 && (
        <div className="mb-6">
          {" "}
          <h3 className="text-sm font-semibold text-white mb-3">
            {" "}
            Operational Risks{" "}
          </h3>{" "}
          <div className="grid grid-cols-4 gap-2">
            {" "}
            {(["critical", "high", "medium", "low"] as const).map(
              (severity) => (
                <div
                  key={severity}
                  className={`${severityColors[severity]} border rounded p-2 text-center`}
                >
                  {" "}
                  <div className="text-lg font-bold">
                    {" "}
                    {riskSummary[severity] ?? 0}{" "}
                  </div>{" "}
                  <div className="text-xs capitalize">{severity}</div>{" "}
                </div>
              ),
            )}{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Top Risks */}{" "}
      {currentEvent.riskFlags && currentEvent.riskFlags.length > 0 && (
        <div>
          {" "}
          <h3 className="text-sm font-semibold text-white mb-3">
            Top Issues
          </h3>{" "}
          <div className="space-y-2">
            {" "}
            {currentEvent.riskFlags.slice(0, 3).map((risk) => (
              <div
                key={risk.id}
                className={`${severityColors[risk.severity]} border rounded p-3`}
              >
                {" "}
                <div className="font-medium text-sm">{risk.message}</div>{" "}
                {risk.suggestedAction && (
                  <div className="text-xs mt-1 opacity-90">
                    {" "}
                    {risk.suggestedAction}{" "}
                  </div>
                )}{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Quick Actions */}{" "}
      <div className="mt-6 pt-4 border-t border-border space-y-2">
        {" "}
        <PermissionButton
          action="edit"
          panelId="event_command"
          className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium text-sm transition-colors"
          permissionDeniedText="You don't have permission to confirm events"
        >
          {" "}
          Confirm Event{" "}
        </PermissionButton>{" "}
        <PermissionButton
          action="edit"
          panelId="event_command"
          className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded font-medium text-sm transition-colors"
          permissionDeniedText="You don't have permission to edit events"
        >
          {" "}
          Edit Details{" "}
        </PermissionButton>{" "}
      </div>{" "}
    </div>
  );
};
