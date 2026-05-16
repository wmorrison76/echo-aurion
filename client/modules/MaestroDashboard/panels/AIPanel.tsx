import React from "react";
import { useMaestro } from "@/contexts/MaestroContext";
interface AIPanelProps {
  eventId: string;
}
export const AIPanel: React.FC<AIPanelProps> = ({ eventId }) => {
  const { currentEvent, isLoading } = useMaestro();
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
        AI Insights
      </h3>{" "}
      {/* Optimization Opportunities */}{" "}
      <div className="space-y-3">
        {" "}
        {/* Cost Optimization */}{" "}
        <div className="bg-gradient-to-br from-green-900 to-green-800 border border-green-700 rounded-lg p-4">
          {" "}
          <div className="flex items-start justify-between mb-2">
            {" "}
            <h4 className="font-semibold text-green-200">
              Cost Reduction
            </h4>{" "}
            <span className="text-xs bg-green-700 text-green-100 px-2 py-1 rounded">
              {" "}
              Save 12%{" "}
            </span>{" "}
          </div>{" "}
          <p className="text-sm text-green-300 mb-3">
            {" "}
            By reordering ingredient substitutions for 3 items, you can reduce
            costs by $240 while maintaining quality.{" "}
          </p>{" "}
          <button className="w-full px-3 py-2 bg-green-700 hover:bg-green-600 text-green-100 rounded text-xs font-medium transition-colors">
            {" "}
            Review Substitutions{" "}
          </button>{" "}
        </div>{" "}
        {/* Waste Reduction */}{" "}
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-700 rounded-lg p-4">
          {" "}
          <div className="flex items-start justify-between mb-2">
            {" "}
            <h4 className="font-semibold text-blue-200">
              Waste Reduction
            </h4>{" "}
            <span className="text-xs bg-blue-700 text-blue-100 px-2 py-1 rounded">
              {" "}
              Reduce 18%{" "}
            </span>{" "}
          </div>{" "}
          <p className="text-sm text-primary mb-3">
            {" "}
            Adjust batch sizes on 2 recipes to reduce prep waste without
            impacting guest experience.{" "}
          </p>{" "}
          <button className="w-full px-3 py-2 bg-blue-700 hover:bg-primary text-blue-100 rounded text-xs font-medium transition-colors">
            {" "}
            Apply Adjustments{" "}
          </button>{" "}
        </div>{" "}
        {/* Labor Optimization */}{" "}
        <div className="bg-gradient-to-br from-purple-900 to-purple-800 border border-purple-700 rounded-lg p-4">
          {" "}
          <div className="flex items-start justify-between mb-2">
            {" "}
            <h4 className="font-semibold text-purple-200">
              Labor Efficiency
            </h4>{" "}
            <span className="text-xs bg-purple-700 text-purple-100 px-2 py-1 rounded">
              {" "}
              Save 8h{" "}
            </span>{" "}
          </div>{" "}
          <p className="text-sm text-purple-300 mb-3">
            {" "}
            Resequence prep tasks to parallelize work and reduce total cook time
            by 8 hours.{" "}
          </p>{" "}
          <button className="w-full px-3 py-2 bg-purple-700 hover:bg-purple-600 text-purple-100 rounded text-xs font-medium transition-colors">
            {" "}
            View Schedule{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      {/* Scenario Modeling */}{" "}
      <div className="mt-6 pt-4 border-t border-border">
        {" "}
        <h4 className="text-sm font-semibold text-slate-300 mb-3">
          {" "}
          What-If Scenarios{" "}
        </h4>{" "}
        <div className="space-y-2">
          {" "}
          <button className="w-full text-left px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs font-medium transition-colors">
            {" "}
            📈 Guest Count +50{" "}
          </button>{" "}
          <button className="w-full text-left px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs font-medium transition-colors">
            {" "}
            🚚 Ingredient Delayed{" "}
          </button>{" "}
          <button className="w-full text-left px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs font-medium transition-colors">
            {" "}
            👥 Staff Shortage{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      {/* Historical Performance */}{" "}
      <div className="mt-6 pt-4 border-t border-border">
        {" "}
        <h4 className="text-sm font-semibold text-slate-300 mb-3">
          {" "}
          Historical Insights{" "}
        </h4>{" "}
        <div className="bg-slate-700 rounded p-3 text-xs text-slate-300">
          {" "}
          <p>Similar events averaged:</p>{" "}
          <ul className="mt-2 space-y-1 list-inside list-disc">
            {" "}
            <li>Food cost 28% of revenue</li> <li>Labor 35% of revenue</li>{" "}
            <li>Waste 2.3% of prep weight</li>{" "}
          </ul>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
