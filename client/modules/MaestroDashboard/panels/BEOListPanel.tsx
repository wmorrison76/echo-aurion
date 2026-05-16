/** * BEO List Panel * * Displays upcoming BEO events in a compact list/table format. * Clicking a BEO opens the detail view. */ import React from "react";
import { useMaestroStore } from "@/stores/useMaestroStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Event } from "@shared/types/maestro";
interface BEOListPanelProps {
  events: Event[];
  loading: boolean;
  error: string | null;
}
export function BEOListPanel({ events, loading, error }: BEOListPanelProps) {
  const { selectBEO } = useMaestroStore();
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        {" "}
        <div className="text-sm text-slate-400">Loading BEOs...</div>{" "}
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        {" "}
        <div className="text-sm text-red-400">Error: {error}</div>{" "}
      </div>
    );
  }
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        {" "}
        <div className="text-sm text-slate-400">No BEOs found</div>{" "}
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {" "}
      <div className="px-4 py-3 border-b border-border bg-slate-800">
        {" "}
        <h2 className="text-sm font-semibold text-white">Upcoming BEOs</h2>{" "}
        <p className="text-xs text-slate-400 mt-1">
          {events.length} events
        </p>{" "}
      </div>{" "}
      <div className="flex-1 overflow-y-auto">
        {" "}
        <table className="w-full text-xs">
          {" "}
          <thead className="sticky top-0 bg-slate-750 border-b border-border">
            {" "}
            <tr>
              {" "}
              <th className="px-3 py-2 text-left font-medium text-slate-300">
                {" "}
                Event{" "}
              </th>{" "}
              <th className="px-3 py-2 text-left font-medium text-slate-300">
                {" "}
                Guests{" "}
              </th>{" "}
              <th className="px-3 py-2 text-left font-medium text-slate-300">
                {" "}
                Date{" "}
              </th>{" "}
              <th className="px-3 py-2 text-left font-medium text-slate-300">
                {" "}
                Status{" "}
              </th>{" "}
              <th className="px-3 py-2 text-right font-medium text-slate-300">
                {" "}
                Action{" "}
              </th>{" "}
            </tr>{" "}
          </thead>{" "}
          <tbody>
            {" "}
            {events.map((event) => (
              <tr
                key={event.id}
                className="border-b border-border hover:bg-slate-750 transition-colors"
              >
                {" "}
                <td className="px-3 py-2 text-slate-200">
                  {" "}
                  <div className="font-medium truncate">{event.name}</div>{" "}
                  {event.clientName && (
                    <div className="text-xs text-slate-400 truncate">
                      {" "}
                      {event.clientName}{" "}
                    </div>
                  )}{" "}
                </td>{" "}
                <td className="px-3 py-2 text-slate-300">{event.guestCount}</td>{" "}
                <td className="px-3 py-2 text-slate-400">
                  {" "}
                  {new Date(event.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                </td>{" "}
                <td className="px-3 py-2">
                  {" "}
                  <Badge variant="outline" className="text-xs">
                    {" "}
                    {event.status}{" "}
                  </Badge>{" "}
                </td>{" "}
                <td className="px-3 py-2 text-right">
                  {" "}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => selectBEO(event.beoId || event.id)}
                    className="text-xs h-6 px-2"
                  >
                    {" "}
                    View →{" "}
                  </Button>{" "}
                </td>{" "}
              </tr>
            ))}{" "}
          </tbody>{" "}
        </table>{" "}
      </div>{" "}
    </div>
  );
}
