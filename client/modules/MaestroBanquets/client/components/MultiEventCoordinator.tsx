import React from "react";

import { addDays, format } from "date-fns";
import { AlertTriangle, Calendar, RefreshCw, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useToast } from "@/hooks/use-toast";

interface CoordinatedEvent {
  id: string;
  eventName: string;
  eventDate: string; /* ISO date */
  guestCount: number;
  prepStartTime: string; /* ISO datetime */
  status: "scheduled" | "conflict" | "popup";
  conflicts: string[];
  isPopup: boolean;
}

interface Conflict {
  id: string;
  type: "prep_time" | "resource" | "space" | "labor";
  events: string[];
  message: string;
}

export default function MultiEventCoordinator() {
  const { toast } = useToast();
  const [events, setEvents] = React.useState<CoordinatedEvent[]>([]);
  const [conflicts, setConflicts] = React.useState<Conflict[]>([]);
  const [loading, setLoading] = React.useState(false);

  const loadEvents = React.useCallback(async () => {
    setLoading(true);
    try {
      /* Replace with API/store wiring. */
      const today = new Date();
      const mockEvents: CoordinatedEvent[] = [
        {
          id: "event-1",
          eventName: "Wedding Reception",
          eventDate: format(today, "yyyy-MM-dd"),
          guestCount: 150,
          prepStartTime: format(addDays(today, -1), "yyyy-MM-dd'T'HH:mm:ss"),
          status: "scheduled",
          conflicts: [],
          isPopup: false,
        },
        {
          id: "event-2",
          eventName: "Corporate Dinner",
          eventDate: format(today, "yyyy-MM-dd"),
          guestCount: 75,
          prepStartTime: format(addDays(today, -1), "yyyy-MM-dd'T'HH:mm:ss"),
          status: "conflict",
          conflicts: ["Wedding Reception"],
          isPopup: true,
        },
      ];

      const mockConflicts: Conflict[] = [
        {
          id: "conflict-1",
          type: "prep_time",
          events: ["Wedding Reception", "Corporate Dinner"],
          message: "Prep times overlap; adjust prep start or staffing plan.",
        },
      ];

      setEvents(mockEvents);
      setConflicts(mockConflicts);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                Multi-Event Coordinator
              </CardTitle>
              <CardDescription>
                Coordinates simultaneous events and pop-up events (1–2 day
                notice)
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast({
                  title: "Refresh",
                  description: "Reloading coordinated event view…",
                });
                void loadEvents();
              }}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {conflicts.length > 0 ? (
            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                  Conflicts Detected
                </h3>
              </div>
              <div className="space-y-2">
                {conflicts.map((c) => (
                  <div
                    key={c.id}
                    className="text-sm text-amber-900 dark:text-amber-100"
                  >
                    <p className="font-medium">{c.message}</p>
                    <p className="text-xs mt-1">
                      Events: {c.events.join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            {events.map((event) => (
              <Card
                key={event.id}
                className={event.status === "conflict" ? "border-red-500" : ""}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        {event.eventName}
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(event.eventDate), "MMM d, yyyy")} •{" "}
                        {event.guestCount} guests
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {event.isPopup ? (
                        <Badge variant="destructive">Pop-up</Badge>
                      ) : null}
                      <Badge
                        variant={
                          event.status === "conflict"
                            ? "destructive"
                            : "default"
                        }
                      >
                        {event.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Prep Start
                      </p>
                      <p className="text-sm font-medium">
                        {format(new Date(event.prepStartTime), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Event Date
                      </p>
                      <p className="text-sm font-medium">
                        {format(new Date(event.eventDate), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Guest Count
                      </p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Users className="h-4 w-4" /> {event.guestCount}
                      </p>
                    </div>
                  </div>

                  {event.conflicts.length > 0 ? (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <p className="text-sm text-red-900 dark:text-red-100">
                        <strong>Conflicts:</strong> {event.conflicts.join(", ")}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
