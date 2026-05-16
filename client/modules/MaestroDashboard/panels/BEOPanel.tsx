import React from "react";
import { useMaestro } from "@/contexts/MaestroContext";
interface BEOPanelProps {
  eventId: string;
}
export const BEOPanel: React.FC<BEOPanelProps> = ({ eventId }) => {
  const { currentEvent, isLoading } = useMaestro();
  if (isLoading) {
    return (
      <div className="animate-pulse">
        {" "}
        <div className="h-8 bg-muted rounded mb-4" />{" "}
        <div className="space-y-3">
          {" "}
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded" />
          ))}{" "}
        </div>{" "}
      </div>
    );
  }
  if (!currentEvent) {
    return <p className="text-muted-foreground">No event selected</p>;
  }
  return (
    <div>
      {" "}
      <h3 className="text-lg font-semibold text-foreground mb-4">
        BEO & Timeline
      </h3>{" "}
      {/* Contact Information */}{" "}
      {currentEvent.clientName && (
        <div className="bg-card rounded p-3 mb-4 border border-border">
          {" "}
          <div className="text-xs text-muted-foreground mb-2">Client</div>{" "}
          <div className="text-foreground font-medium">
            {" "}
            {currentEvent.clientName}{" "}
          </div>{" "}
          {currentEvent.clientEmail && (
            <div className="text-xs text-muted-foreground mt-1">
              {" "}
              {currentEvent.clientEmail}{" "}
            </div>
          )}{" "}
          {currentEvent.clientPhone && (
            <div className="text-xs text-muted-foreground">
              {" "}
              {currentEvent.clientPhone}{" "}
            </div>
          )}{" "}
        </div>
      )}{" "}
      {/* Venue Information */}{" "}
      {currentEvent.venueName && (
        <div className="bg-card rounded p-3 mb-4 border border-border">
          {" "}
          <div className="text-xs text-muted-foreground mb-2">Venue</div>{" "}
          <div className="text-foreground font-medium">
            {currentEvent.venueName}
          </div>{" "}
        </div>
      )}{" "}
      {/* Timeline Events */}{" "}
      {currentEvent.timeline && currentEvent.timeline.length > 0 && (
        <div>
          {" "}
          <h4 className="text-sm font-semibold text-foreground mb-3">
            {" "}
            Service Timeline{" "}
          </h4>{" "}
          <div className="space-y-3">
            {" "}
            {currentEvent.timeline.map((event) => (
              <div
                key={event.id}
                className="bg-card rounded p-3 border border-border"
              >
                {" "}
                <div className="flex items-center justify-between mb-1">
                  {" "}
                  <div className="font-medium text-foreground text-sm">
                    {" "}
                    {event.name}{" "}
                  </div>{" "}
                  <div className="text-xs text-muted-foreground">
                    {" "}
                    {new Date(event.scheduledAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                  </div>{" "}
                </div>{" "}
                {event.description && (
                  <div className="text-xs text-muted-foreground">
                    {" "}
                    {event.description}{" "}
                  </div>
                )}{" "}
                {event.completed && (
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✓ Completed
                  </div>
                )}{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Event Notes */}{" "}
      {currentEvent.internalNotes && (
        <div className="mt-4 pt-4 border-t border-border">
          {" "}
          <h4 className="text-sm font-semibold text-foreground mb-2">
            {" "}
            Internal Notes{" "}
          </h4>{" "}
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
            {" "}
            {currentEvent.internalNotes}{" "}
          </p>{" "}
        </div>
      )}{" "}
    </div>
  );
};
