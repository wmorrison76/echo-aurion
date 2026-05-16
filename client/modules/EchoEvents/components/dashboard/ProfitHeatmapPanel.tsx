/** * ProfitHeatmapPanel Component * Displays outlet x weekday profit heatmap for identifying profit drivers * For GM/Leadership property optimization * Part of LUCCCA Aurum analytics */ import React, {
  useState,
} from "react";
import { useProfitHeatmap } from "../../hooks/useProfitHeatmap";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { AlertCircle } from "lucide-react";
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const ProfitHeatmapPanel: React.FC = () => {
  const today = new Date();
  const defaultEndDate = today.toISOString().split("T")[0];
  const defaultStartDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const { heatmap, loading, error } = useProfitHeatmap(startDate, endDate);
  if (error) {
    return (
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="text-sm">Profit Heatmap</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="flex gap-2 text-xs text-amber-600">
            {" "}
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{" "}
            <span>{error}</span>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  if (loading || !heatmap) {
    return (
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="text-sm">Profit Heatmap</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="text-xs text-muted-foreground">Loading…</div>{" "}
        </CardContent>{" "}
      </Card>
    );
  } // Find max margin for color scaling const maxMargin = Math.max(...heatmap.cells.map((c) => c.totalMargin), 1); // Get cell color based on margin const getHeatmapColor = (margin: number): string => { const intensity = margin / maxMargin; if (intensity < 0.25) return"bg-red-100 text-red-900"; if (intensity < 0.5) return"bg-orange-100 text-orange-900"; if (intensity < 0.75) return"bg-yellow-100 text-yellow-900"; return"bg-green-100 text-green-900"; }; return ( <Card> <CardHeader> <CardTitle className="text-sm">Profit Heatmap</CardTitle> <CardDescription className="text-xs"> Outlet × Weekday profit analysis. Darker = higher profit. </CardDescription> </CardHeader> <CardContent className="space-y-4"> {/* Date Range Controls */} <div className="grid grid-cols-2 gap-2"> <div> <label className="text-[0.65rem] font-medium text-muted-foreground"> Start Date </label> <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-xs" /> </div> <div> <label className="text-[0.65rem] font-medium text-muted-foreground"> End Date </label> <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 text-xs" /> </div> </div> {/* Summary */} <div className="grid grid-cols-3 gap-2 text-[0.65rem]"> <div className="border rounded p-1.5 bg-slate-50"> <div className="text-muted-foreground mb-0.5">Total Events</div> <div className="font-semibold">{heatmap.summary.eventsCount}</div> </div> <div className="border rounded p-1.5 bg-slate-50"> <div className="text-muted-foreground mb-0.5">Total Margin</div> <div className="font-semibold"> ${(heatmap.summary.totalMargin / 1000).toFixed(1)}k </div> </div> <div className="border rounded p-1.5 bg-blue-50"> <div className="text-muted-foreground mb-0.5">Best Day</div> <div className="font-semibold"> {heatmap.summary.bestWeekday !== null ? WEEKDAY_NAMES[heatmap.summary.bestWeekday] :"—"} </div> </div> </div> {/* Heatmap Table */} <div className="border rounded-lg overflow-hidden"> <div className="overflow-x-auto"> <table className="w-full text-[0.65rem]"> <thead> <tr className="bg-slate-100 border-b"> <th className="px-2 py-1 text-left font-semibold text-xs"> Outlet </th> {WEEKDAY_NAMES.map((day) => ( <th key={day} className="px-1.5 py-1 text-center font-semibold text-xs" > {day} </th> ))} </tr> </thead> <tbody> {heatmap.outlets.map((outlet) => ( <tr key={outlet} className="border-b hover:bg-slate-50"> <td className="px-2 py-2 font-medium text-xs bg-slate-50"> {outlet} </td> {WEEKDAY_NAMES.map((_, weekday) => { const cell = heatmap.cells.find( (c) => c.outletId === outlet && c.weekday === weekday ); if (!cell) { return ( <td key={`${outlet}-${weekday}`} className="px-1.5 py-1.5 text-center border-r last:border-r-0 bg-surface" > — </td> ); } return ( <td key={`${outlet}-${weekday}`} className={`px-1.5 py-1.5 text-center border-r last:border-r-0 ${getHeatmapColor( cell.totalMargin )}`} title={`${cell.eventsCount} events, $${cell.totalMargin.toFixed(0)} margin`} > <div className="font-semibold text-[0.6rem]"> {cell.eventsCount} </div> <div className="text-[0.55rem] opacity-75"> ${(cell.totalMargin / 1000).toFixed(1)}k </div> </td> ); })} </tr> ))} </tbody> </table> </div> </div> {/* Legend */} <div className="text-[0.65rem] text-muted-foreground pt-2 border-t"> <div className="mb-1 font-semibold">Color Scale:</div> <div className="flex gap-2 flex-wrap"> <div className="flex items-center gap-1"> <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div> <span>Low</span> </div> <div className="flex items-center gap-1"> <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></div> <span>Medium</span> </div> <div className="flex items-center gap-1"> <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div> <span>High Profit</span> </div> </div> </div> </CardContent> </Card> );
};
export default ProfitHeatmapPanel;
