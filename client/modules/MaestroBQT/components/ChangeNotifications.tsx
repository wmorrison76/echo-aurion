/**
 * Change Notifications Component
 * Genesis F + H compliance - Change event display and acknowledgment
 */

import React from "react";
import {
  Bell,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Info,
  Eye,
} from "lucide-react";
import type { ChangeEvent } from "../types/genesis-integration";
import { cn } from "@/lib/glass";

interface ChangeNotificationsProps {
  events: ChangeEvent[];
  onAcknowledge?: (eventId: string) => void;
  onMarkReviewed?: (eventId: string) => void;
  onViewImpact?: (eventId: string) => void;
}

export function ChangeNotifications({
  events,
  onAcknowledge,
  onMarkReviewed,
  onViewImpact,
}: ChangeNotificationsProps) {
  const [filter, setFilter] = React.useState<
    "all" | "pending" | "acknowledged"
  >("all");

  const filteredEvents = React.useMemo(() => {
    if (filter === "pending") {
      return events.filter(
        (e) => e.requiresAcknowledgment && !e.acknowledgedAt,
      );
    }
    if (filter === "acknowledged") {
      return events.filter((e) => e.acknowledgedAt);
    }
    return events;
  }, [events, filter]);

  const unacknowledgedCount = React.useMemo(() => {
    return events.filter((e) => e.requiresAcknowledgment && !e.acknowledgedAt)
      .length;
  }, [events]);

  const getEventIcon = (type: ChangeEvent["type"]) => {
    switch (type) {
      case "BEO_UPDATED":
        return <Info className="w-4 h-4 text-blue-600" />;
      case "RECIPE_RESCALED":
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case "TIMELINE_SHIFTED":
        return <Clock className="w-4 h-4 text-purple-600" />;
      case "ORDER_REGENERATED":
        return <XCircle className="w-4 h-4 text-orange-600" />;
      case "RECEIVING_EXCEPTION":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getEventColor = (type: ChangeEvent["type"]) => {
    switch (type) {
      case "BEO_UPDATED":
        return "border-blue-500/30 bg-blue-500/10";
      case "RECIPE_RESCALED":
        return "border-amber-500/30 bg-amber-500/10";
      case "TIMELINE_SHIFTED":
        return "border-purple-500/30 bg-purple-500/10";
      case "ORDER_REGENERATED":
        return "border-orange-500/30 bg-orange-500/10";
      case "RECEIVING_EXCEPTION":
        return "border-red-500/30 bg-red-500/10";
      default:
        return "border-gray-500/30 bg-gray-500/10";
    }
  };

  const formatTimestamp = (timestamp: string): string => {
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
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/20">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Change Notifications
          </h2>
          {unacknowledgedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-medium">
              {unacknowledgedCount}
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 p-4 border-b border-border/20">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            filter === "all"
              ? "bg-primary text-white"
              : "bg-background/40 border border-border/20 text-foreground/60 hover:text-foreground",
          )}
        >
          All ({events.length})
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            filter === "pending"
              ? "bg-primary text-white"
              : "bg-background/40 border border-border/20 text-foreground/60 hover:text-foreground",
          )}
        >
          Pending ({unacknowledgedCount})
        </button>
        <button
          onClick={() => setFilter("acknowledged")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            filter === "acknowledged"
              ? "bg-primary text-white"
              : "bg-background/40 border border-border/20 text-foreground/60 hover:text-foreground",
          )}
        >
          Acknowledged ({events.filter((e) => e.acknowledgedAt).length})
        </button>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredEvents.map((event) => {
          const requiresAck =
            event.requiresAcknowledgment && !event.acknowledgedAt;
          const hasPreview = !!event.preview;

          return (
            <div
              key={event.id}
              className={cn(
                "rounded-lg border p-3 transition-colors",
                getEventColor(event.type),
                requiresAck && "ring-2 ring-primary/50",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1">
                  {getEventIcon(event.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">
                        {event.type.replace(/_/g, " ")}
                      </p>
                      {requiresAck && (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-700 text-xs font-medium">
                          Action Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground/60 mt-1">
                      {event.entityType}: {event.entityId}
                    </p>
                    {event.preview && (
                      <div className="mt-2 p-2 rounded bg-background/40 border border-border/20">
                        <p className="text-xs font-medium text-foreground mb-1">
                          Impact Preview:
                        </p>
                        <ul className="text-xs text-foreground/80 space-y-0.5">
                          {event.preview.impact.map((impact, idx) => (
                            <li key={idx}>• {impact}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-foreground/60">
                        {formatTimestamp(event.createdAt)}
                      </span>
                      {event.affectedBEODs.length > 0 && (
                        <span className="text-xs text-foreground/60">
                          Affects {event.affectedBEODs.length} BEO
                          {event.affectedBEODs.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {hasPreview && (
                    <button
                      onClick={() => onViewImpact?.(event.id)}
                      className="p-1.5 rounded hover:bg-background/60 transition-colors"
                      title="View impact"
                    >
                      <Eye className="w-4 h-4 text-foreground/60" />
                    </button>
                  )}
                  {!event.acknowledgedAt && (
                    <>
                      <button
                        onClick={() => onMarkReviewed?.(event.id)}
                        className="px-2 py-1 rounded text-xs font-medium bg-background/60 hover:bg-background/80 transition-colors"
                      >
                        Mark Reviewed
                      </button>
                      {requiresAck && (
                        <button
                          onClick={() => onAcknowledge?.(event.id)}
                          className="px-2 py-1 rounded text-xs font-medium bg-primary text-white hover:bg-primary/80 transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                    </>
                  )}
                  {event.acknowledgedAt && (
                    <div className="flex items-center gap-1 text-xs text-foreground/60">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Acknowledged</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredEvents.length === 0 && (
          <div className="flex items-center justify-center p-8 text-center">
            <div>
              <Bell className="w-8 h-8 text-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-foreground/60">
                No notifications found
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChangeNotifications;
