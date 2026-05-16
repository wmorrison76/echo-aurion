export type VarianceDriverType =
  | "rate"
  | "volume"
  | "mix"
  | "timing"
  | "staffing";
export interface VarianceDriverBreakdown {
  type: VarianceDriverType;
  percent: number;
}
export interface VarianceObservation {
  propertyId: string;
  propertyName: string;
  department: string;
  glCode: string;
  accountName: string;
  period: string;
  actual: number;
  budget: number;
  forecast?: number;
  driverBreakdown?: VarianceDriverBreakdown[];
  occupancyActual: number;
  occupancyForecast: number;
  staffHoursActual: number;
  staffHoursBudget: number;
  hoursPerOccupancyPoint: number;
}
export interface VarianceRootCause {
  propertyId: string;
  propertyName: string;
  department: string;
  glCode: string;
  accountName: string;
  period: string;
  variance: number;
  severity: "low" | "medium" | "high";
  driver: { type: VarianceDriverType; impact: number };
  narrative: string;
  recommendedActions: string[];
}
export interface StaffingRecommendation {
  propertyId: string;
  propertyName: string;
  department: string;
  glCode: string;
  accountName: string;
  period: string;
  recommendedHours: number;
  deltaHours: number;
  confidence: number;
  shift: "add" | "cut" | "hold";
  rationale: string;
}
export interface VarianceInsightSummary {
  totalVariance: number;
  positiveVariance: number;
  negativeVariance: number;
  propertiesImpacted: number;
  departmentsImpacted: number;
  driverTotals: Record<VarianceDriverType, number>;
}
export interface VarianceInsightResult {
  summary: VarianceInsightSummary;
  rootCauses: VarianceRootCause[];
  staffing: StaffingRecommendation[];
}
export interface VarianceInsightInput {
  observations: VarianceObservation[];
}
const DRIVER_ACTIONS: Record<
  VarianceDriverType,
  (variance: number) => string[]
