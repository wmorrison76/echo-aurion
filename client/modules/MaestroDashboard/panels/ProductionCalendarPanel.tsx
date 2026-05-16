import React from "react";
import { useMaestro } from "@/contexts/MaestroContext";
interface ProductionCalendarPanelProps {
  eventId: string;
}
export const ProductionCalendarPanel: React.FC<
  ProductionCalendarPanelProps
> = ({ eventId }) => {
  const { currentEvent, isLoading } = useMaestro();
  if (isLoading) {
    return (
      <div className="animate-pulse">
        {" "}
        <div className="h-8 bg-slate-700 rounded mb-4" />{" "}
        <div className="space-y-3">
          {" "}
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-700 rounded" />
          ))}{" "}
        </div>{" "}
      </div>
    );
  }
  if (!currentEvent) {
    return <p className="text-slate-400">No event selected</p>;
  }
  const eventDate = new Date(currentEvent.date);
  const prepStartDate = currentEvent.prepStartDate
    ? new Date(currentEvent.prepStartDate)
    : new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days before return ( <div> <h3 className="text-lg font-semibold text-white mb-4"> Production Timeline </h3> {/* Timeline Overview */} <div className="space-y-3"> <div className="bg-slate-700 rounded p-3"> <div className="text-xs text-slate-400 mb-1">Prep Starts</div> <div className="text-white font-semibold"> {prepStartDate.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric", })} </div> <div className="text-xs text-muted-foreground mt-1"> {Math.round( (eventDate.getTime() - prepStartDate.getTime()) / (24 * 60 * 60 * 1000), )}{""} days before event </div> </div> <div className="bg-slate-700 rounded p-3"> <div className="text-xs text-slate-400 mb-1">Event Date</div> <div className="text-white font-semibold"> {eventDate.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric", })} </div> {currentEvent.setupStartTime && ( <div className="text-xs text-muted-foreground mt-1"> Setup: {currentEvent.setupStartTime} </div> )} {currentEvent.serviceStartTime && ( <div className="text-xs text-muted-foreground"> Service: {currentEvent.serviceStartTime} </div> )} </div> </div> {/* Timeline Events */} {currentEvent.timeline && currentEvent.timeline.length > 0 && ( <div className="mt-4 pt-4 border-t border-border"> <h4 className="text-sm font-semibold text-slate-300 mb-3"> Key Milestones </h4> <div className="space-y-2"> {currentEvent.timeline .sort( (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(), ) .slice(0, 8) .map((event) => ( <div key={event.id} className={`flex items-start gap-3 p-2 rounded ${ event.completed ?"bg-green-900 bg-opacity-30 border border-green-700" :"bg-slate-700" }`} > <div className="text-xl mt-0.5"> {event.completed ?"✓" :"○"} </div> <div className="flex-1"> <div className="font-medium text-white text-sm"> {event.name} </div> <div className="text-xs text-slate-400"> {new Date(event.scheduledAt).toLocaleTimeString("en-US", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit", })} </div> </div> </div> ))} </div> </div> )} {/* Prep Congestion Indicator */} <div className="mt-4 pt-4 border-t border-border"> <h4 className="text-sm font-semibold text-slate-300 mb-3"> Prep Workload </h4> <div className="bg-slate-700 rounded overflow-hidden"> <div className="h-2 bg-slate-600 relative"> <div className="h-full bg-gradient-to-r from-green-500 to-orange-500 w-3/4" /> </div> <div className="p-2 text-xs text-slate-400"> Moderate workload in final 3 days </div> </div> </div> </div> );
};
