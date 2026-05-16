/** * BEO Production Schedule Section * * Displays production timeline with kitchen station allocation * and resource balancing information for concurrent BEOs. */ import React, {
  useState,
  useEffect,
} from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import type { ProductionScheduleItem } from "@/hooks/useBEODetail";
interface BEOProductionScheduleSectionProps {
  schedule: ProductionScheduleItem[];
  beoId?: string;
}
function getStationColor(station: string): string {
  const stationColors: Record<string, string> = {
    "Sauté Station": "bg-orange-900 text-orange-200",
    Grill: "bg-red-900 text-red-200",
    Pastry: "bg-purple-900 text-purple-200",
    Sauce: "bg-blue-900 text-blue-200",
    Plating: "bg-green-900 text-green-200",
  };
  return stationColors[station] || "bg-slate-700 text-slate-200";
}
export function BEOProductionScheduleSection({
  schedule,
  beoId,
}: BEOProductionScheduleSectionProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [criticalItems, setCriticalItems] = useState<string[]>([]); // Identify items with tight timelines useEffect(() => { const critical = schedule .filter((item) => { const startTime = new Date(item.startTime); const now = new Date(); const hoursDiff = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60); return hoursDiff < 4 && hoursDiff > 0; // Critical if within 4 hours and still ahead }) .map((item) => item.id); setCriticalItems(critical); }, [schedule]); const formatTime = (isoString: string) => { return new Date(isoString).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", hour12: true, }); }; const getContention = (notes: string):"high" |"moderate" |"low" => { if (notes.includes("High demand")) return"high"; if (notes.includes("moderately busy")) return"moderate"; return"low"; }; return ( <Card className="bg-slate-800 border-border p-6"> <div className="flex items-center justify-between mb-4"> <h3 className="text-sm font-semibold text-white">Production Schedule</h3> {criticalItems.length > 0 && ( <Badge variant="destructive" className="text-xs"> ⚠️ {criticalItems.length} critical </Badge> )} </div> {schedule.length === 0 ? ( <p className="text-xs text-slate-400">No items scheduled</p> ) : ( <div className="space-y-2 text-xs"> {/* Timeline visualization */} <div className="mb-4 p-3 rounded bg-surface border border-border"> <p className="text-slate-300 font-medium mb-3">Production Timeline</p> <div className="space-y-2"> {schedule.map((item) => { const contention = getContention(item.balancingNotes); const isStarted = new Date(item.startTime) <= new Date(); const isCompleted = new Date(item.endTime) <= new Date(); return ( <div key={item.id} className="relative"> {/* Timeline bar */} <div className="flex items-center gap-2 h-6"> <div className="text-[10px] text-slate-400 w-8"> {formatTime(item.startTime)} </div> <div className={`flex-1 h-5 rounded flex items-center px-1.5 text-[10px] font-medium truncate ${ isCompleted ?"bg-slate-700 text-slate-400 line-through" : isStarted ?"bg-yellow-600 text-yellow-100 animate-pulse" :"bg-primary text-blue-100" }`} title={item.itemName} > {item.itemName} </div> {contention ==="high" && ( <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" /> )} </div> </div> ); })} </div> </div> {/* Detailed schedule items */} {schedule.map((item) => { const contention = getContention(item.balancingNotes); const isExpanded = expandedItem === item.id; return ( <div key={item.id} className={`p-3 rounded border cursor-pointer transition-colors ${ criticalItems.includes(item.id) ?"bg-red-900/20 border-red-700/50" :"bg-surface border-border hover:border-slate-600" }`} onClick={() => setExpandedItem(isExpanded ? null : item.id) } > <div className="flex items-start justify-between mb-2"> <div className="flex-1"> <p className="text-white font-medium">{item.itemName}</p> <p className="text-slate-400 text-xs mt-0.5"> {formatTime(item.startTime)} – {formatTime(item.endTime)} (⏱ {item.prepDuration}m prep) </p> </div> <Badge className={`${getStationColor(item.station)} text-xs`}> {item.station} </Badge> </div> {/* Balancing indicators */} <div className="flex flex-wrap gap-1.5"> {contention ==="high" && ( <Badge variant="destructive" className="text-[10px]"> High contention </Badge> )} {contention ==="moderate" && ( <Badge variant="secondary" className="text-[10px]"> Moderate load </Badge> )} </div> {/* Expanded details */} {isExpanded && ( <div className="mt-3 pt-3 border-t border-border space-y-2 text-xs text-slate-300"> <div className="grid grid-cols-2 gap-2"> <div> <p className="text-slate-400 font-medium">Arrival Time</p> <p>{formatTime(item.estArrivalTime)}</p> </div> <div> <p className="text-slate-400 font-medium">Duration</p> <p>{item.prepDuration} minutes</p> </div> </div> <div> <p className="text-slate-400 font-medium">Balancing Note</p> <p className="text-slate-400 mt-1">{item.balancingNotes}</p> </div> </div> )} </div> ); })} {/* Legend */} <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2 text-[10px] text-slate-400"> <div className="flex items-center gap-2"> <div className="w-3 h-3 rounded bg-primary" /> <span>Scheduled</span> </div> <div className="flex items-center gap-2"> <div className="w-3 h-3 rounded bg-yellow-600 animate-pulse" /> <span>In Progress</span> </div> <div className="flex items-center gap-2"> <div className="w-3 h-3 rounded bg-slate-700" /> <span>Completed</span> </div> <div className="flex items-center gap-2"> <AlertCircle className="w-3 h-3 text-red-400" /> <span>High Contention</span> </div> </div> </div> )} </Card> );
}
