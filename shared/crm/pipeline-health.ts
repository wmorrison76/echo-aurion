import type { Prospect, ProspectStage } from "@shared/types/prospect";

export type StageAgingThresholds = Record<ProspectStage, number>;

export type ProspectTargetInput = {
  targetRevenue: number;
  avgDealSize: number;
  ratioProspects?: number;
};

export function calculateRequiredProspects({
  targetRevenue,
  avgDealSize,
  ratioProspects = 10,
}: ProspectTargetInput): number {
  if (!Number.isFinite(targetRevenue) || targetRevenue <= 0) return 0;
  if (!Number.isFinite(avgDealSize) || avgDealSize <= 0) return 0;
  if (!Number.isFinite(ratioProspects) || ratioProspects <= 0) return 0;
  return Math.ceil((targetRevenue / avgDealSize) * ratioProspects);
}

export function buildRequiredProspectsByMonth(args: {
  monthlyTargets: Record<string, number>;
  avgDealSize: number;
  ratioProspects?: number;
}): Record<string, number> {
  const required: Record<string, number> = {};
  for (const [month, targetRevenue] of Object.entries(args.monthlyTargets || {})) {
    required[month] = calculateRequiredProspects({
      targetRevenue: Number(targetRevenue || 0),
      avgDealSize: args.avgDealSize,
      ratioProspects: args.ratioProspects,
    });
  }
  return required;
}

export function calculateCoverageRatio(pipelineCount: number, requiredProspects: number): number {
  if (!Number.isFinite(pipelineCount) || pipelineCount <= 0) return 0;
  if (!Number.isFinite(requiredProspects) || requiredProspects <= 0) return 0;
  return Number((pipelineCount / requiredProspects).toFixed(3));
}

export function defaultStageAgingThresholds(): StageAgingThresholds {
  return {
    prospect: 14,
    qualified: 21,
    proposal: 30,
    negotiation: 21,
    won: 0,
    beo_created: 0,
    lost: 0,
  };
}

export function getProspectAgeDays(
  prospect: Pick<Prospect, "created_at" | "updated_at">,
  now = new Date(),
): number | null {
  const stamp = prospect.updated_at || prospect.created_at;
  if (!stamp) return null;
  const touched = new Date(stamp);
  if (Number.isNaN(touched.getTime())) return null;
  const ms = now.getTime() - touched.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function evaluateStageAging(
  prospects: Prospect[],
  thresholds: StageAgingThresholds = defaultStageAgingThresholds(),
  now = new Date(),
) {
  const staleByStage: Record<ProspectStage, number> = {
    prospect: 0,
    qualified: 0,
    proposal: 0,
    negotiation: 0,
    won: 0,
    beo_created: 0,
    lost: 0,
  };
  const staleProspects: Prospect[] = [];

  for (const prospect of prospects) {
    const threshold = thresholds[prospect.status];
    if (!threshold) continue;
    const age = getProspectAgeDays(prospect, now);
    if (age === null) continue;
    if (age > threshold) {
      staleByStage[prospect.status] += 1;
      staleProspects.push(prospect);
    }
  }

  return {
    staleProspects,
    staleByStage,
    totalStale: staleProspects.length,
  };
}
