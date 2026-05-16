import React, { useMemo } from "react";
import { useMaestro } from "@/contexts/MaestroContext";
import type { ChangelogEntry } from "@shared/types/maestro";
interface ChangelogPanelProps {
  eventId: string;
}
const sourceColors: Record<string, string> = {
  event_planner: "bg-blue-900 text-blue-200",
  chef: "bg-orange-900 text-orange-200",
  system: "bg-green-900 text-green-200",
  guest_management: "bg-purple-900 text-purple-200",
  inventory: "bg-yellow-900 text-yellow-200",
  labor: "bg-pink-900 text-pink-200",
  purchasing: "bg-cyan-900 text-cyan-200",
};
export const ChangelogPanel: React.FC<ChangelogPanelProps> = ({ eventId }) => {
  const { currentEvent, isLoading } = useMaestro();
  const pendingChanges = useMemo(() => {
    return (currentEvent?.changelog ?? []).filter(
      (c) => c.status === "pending",
    );
  }, [currentEvent?.changelog]);
  const recentChanges = useMemo(() => {
    return (currentEvent?.changelog ?? []).slice().reverse().slice(0, 10);
  }, [currentEvent?.changelog]);
  if (isLoading) {
    return (
      <div className="animate-pulse">
        {" "}
        <div className="h-8 bg-slate-700 rounded mb-4" />{" "}
        <div className="space-y-3">
          {" "}
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-700 rounded" />
          ))}{" "}
        </div>{" "}
      </div>
    );
  }
  if (!currentEvent) {
    return <p className="text-slate-400">No event selected</p>;
  }
  return (
    <div>
      {" "}
      <h3 className="text-lg font-semibold text-white mb-4">Change Log</h3>{" "}
      {/* Pending Changes Alert */}{" "}
      {pendingChanges.length > 0 && (
        <div className="bg-yellow-900 border border-yellow-700 rounded p-3 mb-4">
          {" "}
          <div className="text-sm font-semibold text-yellow-200 mb-2">
            {" "}
            {pendingChanges.length} Changes Pending Approval{" "}
          </div>{" "}
          <p className="text-xs text-yellow-300">
            {" "}
            Review and approve changes to update the operational state{" "}
          </p>{" "}
        </div>
      )}{" "}
      {/* Recent Changes */}{" "}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {" "}
        {recentChanges.length === 0 ? (
          <p className="text-slate-400 text-sm">No changes recorded</p>
        ) : (
          recentChanges.map((change) => (
            <div
              key={change.id}
              className={`border rounded p-3 ${change.status === "pending" ? "bg-slate-700 border-yellow-700" : "bg-slate-800 border-border"}`}
            >
              {" "}
              <div className="flex items-start justify-between mb-1">
                {" "}
                <div className="flex-1">
                  {" "}
                  <div className="font-medium text-white text-sm mb-1">
                    {" "}
                    {change.field}{" "}
                  </div>{" "}
                  <div className="flex items-center gap-2">
                    {" "}
                    <span
                      className={`text-xs px-2 py-1 rounded ${sourceColors[change.source] || "bg-slate-700 text-slate-300"}`}
                    >
                      {" "}
                      {change.source}{" "}
                    </span>{" "}
                    <span className="text-xs text-slate-400">
                      {" "}
                      {change.userName || "System"}{" "}
                    </span>{" "}
                  </div>{" "}
                </div>{" "}
                {change.status === "pending" && (
                  <span className="text-xs px-2 py-1 bg-yellow-900 text-yellow-200 rounded">
                    {" "}
                    Pending{" "}
                  </span>
                )}{" "}
              </div>{" "}
              {/* Old vs New Values */}{" "}
              {change.oldValue !== undefined &&
                change.newValue !== undefined && (
                  <div className="text-xs text-slate-400 mt-2 space-y-1">
                    {" "}
                    <div>
                      {" "}
                      <span className="text-red-400">−</span>
                      {""}{" "}
                      <span className="font-mono">
                        {" "}
                        {String(change.oldValue)}{" "}
                      </span>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <span className="text-green-400">+</span>
                      {""}{" "}
                      <span className="font-mono">
                        {" "}
                        {String(change.newValue)}{" "}
                      </span>{" "}
                    </div>{" "}
                  </div>
                )}{" "}
              {/* Affected Systems */}{" "}
              {change.affectedSystems && change.affectedSystems.length > 0 && (
                <div className="text-xs text-slate-400 mt-2">
                  {" "}
                  Impacts: {change.affectedSystems.join(",")}{" "}
                </div>
              )}{" "}
              {/* Timestamp */}{" "}
              <div className="text-xs text-muted-foreground mt-2">
                {" "}
                {new Date(change.timestamp).toLocaleString()}{" "}
              </div>{" "}
              {/* Action Buttons */}{" "}
              {change.status === "pending" && (
                <div className="flex gap-2 mt-3">
                  {" "}
                  <button className="flex-1 text-xs px-2 py-1 bg-green-900 hover:bg-green-800 text-green-200 rounded transition-colors">
                    {" "}
                    Approve{" "}
                  </button>{" "}
                  <button className="flex-1 text-xs px-2 py-1 bg-red-900 hover:bg-red-800 text-red-200 rounded transition-colors">
                    {" "}
                    Reject{" "}
                  </button>{" "}
                </div>
              )}{" "}
            </div>
          ))
        )}{" "}
      </div>{" "}
    </div>
  );
};
