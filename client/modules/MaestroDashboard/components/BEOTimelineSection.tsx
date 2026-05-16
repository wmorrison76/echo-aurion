/** * BEO Timeline Section * * Displays timestamped changes to the BEO in minimal format. * Shows change type and summary only (not full details). */ import React from "react";
import { Card } from "@/components/ui/card";
import type { ChangelogEntry } from "@/hooks/useBEODetail";
interface BEOTimelineSectionProps {
  changelog: ChangelogEntry[];
}
export function BEOTimelineSection({ changelog }: BEOTimelineSectionProps) {
  if (changelog.length === 0) {
    return (
      <Card className="bg-slate-800 border-border p-6">
        {" "}
        <h3 className="text-sm font-semibold text-white mb-4">Changes</h3>{" "}
        <p className="text-xs text-slate-400">No changes recorded yet</p>{" "}
      </Card>
    );
  }
  return (
    <Card className="bg-slate-800 border-border p-6">
      {" "}
      <h3 className="text-sm font-semibold text-white mb-4">Changes</h3>{" "}
      <div className="space-y-1 text-xs">
        {" "}
        {changelog.map((entry) => {
          const timestamp = new Date(entry.timestamp);
          const timeStr = timestamp.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const dateStr = timestamp.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          return (
            <div
              key={entry.id}
              className="flex items-start gap-3 p-2 rounded hover:bg-surface transition-colors"
            >
              {" "}
              <span className="text-slate-400 whitespace-nowrap">
                {" "}
                [{timeStr}]{" "}
              </span>{" "}
              <div className="flex-1">
                {" "}
                <p className="text-slate-300">{entry.description}</p>{" "}
                <p className="text-muted-foreground text-xs">{dateStr}</p>{" "}
              </div>{" "}
            </div>
          );
        })}{" "}
      </div>{" "}
    </Card>
  );
}
