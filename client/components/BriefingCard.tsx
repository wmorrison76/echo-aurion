/***
 * LUCCCA — BUILD 30 (UI)
 * BriefingCard
 *
 * PURPOSE:
 *  - Display auto-generated briefing in Event Drawer
 ***/

import React from "react";

type BriefingHeader = {
  name: string;
  space: string;
  headcount: number;
  riskScore: number;
  riskBand: string;
};

type BriefingTimeline = {
  label: string;
  time: string;
};

type BriefingStaffing = {
  role: string;
  count: number;
  totalHours: number;
};

type BriefingProcurement = {
  ingredient: string;
  total: string;
};

type BriefingRisk = {
  label: string;
  impact: number;
};

type Briefing = {
  header: BriefingHeader;
  timeline: BriefingTimeline[];
  staffing: BriefingStaffing[];
  procurement: BriefingProcurement[];
  risks: BriefingRisk[];
  notes: string[];
};

export default function BriefingCard({ briefing }: { briefing?: Briefing }) {
  if (!briefing) return null;

  return (
    <div className="border border-slate-200 p-3 rounded-md bg-white text-sm space-y-3">
      <h3 className="font-semibold text-slate-700">Pre-Service Briefing</h3>

      <div className="text-xs text-slate-600 space-y-1">
        <div>
          <strong>Event:</strong> {briefing.header.name}
        </div>
        <div>
          <strong>Space:</strong> {briefing.header.space}
        </div>
        <div>
          <strong>Headcount:</strong> {briefing.header.headcount}
        </div>
        <div>
          <strong>Risk:</strong> {briefing.header.riskScore} (
          {briefing.header.riskBand})
        </div>
      </div>

      {briefing.timeline && briefing.timeline.length > 0 && (
        <div className="border-t border-slate-200 pt-2">
          <h4 className="text-xs font-semibold text-slate-700 mb-1">
            Timeline
          </h4>
          <div className="text-xs text-slate-600 space-y-0.5">
            {briefing.timeline.map((t, i) => (
              <div key={i}>
                <strong>{t.label}:</strong> {t.time}
              </div>
            ))}
          </div>
        </div>
      )}

      {briefing.staffing && briefing.staffing.length > 0 && (
        <div className="border-t border-slate-200 pt-2">
          <h4 className="text-xs font-semibold text-slate-700 mb-1">
            Staffing
          </h4>
          <div className="text-xs text-slate-600 space-y-0.5">
            {briefing.staffing.map((s, i) => (
              <div key={i}>
                {s.role}: {s.count} ({s.totalHours}h)
              </div>
            ))}
          </div>
        </div>
      )}

      {briefing.risks && briefing.risks.length > 0 && (
        <div className="border-t border-slate-200 pt-2">
          <h4 className="text-xs font-semibold text-slate-700 mb-1">
            Risk Factors
          </h4>
          <div className="text-xs text-slate-600 space-y-0.5">
            {briefing.risks.map((r, i) => (
              <div key={i}>
                {r.label} (+{r.impact})
              </div>
            ))}
          </div>
        </div>
      )}

      {briefing.notes && briefing.notes.length > 0 && (
        <div className="border-t border-slate-200 pt-2">
          <h4 className="text-xs font-semibold text-slate-700 mb-1">Notes</h4>
          <ul className="text-xs text-slate-600 space-y-0.5 list-disc pl-4">
            {briefing.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
