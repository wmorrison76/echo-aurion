/********************************************************************
 * LUCCCA — BUILD 24
 * Operational Walkthrough Section
 *
 * PURPOSE:
 *  - Display step-by-step operational plan for an event
 *  - Organized by department and timeline
 *********************************************************************/

import React, { useState } from "react";
import { ChevronDown, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

export interface OperationalStep {
  sequence: number;
  timeOffset: number;
  department: string;
  task: string;
  estimatedDuration: number;
  priority: "critical" | "high" | "normal" | "low";
  dependencies?: string[];
}

export interface OperationalWalkthroughData {
  eventId: string;
  eventTitle: string;
  startTime: string;
  headcount: number;
  space: string;
  steps: OperationalStep[];
  timeline: {
    preEvent: string[];
    duringEvent: string[];
    postEvent: string[];
  };
}

const departmentColors: Record<string, string> = {
  Setup: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
  Culinary: "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
  Pastry: "bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200",
  Bar: "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200",
  Stewarding: "bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200",
  Engineering: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
  FOH: "bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200",
  Strike: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
};

const priorityIcons = {
  critical: "🚨",
  high: "⚠️",
  normal: "•",
  low: "○",
};

export default function OperationalWalkthroughSection({
  data,
}: {
  data: OperationalWalkthroughData;
}) {
  const [expandedPhase, setExpandedPhase] = useState<string>("preEvent");
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  // Group steps by department
  const stepsByDept: Record<string, OperationalStep[]> = {};
  data.steps.forEach((step) => {
    if (!stepsByDept[step.department]) {
      stepsByDept[step.department] = [];
    }
    stepsByDept[step.department].push(step);
  });

  // Sort departments by first task offset
  const deptOrder = Object.keys(stepsByDept).sort(
    (a, b) =>
      Math.min(...stepsByDept[a].map((s) => s.timeOffset)) -
      Math.min(...stepsByDept[b].map((s) => s.timeOffset))
  );

  const formatTimeOffset = (offset: number): string => {
    if (offset === 0) return "At Event Start";
    if (offset > 0) {
      const hours = Math.floor(offset / 60);
      const minutes = offset % 60;
      return `${hours}h ${minutes}m after start`;
    } else {
      const absOffset = Math.abs(offset);
      const hours = Math.floor(absOffset / 60);
      const minutes = absOffset % 60;
      return `${hours}h ${minutes}m before start`;
    }
  };

  const getPhaseSteps = (phase: "preEvent" | "duringEvent" | "postEvent") => {
    if (phase === "preEvent") {
      return data.steps.filter((s) => s.timeOffset < 0);
    } else if (phase === "duringEvent") {
      const eventDuration = 0; // simplified - would need to calculate from start/end
      return data.steps.filter((s) => s.timeOffset >= 0);
    } else {
      return data.steps.filter((s) => s.timeOffset > 0);
    }
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-sm w-full overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Operational Walkthrough
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Step-by-step plan for {data.headcount} guests in {data.space}
        </p>
      </div>

      <div className="space-y-1">
        {/* PRE-EVENT PHASE */}
        <div className="border-b border-slate-100 dark:border-slate-700">
          <button
            className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between"
            onClick={() =>
              setExpandedPhase(expandedPhase === "preEvent" ? "" : "preEvent")
            }
          >
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              📋 Pre-Event Setup
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${expandedPhase === "preEvent" ? "rotate-180" : ""}`}
            />
          </button>

          {expandedPhase === "preEvent" && (
            <div className="px-4 py-2 space-y-2 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700">
              {getPhaseSteps("preEvent").map((step) => (
                <StepItem
                  key={step.sequence}
                  step={step}
                  formatTimeOffset={formatTimeOffset}
                  departmentColors={departmentColors}
                  priorityIcons={priorityIcons}
                />
              ))}
              {getPhaseSteps("preEvent").length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 p-2">
                  No pre-event tasks
                </p>
              )}
            </div>
          )}
        </div>

        {/* DURING-EVENT PHASE */}
        <div className="border-b border-slate-100 dark:border-slate-700">
          <button
            className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between"
            onClick={() =>
              setExpandedPhase(expandedPhase === "duringEvent" ? "" : "duringEvent")
            }
          >
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              🎯 During Event
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${expandedPhase === "duringEvent" ? "rotate-180" : ""}`}
            />
          </button>

          {expandedPhase === "duringEvent" && (
            <div className="px-4 py-2 space-y-2 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700">
              {getPhaseSteps("duringEvent").map((step) => (
                <StepItem
                  key={step.sequence}
                  step={step}
                  formatTimeOffset={formatTimeOffset}
                  departmentColors={departmentColors}
                  priorityIcons={priorityIcons}
                />
              ))}
              {getPhaseSteps("duringEvent").length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 p-2">
                  No during-event tasks
                </p>
              )}
            </div>
          )}
        </div>

        {/* POST-EVENT PHASE */}
        <div>
          <button
            className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between"
            onClick={() =>
              setExpandedPhase(expandedPhase === "postEvent" ? "" : "postEvent")
            }
          >
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              🔄 Post-Event Strike
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${expandedPhase === "postEvent" ? "rotate-180" : ""}`}
            />
          </button>

          {expandedPhase === "postEvent" && (
            <div className="px-4 py-2 space-y-2 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700">
              {getPhaseSteps("postEvent").map((step) => (
                <StepItem
                  key={step.sequence}
                  step={step}
                  formatTimeOffset={formatTimeOffset}
                  departmentColors={departmentColors}
                  priorityIcons={priorityIcons}
                />
              ))}
              {getPhaseSteps("postEvent").length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 p-2">
                  No post-event tasks
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Priority:</span>
            <span>🚨 Critical</span>
            <span>⚠️ High</span>
            <span>• Normal</span>
            <span>○ Low</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Individual step item component
 */
function StepItem({
  step,
  formatTimeOffset,
  departmentColors,
  priorityIcons,
}: {
  step: OperationalStep;
  formatTimeOffset: (offset: number) => string;
  departmentColors: Record<string, string>;
  priorityIcons: Record<string, string>;
}) {
  return (
    <div className="p-2 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${departmentColors[step.department] || departmentColors["Setup"]}`}
            >
              {step.department}
            </span>
            <span className="text-slate-400 dark:text-slate-500">
              {priorityIcons[step.priority]}
            </span>
          </div>
          <p className="font-medium text-slate-700 dark:text-slate-200">
            {step.task}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
        <span>{formatTimeOffset(step.timeOffset)}</span>
        <span>{step.estimatedDuration} min</span>
      </div>
    </div>
  );
}
