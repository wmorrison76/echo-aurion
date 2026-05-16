import React, { useMemo } from "react";
import { useMaestro } from "@/contexts/MaestroContext";
interface ProductionPanelProps {
  eventId: string;
}
const stationColors: Record<string, string> = {
  hot: "bg-red-900 text-red-200",
  cold: "bg-blue-900 text-blue-200",
  garde: "bg-green-900 text-green-200",
  pastry: "bg-pink-900 text-pink-200",
  beverage: "bg-purple-900 text-purple-200",
  plating: "bg-yellow-900 text-yellow-200",
};
export const ProductionPanel: React.FC<ProductionPanelProps> = ({
  eventId,
}) => {
  const { currentEvent, isLoading } = useMaestro();
  const totalWorkload = useMemo(() => {
    const breakdown = currentEvent?.productionBreakdown ?? [];
    return breakdown.reduce((sum, station) => sum + station.totalPrepTime, 0);
  }, [currentEvent?.productionBreakdown]);
  const bottlenecks = useMemo(() => {
    const breakdown = currentEvent?.productionBreakdown ?? [];
    return breakdown.flatMap((s) => s.bottlenecks);
  }, [currentEvent?.productionBreakdown]);
  if (isLoading) {
    return (
      <div className="animate-pulse">
        {" "}
        <div className="h-8 bg-slate-700 rounded mb-4" />{" "}
        <div className="space-y-3">
          {" "}
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-700 rounded" />
          ))}{" "}
        </div>{" "}
      </div>
    );
  }
  if (!currentEvent) {
    return <p className="text-slate-400">No event selected</p>;
  }
  const breakdown = currentEvent.productionBreakdown ?? [];
  return (
    <div>
      {" "}
      <h3 className="text-lg font-semibold text-white mb-4">
        {" "}
        Production Breakdown{" "}
      </h3>{" "}
      {/* Total Workload */}{" "}
      {totalWorkload > 0 && (
        <div className="bg-slate-700 rounded p-3 mb-4">
          {" "}
          <div className="text-xs text-slate-400 mb-1">
            Total Prep Time
          </div>{" "}
          <div className="text-2xl font-bold text-white">
            {" "}
            {Math.round(totalWorkload / 60)}h {totalWorkload % 60}m{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Bottlenecks Alert */}{" "}
      {bottlenecks.length > 0 && (
        <div className="bg-orange-900 border border-orange-700 rounded p-3 mb-4">
          {" "}
          <div className="text-sm font-semibold text-orange-200 mb-2">
            {" "}
            Bottlenecks{" "}
          </div>{" "}
          <ul className="text-xs text-orange-300 space-y-1">
            {" "}
            {bottlenecks.map((bottleneck, idx) => (
              <li key={idx}>• {bottleneck}</li>
            ))}{" "}
          </ul>{" "}
        </div>
      )}{" "}
      {/* Stations */}{" "}
      <div className="space-y-3">
        {" "}
        {breakdown.length === 0 ? (
          <p className="text-slate-400 text-sm">
            {" "}
            No production breakdown available{" "}
          </p>
        ) : (
          breakdown.map((station) => (
            <div
              key={station.id}
              className="bg-slate-800 border border-border rounded p-3"
            >
              {" "}
              <div className="flex items-center justify-between mb-2">
                {" "}
                <span
                  className={`text-sm font-semibold px-2 py-1 rounded ${stationColors[station.station] || "bg-slate-700 text-slate-300"}`}
                >
                  {" "}
                  {station.station.toUpperCase()}{" "}
                </span>{" "}
                <span className="text-xs text-slate-400">
                  {" "}
                  {station.tasks.length} tasks{" "}
                </span>{" "}
              </div>{" "}
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                {" "}
                <div className="bg-slate-700 rounded p-2">
                  {" "}
                  <div className="text-slate-400">Prep Time</div>{" "}
                  <div className="text-white font-semibold">
                    {" "}
                    {Math.round(station.totalPrepTime / 60)}h{""}{" "}
                    {station.totalPrepTime % 60}m{" "}
                  </div>{" "}
                </div>{" "}
                <div className="bg-slate-700 rounded p-2">
                  {" "}
                  <div className="text-slate-400">Staff</div>{" "}
                  <div className="text-white font-semibold">
                    {" "}
                    {station.staffRequired}{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              {/* Task List */}{" "}
              {station.tasks.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {" "}
                  {station.tasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="text-xs text-slate-300 bg-slate-700 rounded p-2"
                    >
                      {" "}
                      <div className="font-medium">{task.recipeName}</div>{" "}
                      <div className="text-muted-foreground">
                        {" "}
                        {task.yieldCount} portions • {task.totalTime}m{" "}
                      </div>{" "}
                    </div>
                  ))}{" "}
                  {station.tasks.length > 5 && (
                    <div className="text-xs text-slate-400 p-2 text-center">
                      {" "}
                      +{station.tasks.length - 5} more{" "}
                    </div>
                  )}{" "}
                </div>
              )}{" "}
            </div>
          ))
        )}{" "}
      </div>{" "}
    </div>
  );
};
