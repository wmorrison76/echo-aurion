import type { CashPosition, Payable } from "./cash";
export interface RunwayProjection {
  date: string;
  closingBalance: number;
  varianceVsPrior: number;
}
export interface RunwaySummary {
  runwayDays: number;
  shortfallDate?: string;
  projections: RunwayProjection[];
  narrative: string;
}
export interface LaborSnapshot {
  property: string;
  department: string;
  scheduledHours: number;
  overtimeHours: number;
  overtimeCost: number;
  baselineOvertimeCost: number;
}
export interface LaborRecommendation {
  property: string;
  department: string;
  recommendedOvertimeShift: number;
  savings: number;
  narrative: string;
}
export interface PortfolioExposure {
  property: string;
  revenue: number;
  laborCost: number;
  exposure: number;
  region?: string;
  brand?: string;
}
export interface PortfolioSummary {
  totalRevenue: number;
  totalLabor: number;
  exposures: PortfolioExposure[];
}
export interface PortfolioRollupBreakdown {
  key: string;
  revenue: number;
  laborCost: number;
  exposure: number;
  marginPercent: number;
}
export interface PortfolioRollupSummary {
  totalRevenue: number;
  totalLabor: number;
  marginPercent: number;
  byRegion: PortfolioRollupBreakdown[];
  byBrand: PortfolioRollupBreakdown[];
  narrative: string;
}
export function buildRunwaySummary(
  positions: RunwayProjection[],
  minimumBalance: number,
): RunwaySummary {
  let shortfallDate: string | undefined;
  for (const projection of positions) {
    if (!shortfallDate && projection.closingBalance < minimumBalance) {
      shortfallDate = projection.date;
    }
  }
  const runwayIndex = positions.findIndex(
    (projection) => projection.closingBalance < minimumBalance,
  );
  const runwayDays = runwayIndex >= 0 ? runwayIndex : positions.length;
  const narrative = shortfallDate
    ? `Cash runway reaches minimum balance on ${shortfallDate} (day ${runwayDays}). Prior period variance ${positions[runwayIndex]?.varianceVsPrior.toFixed(0)}.`
    : `90-day runway remains above policy threshold with ending balance ${positions.length > 0 ? positions[positions.length - 1].closingBalance.toFixed(0) : "0"}.`;
  return { runwayDays, shortfallDate, projections: positions, narrative };
}
export function recommendLaborTrades(
  entries: LaborSnapshot[],
): LaborRecommendation[] {
  return entries.map((entry) => {
    const savings = entry.overtimeCost - entry.baselineOvertimeCost;
    const shift =
      savings > 0
        ? Math.min(
            entry.overtimeHours,
            savings / (entry.overtimeCost / entry.overtimeHours || 1),
          )
        : 0;
    return {
      property: entry.property,
      department: entry.department,
      recommendedOvertimeShift: Number.isFinite(shift) ? shift : 0,
      savings: Math.max(0, savings),
      narrative:
        savings > 0
          ? `Trade ${shift.toFixed(1)} overtime hours to baseline to save ${savings.toFixed(0)}.`
          : "No overtime savings identified.",
    };
  });
}
export interface LaborOptimizationResult {
  recommendations: LaborRecommendation[];
  totalSavings: number;
  totalRecommendedShift: number;
  propertiesImpacted: number;
  narrative: string;
}
export function optimizeLabor(
  entries: LaborSnapshot[],
): LaborOptimizationResult {
  const recommendations = recommendLaborTrades(entries).sort(
    (a, b) => b.savings - a.savings,
  );
  const totalSavings = recommendations.reduce(
    (sum, item) => sum + item.savings,
    0,
  );
  const totalRecommendedShift = recommendations.reduce(
    (sum, item) => sum + item.recommendedOvertimeShift,
    0,
  );
  const propertiesImpacted = new Set(
    recommendations.map((item) => item.property),
  ).size;
  const top = recommendations[0];
  const narrative =
    recommendations.length === 0
      ? "No overtime savings identified across the provided properties."
      : `Redirect ${totalRecommendedShift.toFixed(1)} overtime hours to baseline staffing to save ${totalSavings.toFixed(0)} across ${propertiesImpacted} property${propertiesImpacted === 1 ? "" : "ies"}. Top opportunity: ${top.property} ${top.department} saves ${top.savings.toFixed(0)}.`;
  return {
    recommendations,
    totalSavings,
    totalRecommendedShift,
    propertiesImpacted,
    narrative,
  };
}
export function buildPortfolioExposure(
  report: PortfolioExposure[],
): PortfolioSummary {
  const totalRevenue = report.reduce((sum, item) => sum + item.revenue, 0);
  const totalLabor = report.reduce((sum, item) => sum + item.laborCost, 0);
  const exposures = report.map((item) => ({
    ...item,
    exposure: totalRevenue === 0 ? 0 : item.revenue / totalRevenue,
  }));
  return { totalRevenue, totalLabor, exposures };
}
function buildRollup(
  entries: PortfolioExposure[],
  selector: (entry: PortfolioExposure) => string | undefined,
  totalRevenue: number,
) {
  const aggregates = new Map<string, { revenue: number; laborCost: number }>();
  for (const entry of entries) {
    const key = selector(entry) ?? "Unassigned";
    const aggregate = aggregates.get(key) ?? { revenue: 0, laborCost: 0 };
    aggregate.revenue += entry.revenue;
    aggregate.laborCost += entry.laborCost;
    aggregates.set(key, aggregate);
  }
  return [...aggregates.entries()]
    .map(([key, aggregate]) => {
      const exposure =
        totalRevenue === 0 ? 0 : aggregate.revenue / totalRevenue;
      const marginPercent =
        aggregate.revenue === 0
          ? 0
          : ((aggregate.revenue - aggregate.laborCost) / aggregate.revenue) *
            100;
      return {
        key,
        revenue: aggregate.revenue,
        laborCost: aggregate.laborCost,
        exposure,
        marginPercent,
      } satisfies PortfolioRollupBreakdown;
    })
    .sort((a, b) => b.revenue - a.revenue);
}
export function buildPortfolioRollups(
  entries: PortfolioExposure[],
): PortfolioRollupSummary {
  const { totalRevenue, totalLabor, exposures } =
    buildPortfolioExposure(entries);
  const byRegion = buildRollup(
    exposures,
    (entry) => entry.region,
    totalRevenue,
  );
  const byBrand = buildRollup(exposures, (entry) => entry.brand, totalRevenue);
  const primary = byRegion[0] ?? byBrand[0];
  const marginPercent =
    totalRevenue === 0 ? 0 : ((totalRevenue - totalLabor) / totalRevenue) * 100;
  const narrative = primary
    ? `${primary.key} contributes ${(primary.exposure * 100).toFixed(1)}% of revenue with labor margin ${primary.marginPercent.toFixed(1)}%.`
    : "No portfolio breakdown available.";
  return {
    totalRevenue,
    totalLabor,
    marginPercent,
    byRegion,
    byBrand,
    narrative,
  };
}
