import React, { useMemo } from "react";
import type { Event } from "@shared/types/maestro";

interface EventSelectorProps {
  events: Event[];
  selectedId: string | null;
  onSelect: (eventId: string) => void;
  loading?: boolean;
}

export const EventSelector: React.FC<EventSelectorProps> = ({
  events,
  selectedId,
  onSelect,
  loading,
}) => {
  // Sort events by date (upcoming first)
  const sortedEvents = useMemo(() => {
    return [...(events as any[])].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [events]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {sortedEvents.length === 0 ? (
        <p className="text-muted-foreground text-sm">No events found</p>
      ) : (
        sortedEvents.map((event: any) => (
          <button
            key={event.id}
            onClick={() => onSelect(event.id)}
            className={`w-full text-left p-3 rounded border transition-all ${
              selectedId === event.id
                ? "bg-primary border-primary text-primary-foreground shadow-lg"
                : "bg-surface border-border text-foreground hover:bg-muted"
            }`}
          >
            <div className="font-medium truncate">{event.name}</div>
            <div className="text-xs opacity-75 mt-1">
              {new Date(event.date).toLocaleDateString()} • {event.guestCount}{" "}
              guests
            </div>
            <div className="text-xs opacity-60 mt-0.5">
              <span
                className={`inline-block px-2 py-0.5 rounded mt-1 ${
                  event.status === "confirmed"
                    ? "bg-green-500/20 text-green-600 dark:text-green-400"
                    : event.status === "in_production"
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {event.status}
              </span>
            </div>
          </button>
        ))
      )}
    </div>
  );
};