> = {
  rate: (variance) =>
    variance >= 0
      ? [
          "Lock in forward pricing with primary vendors",
          "Validate invoice rate vs. contract",
        ]
      : [
          "Review rate cards for underutilized discounts",
          "Deploy spot buy approvals to curb overpayment",
        ],
  volume: (variance) =>
    variance >= 0
      ? [
          "Audit receiving logs for over-production",
          "Tune menu mix and waste tracking",
        ]
      : [
          "Replenish on-hand inventory to avoid shortages",
          "Increase pars ahead of forecasted demand",
        ],
  mix: () => [
    "Rebalance product mix towards higher margin offerings",
    "Coordinate with culinary for substitution plan",
  ],
  timing: () => [
    "Re-phase accrual schedule to align with service dates",
    "Confirm month-end cutoff adherence",
  ],
  staffing: (variance) =>
    variance >= 0
      ? [
          "Reassign overtime shifts to lower-cost labor pools",
          "Tighten approval routing for premium shifts",
        ]
      : [
          "Backfill critical coverage to protect guest experience",
          "Authorize targeted overtime with guardrails",
        ],
};
export function calculateVarianceInsights(
  input: VarianceInsightInput,
): VarianceInsightResult {
  const driverTotals: Record<VarianceDriverType, number> = {
    rate: 0,
    volume: 0,
    mix: 0,
    timing: 0,
    staffing: 0,
  };
  const rootCauses: VarianceRootCause[] = [];
  const staffing: StaffingRecommendation[] = [];
  let totalVariance = 0;
  let positiveVariance = 0;
  let negativeVariance = 0;
  const propertyIds = new Set<string>();
  const departmentKeys = new Set<string>();
  for (const observation of input.observations) {
    const variance = roundCurrency(observation.actual - observation.budget);
    totalVariance += variance;
    if (variance >= 0) {
      positiveVariance += variance;
    } else {
      negativeVariance += variance;
    }
    propertyIds.add(observation.propertyId);
    departmentKeys.add(`${observation.propertyId}:${observation.department}`);
    const drivers = normalizeDrivers(observation.driverBreakdown);
    const { topDriver, driverImpact } = resolveTopDriver(variance, drivers);
    driverTotals[topDriver] += driverImpact;
    const severity = determineSeverity(variance, observation.budget);
    const actions = DRIVER_ACTIONS[topDriver](variance);
    const narrative = buildNarrative({
      observation,
      variance,
      driver: topDriver,
      driverImpact,
    });
    rootCauses.push({
      propertyId: observation.propertyId,
      propertyName: observation.propertyName,
      department: observation.department,
      glCode: observation.glCode,
      accountName: observation.accountName,
      period: observation.period,
      variance,
      severity,
      driver: { type: topDriver, impact: roundCurrency(driverImpact) },
      narrative,
      recommendedActions: actions,
    });
    staffing.push(buildStaffingRecommendation(observation, variance));
  }
  const summary: VarianceInsightSummary = {
    totalVariance: roundCurrency(totalVariance),
    positiveVariance: roundCurrency(positiveVariance),
    negativeVariance: roundCurrency(negativeVariance),
    propertiesImpacted: propertyIds.size,
    departmentsImpacted: departmentKeys.size,
    driverTotals: {
      rate: roundCurrency(driverTotals.rate),
      volume: roundCurrency(driverTotals.volume),
      mix: roundCurrency(driverTotals.mix),
      timing: roundCurrency(driverTotals.timing),
      staffing: roundCurrency(driverTotals.staffing),
    },
  };
  rootCauses.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  staffing.sort((a, b) => Math.abs(b.deltaHours) - Math.abs(a.deltaHours));
  return { summary, rootCauses, staffing };
}
function normalizeDrivers(
  breakdown?: VarianceDriverBreakdown[],
): VarianceDriverBreakdown[] {
  if (!breakdown || breakdown.length === 0) {
    return [{ type: "timing", percent: 1 }];
  }
  const total = breakdown.reduce(
    (sum, driver) => sum + Math.abs(driver.percent),
    0,
  );
  if (total === 0) {
    return [{ type: "timing", percent: 1 }];
  }
  return breakdown.map((driver) => ({
    type: driver.type,
    percent: Math.abs(driver.percent) / total,
  }));
}
function resolveTopDriver(
  variance: number,
  drivers: VarianceDriverBreakdown[],
) {
  let topDriver = drivers[0].type;
  let impact = variance * drivers[0].percent;
  for (let index = 1; index < drivers.length; index += 1) {
    const driver = drivers[index];
    const driverImpact = variance * driver.percent;
    if (Math.abs(driverImpact) > Math.abs(impact)) {
      topDriver = driver.type;
      impact = driverImpact;
    }
  }
  return { topDriver, driverImpact: impact };
}
function determineSeverity(variance: number, budget: number) {
  const denominator = Math.max(Math.abs(budget), 1);
  const ratio = Math.abs(variance) / denominator;
  if (ratio >= 0.1) {
    return "high" as const;
  }
  if (ratio >= 0.04) {
    return "medium" as const;
  }
  return "low" as const;
}
function buildNarrative({
  observation,
  variance,
  driver,
  driverImpact,
}: {
  observation: VarianceObservation;
  variance: number;
  driver: VarianceDriverType;
  driverImpact: number;
}) {
  const direction = variance >= 0 ? "unfavorable" : "favorable";
  const driverLabel =
    driver === "rate" ? "rate" : driver === "volume" ? "volume" : driver;
  const impact = formatCurrency(driverImpact, observation);
  return `${observation.propertyName} ${observation.department} (GL ${observation.glCode}) posted a ${direction} variance of ${formatCurrency(variance, observation)} with ${driverLabel} contributing ${impact}.`;
}
function buildStaffingRecommendation(
  observation: VarianceObservation,
  variance: number,
): StaffingRecommendation {
  const occupancyDelta =
    observation.occupancyForecast - observation.occupancyActual;
  const deltaPoints = occupancyDelta * 100;
  const baselineHours = observation.staffHoursActual;
  const shiftHours = deltaPoints * observation.hoursPerOccupancyPoint;
  const recommendedHours = Math.max(0, roundHours(baselineHours + shiftHours));
  const deltaHours = roundHours(recommendedHours - baselineHours);
  const shift = deltaHours > 1 ? "add" : deltaHours < -1 ? "cut" : "hold";
  const confidenceBase = clamp(Math.abs(deltaPoints) / 20, 0, 0.35);
  const varianceSignal = clamp(
    Math.abs(variance) / Math.max(Math.abs(observation.budget), 1),
    0,
    0.25,
  );
  const confidence = roundPercent(0.55 + confidenceBase + varianceSignal);
  const direction =
    shift === "add" ? "Add" : shift === "cut" ? "Reduce" : "Hold";
  const rationale = `${direction} ${Math.abs(deltaHours)} labor hours for ${observation.department} as occupancy is trending ${occupancyDelta >= 0 ? "up" : "down"} to ${Math.round(observation.occupancyForecast * 100)}%.`;
  return {
    propertyId: observation.propertyId,
    propertyName: observation.propertyName,
    department: observation.department,
    glCode: observation.glCode,
    accountName: observation.accountName,
    period: observation.period,
    recommendedHours,
    deltaHours,
    confidence: confidence,
    shift,
    rationale,
  };
}
function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
function roundHours(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}
function roundPercent(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
function formatCurrency(amount: number, observation: VarianceObservation) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: inferCurrency(observation),
    maximumFractionDigits: Math.abs(amount) >= 1000 ? 0 : 2,
  }).format(amount);
}
function inferCurrency(observation: VarianceObservation) {
  if (observation.accountName.toLowerCase().includes("euro")) {
    return "EUR";
  }
  return "USD";
}
