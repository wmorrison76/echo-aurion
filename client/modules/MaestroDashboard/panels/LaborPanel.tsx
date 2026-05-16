import React, { useMemo } from "react";
import { useMaestro } from "@/contexts/MaestroContext";
interface LaborPanelProps {
  eventId: string;
}
export const LaborPanel: React.FC<LaborPanelProps> = ({ eventId }) => {
  const { currentEvent, isLoading } = useMaestro();
  const laborSummary = useMemo(() => {
    const labor = currentEvent?.laborPlan ?? [];
    return {
      total: labor.length,
      totalHeadcount: labor.reduce((sum, l) => sum + l.headcount, 0),
      unfilled: labor.reduce((sum, l) => sum + l.unfilledPositions, 0),
      overtimeRisk: labor.filter((l) => l.overtimeRisk).length,
      totalCost: labor.reduce((sum, l) => sum + (l.costImpact ?? 0), 0),
    };
  }, [currentEvent?.laborPlan]);
  const byStation = useMemo(() => {
    const labor = currentEvent?.laborPlan ?? [];
    const grouped: Record<string, any> = {};
    labor.forEach((l) => {
      if (!grouped[l.station]) {
        grouped[l.station] = { headcount: 0, unfilled: 0, risk: false };
      }
      grouped[l.station].headcount += l.headcount;
      grouped[l.station].unfilled += l.unfilledPositions;
      if (l.overtimeRisk) grouped[l.station].risk = true;
    });
    return grouped;
  }, [currentEvent?.laborPlan]);
  if (isLoading) {
    return (
      <div className="animate-pulse">
        {" "}
        <div className="h-8 bg-slate-700 rounded mb-4" />{" "}
        <div className="space-y-3">
          {" "}
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-700 rounded" />
          ))}{" "}
        </div>{" "}
      </div>
    );
  }
  if (!currentEvent) {
    return <p className="text-slate-400">No event selected</p>;
  }
  return (
    <div>
      {" "}
      <h3 className="text-lg font-semibold text-white mb-4">
        {" "}
        Labor & Scheduling{" "}
      </h3>{" "}
      {/* Summary Cards */}{" "}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {" "}
        <div className="bg-slate-700 rounded p-3">
          {" "}
          <div className="text-xs text-slate-400 mb-1">Staff Required</div>{" "}
          <div className="text-2xl font-bold text-white">
            {" "}
            {laborSummary.totalHeadcount}{" "}
          </div>{" "}
        </div>{" "}
        <div
          className={`rounded p-3 ${laborSummary.unfilled > 0 ? "bg-orange-900 border border-orange-700" : "bg-slate-700"}`}
        >
          {" "}
          <div
            className={`text-xs mb-1 ${laborSummary.unfilled > 0 ? "text-orange-400" : "text-slate-400"}`}
          >
            {" "}
            Unfilled Positions{" "}
          </div>{" "}
          <div
            className={`text-2xl font-bold ${laborSummary.unfilled > 0 ? "text-orange-200" : "text-white"}`}
          >
            {" "}
            {laborSummary.unfilled}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Overtime Risk */}{" "}
      {laborSummary.overtimeRisk > 0 && (
        <div className="bg-yellow-900 border border-yellow-700 rounded p-3 mb-4">
          {" "}
          <div className="text-sm font-semibold text-yellow-200 mb-1">
            {" "}
            ⚠️ {laborSummary.overtimeRisk} Station{" "}
            {laborSummary.overtimeRisk > 1 ? "s" : ""} at Overtime Risk{" "}
          </div>{" "}
          <p className="text-xs text-yellow-300">
            {" "}
            Consider increasing staffing to avoid burnout and quality
            issues{" "}
          </p>{" "}
        </div>
      )}{" "}
      {/* Labor Cost */}{" "}
      {laborSummary.totalCost > 0 && (
        <div className="bg-slate-700 rounded p-3 mb-4">
          {" "}
          <div className="text-xs text-slate-400 mb-1">
            {" "}
            Estimated Labor Cost{" "}
          </div>{" "}
          <div className="text-2xl font-bold text-white">
            {" "}
            ${(laborSummary.totalCost / 100).toFixed(2)}{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* By Station */}{" "}
      <div>
        {" "}
        <h4 className="text-sm font-semibold text-slate-300 mb-3">
          {" "}
          By Station{" "}
        </h4>{" "}
        <div className="space-y-2">
          {" "}
          {Object.entries(byStation).length === 0 ? (
            <p className="text-slate-400 text-sm">No labor plan assigned</p>
          ) : (
            Object.entries(byStation).map(([station, data]: any) => (
              <div
                key={station}
                className={`border rounded p-3 ${data.risk ? "bg-orange-900 bg-opacity-30 border-orange-700" : "bg-slate-800 border-border"}`}
              >
                {" "}
                <div className="flex items-center justify-between mb-2">
                  {" "}
                  <span className="font-medium text-white capitalize">
                    {" "}
                    {station}{" "}
                  </span>{" "}
                  {data.risk && (
                    <span className="text-xs px-2 py-1 bg-orange-900 text-orange-200 rounded">
                      {" "}
                      Overtime Risk{" "}
                    </span>
                  )}{" "}
                </div>{" "}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {" "}
                  <div>
                    {" "}
                    <span className="text-slate-400">Scheduled:</span>{" "}
                    <div className="text-white font-semibold">
                      {" "}
                      {data.headcount}{" "}
                    </div>{" "}
                  </div>{" "}
                  {data.unfilled > 0 && (
                    <div>
                      {" "}
                      <span className="text-orange-400">Unfilled:</span>{" "}
                      <div className="text-orange-200 font-semibold">
                        {" "}
                        {data.unfilled}{" "}
                      </div>{" "}
                    </div>
                  )}{" "}
                </div>{" "}
              </div>
            ))
          )}{" "}
        </div>{" "}
      </div>{" "}
      {/* AI Suggestions */}{" "}
      <div className="mt-4 pt-4 border-t border-border">
        {" "}
        <button className="w-full px-4 py-2 bg-primary hover:opacity-90 text-white rounded font-medium text-sm transition-colors">
          {" "}
          Get AI Schedule Suggestions{" "}
        </button>{" "}
      </div>{" "}
    </div>
  );
};
