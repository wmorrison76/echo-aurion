/***
 * LUCCCA — BUILD 30
 * Pre-Service Briefing Generator
 *
 * OUTPUT:
 *  - Structured summary for stakeholders
 *  - Single source of truth
 ***/

export type BriefingTimeline = {
  label: string;
  time: string;
};

export type BriefingStaffing = {
  role: string;
  count: number;
  totalHours: number;
};

export type BriefingProcurement = {
  ingredient: string;
  total: string;
};

export type BriefingRisk = {
  label: string;
  impact: number;
};

export type BriefingHeader = {
  name: string;
  date?: string;
  headcount: number;
  space: string;
  riskScore: number;
  riskBand: string;
};

export type Briefing = {
  header: BriefingHeader;
  timeline: BriefingTimeline[];
  staffing: BriefingStaffing[];
  procurement: BriefingProcurement[];
  risks: BriefingRisk[];
  notes: string[];
};

export function generateBriefing(
  event: any,
  staffing: any,
  procurement: any,
  risk: any
): Briefing {
  return {
    header: {
      name: event.title || event.name,
      date: event.start,
      headcount: event.headcount,
      space: event.space,
      riskScore: risk.score,
      riskBand: risk.band,
    },

    timeline: event.opsTimeline || [],

    staffing: (staffing.roles || []).map((r: any) => ({
      role: r.role,
      count: r.count,
      totalHours: r.totalHours,
    })),

    procurement: (procurement.items || []).map((i: any) => ({
      ingredient: i.ingredientName,
      total: `${i.totalQty} ${i.unit}`,
    })),

    risks: (risk.factors || []).map((f: any) => ({
      label: f.label,
      impact: f.impact,
    })),

    notes: [
      "Verify HVAC schedule",
      "Confirm stewarding availability",
      "Review staffing assignments",
      "Confirm BEO final changes",
    ],
  };
}
