import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
interface Event {
  eventId: string;
  name: string;
  date: string;
  session: string;
  variantId?: string;
}
export interface EventStudioPanelProps {
  session?: string;
  onEventSelect?: (event: Event) => void;
}
export function EventStudioPanel({
  session = "P66_DiningRoom",
  onEventSelect,
}: EventStudioPanelProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/events/by-session?session=${encodeURIComponent(session)}`,
        );
        if (response.ok) {
          const data = await response.json();
          setEvents(data);
        }
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [session]);
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) return;
    try {
      const response = await fetch("/api/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: eventName,
          session,
          date: new Date().toISOString().split("T")[0],
        }),
      });
      if (response.ok) {
        const { event } = await response.json();
        setEvents([...events, event]);
        setEventName("");
      }
    } catch (err) {
      console.error("Failed to create event:", err);
    }
  };
  const handleDeleteEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setEvents(events.filter((e) => e.eventId !== eventId));
      }
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };
  return (
    <Card>
      {" "}
      <CardHeader className="py-3">
        {" "}
        <CardTitle className="text-sm">EchoEventStudio</CardTitle>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-2">
        {" "}
        {/* Create Event Form */}{" "}
        <form onSubmit={handleCreateEvent} className="flex gap-1">
          {" "}
          <Input
            placeholder="Event name..."
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="h-8 text-xs flex-1"
          />{" "}
          <Button
            type="submit"
            size="sm"
            className="h-8 px-2 text-xs"
            disabled={!eventName.trim()}
          >
            {" "}
            <Plus className="h-3 w-3 mr-1" /> New{" "}
          </Button>{" "}
        </form>{" "}
        {/* Events List */}{" "}
        {loading ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            {" "}
            Loading...{" "}
          </div>
        ) : events.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            {" "}
            No events yet. Create one to get started.{" "}
          </div>
        ) : (
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {" "}
            {events.map((event) => (
              <div
                key={event.eventId}
                className="flex items-center justify-between border rounded px-2 py-1 text-xs bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                {" "}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onEventSelect?.(event)}
                >
                  {" "}
                  <div className="font-semibold truncate">
                    {event.name}
                  </div>{" "}
                  <div className="text-muted-foreground">{event.date}</div>{" "}
                </div>{" "}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 flex-shrink-0 ml-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteEvent(event.eventId);
                  }}
                >
                  {" "}
                  <Trash2 className="h-3 w-3 text-destructive" />{" "}
                </Button>{" "}
              </div>
            ))}{" "}
          </div>
        )}{" "}
        <div className="text-[10px] text-muted-foreground pt-2 border-t">
          {" "}
          {events.length} event{events.length !== 1 ? "s" : ""} in{" "}
          {session}{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
