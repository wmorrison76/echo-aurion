/**
 * Change Feed Component
 * Displays recent changes and updates across the system
 */

import React from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import type { Change, Event } from "../types";
import { cn } from "@/lib/glass";

interface ChangeFeedProps {
  changes?: Change[] | null;
  events?: Event[] | null;
  limit?: number;
}

export function ChangeFeed({
  changes = [],
  events = [],
  limit = 20,
}: ChangeFeedProps) {
  const changesList = Array.isArray(changes) ? changes : [];
  const eventsList = Array.isArray(events) ? events : [];
  const getEventName = (eventId: string): string => {
    return eventsList.find((e) => e.id === eventId)?.name || "Unknown Event";
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case "created":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "guest_count_changed":
      case "guest_count_increased":
      case "guest_count_decreased":
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      case "status_changed":
      case "space_changed":
      case "time_changed":
        return <Clock className="w-4 h-4 text-amber-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getChangeDescription = (change: Change): string => {
    let description = change.changeType.replace(/_/g, " ");

    if (change.oldValue !== undefined && change.newValue !== undefined) {
      description += ` (${change.oldValue} → ${change.newValue})`;
    }

    return description;
  };

  const sortedChanges = React.useMemo(() => {
    return [...changesList]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, limit);
  }, [changesList, limit]);

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-foreground/60" />
        <h3 className="font-semibold text-foreground">Recent Changes</h3>
        <span className="ml-auto text-xs text-foreground/50">
          {changesList.length} total
        </span>
      </div>

      <div className="space-y-2">
        {sortedChanges.length === 0 ? (
          <div className="px-4 py-8 text-center text-foreground/50 text-sm">
            No changes recorded yet
          </div>
        ) : (
          sortedChanges.map((change) => (
            <div
              key={change.id}
              className="rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm p-3 hover:bg-background/60 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="mt-1 flex-shrink-0">
                  {getChangeIcon(change.changeType)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {getEventName(change.eventId)}
                      </p>
                      <p className="text-sm text-foreground/70">
                        {getChangeDescription(change)}
                      </p>
                    </div>
                    <span className="text-xs text-foreground/50 flex-shrink-0 whitespace-nowrap">
                      {formatTime(change.timestamp)}
                    </span>
                  </div>

                  {/* Impacted departments */}
                  {change.impactedDepartments &&
                    change.impactedDepartments.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {change.impactedDepartments.map((dept) => (
                          <span
                            key={dept}
                            className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs"
                          >
                            {dept}
                          </span>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {sortedChanges.length > 0 &&
        sortedChanges.length < changesList.length && (
          <div className="text-center py-2">
            <p className="text-xs text-foreground/50">
              Showing {sortedChanges.length} of {changesList.length} changes
            </p>
          </div>
        )}
    </div>
  );
}

export default ChangeFeed;
