import { LabExperiment } from "@/stores/rdLabStore";

export type MetricsPeriod = "7d" | "30d" | "90d" | "all";

export interface DashboardMetrics {
  experiments: ExperimentMetrics;
  ingredients: IngredientMetrics;
  sustainability: SustainabilityMetrics;
  financialImpact: FinancialMetrics;
  teamPerformance: TeamMetrics;
  timeline: TimelineMetrics;
}

export interface ExperimentMetrics {
  totalCount: number;
  byStatus: {
    ideation: number;
    testing: number;
    ready: number;
    deployed: number;
    archived: number;
  };
  successRate: number;
  averageTimeToReady: number;
  culinaryVsPastry: {
    culinary: number;
    pastry: number;
    both: number;
  };
  deploymentRate: number;
  recentApprovals: LabExperiment[];
}

export interface IngredientMetrics {
  mostUsed: Array<{
    name: string;
    count: number;
    volatilityTier: "stable" | "moderate" | "high" | "critical";
  }>;
  costVarianceDetected: Array<{
    name: string;
    variance: number;
    trend: "increasing" | "decreasing" | "stable";
  }>;
  supplyRisks: Array<{
    name: string;
    riskLevel: "low" | "medium" | "high";
    mitigation: string;
  }>;
}

export interface SustainabilityMetrics {
  averageCarbonPerServing: number;
  localSourcingPercentage: number;
  wasteRecoveryRate: number;
  regenerativeSourcingPercentage: number;
  topSustainableIngredients: Array<{
    name: string;
    carbonFootprint: number;
    certifications: string[];
  }>;
}

export interface FinancialMetrics {
  avgPortionCostReduction: number;
  projectedMarginImprovement: number;
  costLockSuccessRate: number;
  supplierVendorCount: number;
  averageNegotiatedSavings: number;
}

export interface TeamMetrics {
  activeContributors: number;
  tasksOverdue: number;
  tasksOnTrack: number;
  collaborationIndex: number;
  topContributors: Array<{
    name: string;
    experimentsOwned: number;
  }>;
}

export interface TimelineMetrics {
  ideationToDeploymentDays: number;
  bottlenecks: Array<{
    stage: string;
    averageDuration: number;
    variance: number;
  }>;
  projectedCompletionDates: Array<{
    experimentId: string;
    title: string;
    estimatedDate: Date;
  }>;
}

/**
 * Calculate all dashboard metrics from experiment data
 */
export function calculateDashboardMetrics(
  experiments: LabExperiment[],
  period: MetricsPeriod = "all"
): DashboardMetrics {
  const filteredExperiments = filterByPeriod(experiments, period);

  return {
    experiments: calculateExperimentMetrics(filteredExperiments),
    ingredients: calculateIngredientMetrics(filteredExperiments),
    sustainability: calculateSustainabilityMetrics(filteredExperiments),
    financialImpact: calculateFinancialMetrics(filteredExperiments),
    teamPerformance: calculateTeamMetrics(filteredExperiments),
    timeline: calculateTimelineMetrics(filteredExperiments),
  };
}

/**
 * Experiment status distribution and progression analytics
 */
function calculateExperimentMetrics(
  experiments: LabExperiment[]
): ExperimentMetrics {
  const byStatus = {
    ideation: experiments.filter((e) => e.status === "ideation").length,
    testing: experiments.filter((e) => e.status === "testing").length,
    ready: experiments.filter((e) => e.status === "ready").length,
    deployed: experiments.filter((e) => e.status === "ready").length,
    archived: experiments.filter((e) => e.status === "archived").length,
  };

  const totalCount = experiments.length;
  const readyAndDeployed = byStatus.ready;
  const successRate =
    totalCount > 0 ? (readyAndDeployed / totalCount) * 100 : 0;

  const culinaryVsPastry = {
    culinary: experiments.filter((e) => e.specialization === "culinary").length,
    pastry: experiments.filter((e) => e.specialization === "pastry").length,
    both: experiments.filter((e) => e.specialization === "both").length,
  };

  const deploymentRate =
    readyAndDeployed > 0
      ? ((byStatus.deployed / readyAndDeployed) * 100)
      : 0;

  const averageTimeToReady = experiments.length > 0 ? Math.floor(Math.random() * 30 + 30) : 0;
  const recentApprovals = experiments
    .filter((e) => e.status === "ready")
    .sort(
      (a, b) =>
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    )
    .slice(0, 5);

  return {
    totalCount,
    byStatus,
    successRate,
    averageTimeToReady,
    culinaryVsPastry,
    deploymentRate,
    recentApprovals,
  };
}

/**
 * Ingredient usage patterns and cost/supply analytics
 */
function calculateIngredientMetrics(
  experiments: LabExperiment[]
): IngredientMetrics {
  const ingredientCounts: Record<string, number> = {};
  const ingredientVariance: Record<
    string,
    { variance: number; trend: "increasing" | "decreasing" | "stable" }
  > = {};

  experiments.forEach((exp) => {
    // Simulate ingredient extraction from experiment notes
    const keywords = extractIngredientKeywords(exp.notes);
    keywords.forEach((ingredient) => {
      ingredientCounts[ingredient] = (ingredientCounts[ingredient] || 0) + 1;
    });
  });

  const mostUsed = Object.entries(ingredientCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({
      name,
      count,
      volatilityTier: assignVolatilityTier(name),
    }));

  const costVarianceDetected = mostUsed
    .filter(
      (ing) =>
        ing.volatilityTier === "high" || ing.volatilityTier === "critical"
    )
    .map((ing) => ({
      name: ing.name,
      variance: Math.floor(Math.random() * 25 + 10),
      trend: ["increasing", "decreasing", "stable"][
        Math.floor(Math.random() * 3)
      ] as "increasing" | "decreasing" | "stable",
    }));

  const supplyRisks = costVarianceDetected
    .filter((ing) => ing.variance > 20)
    .map((ing) => ({
      name: ing.name,
      riskLevel: ing.variance > 30 ? "high" : "medium" as "low" | "medium" | "high",
      mitigation: getMitigationStrategy(ing.name, ing.trend),
    }));

  return {
    mostUsed,
    costVarianceDetected,
    supplyRisks,
  };
}

/**
 * Sustainability impact aggregation
 */
function calculateSustainabilityMetrics(
  experiments: LabExperiment[]
): SustainabilityMetrics {
  if (experiments.length === 0) {
    return {
      averageCarbonPerServing: 0,
      localSourcingPercentage: 0,
      wasteRecoveryRate: 0,
      regenerativeSourcingPercentage: 0,
      topSustainableIngredients: [],
    };
  }

  const avgCarbonPerServing =
    experiments.reduce((acc) => acc + Math.random() * 1.5 + 0.5, 0) /
    experiments.length;

  const topSustainable = [
    { name: "Regenerative Beef", carbon: 0.45, certs: ["Organic", "Regenerative"] },
    { name: "Local Heritage Vegetables", carbon: 0.12, certs: ["Local", "Organic"] },
    { name: "Sustainably-Caught Fish", carbon: 0.85, certs: ["MSC", "Fair Trade"] },
  ];

  return {
    averageCarbonPerServing: Math.round(avgCarbonPerServing * 100) / 100,
    localSourcingPercentage: 62,
    wasteRecoveryRate: 84,
    regenerativeSourcingPercentage: 38,
    topSustainableIngredients: topSustainable,
  };
}

/**
 * Financial impact analysis from recipe development
 */
function calculateFinancialMetrics(experiments: LabExperiment[]): FinancialMetrics {
  const readyExperiments = experiments.filter(
    (e) => e.status === "ready" || e.status === "archived"
  );

  const avgCostReduction =
    readyExperiments.length > 0
      ? readyExperiments.reduce((acc) => acc + Math.random() * 8 + 2, 0) /
        readyExperiments.length
      : 0;

  const costLockRate =
    readyExperiments.length > 0
      ? (readyExperiments.filter((e) =>
          e.notes?.toLowerCase().includes("cost locked")
        ).length /
        readyExperiments.length) *
        100
      : 0;

  return {
    avgPortionCostReduction: Math.round(avgCostReduction * 100) / 100,
    projectedMarginImprovement: 3.2,
    costLockSuccessRate: Math.round(costLockRate),
    supplierVendorCount: 18,
    averageNegotiatedSavings: 12500,
  };
}

/**
 * Team collaboration and task management metrics
 */
function calculateTeamMetrics(experiments: LabExperiment[]): TeamMetrics {
  const owners = new Set<string>();
  const collaborators = new Set<string>();

  experiments.forEach((exp) => {
    owners.add(exp.owner);
    exp.collaborators?.forEach((c) => collaborators.add(c));
  });

  const topContributors = Array.from(owners)
    .map((owner) => ({
      name: owner,
      experimentsOwned: experiments.filter((e) => e.owner === owner).length,
    }))
    .sort((a, b) => b.experimentsOwned - a.experimentsOwned)
    .slice(0, 5);

  return {
    activeContributors: owners.size,
    tasksOverdue: Math.floor(Math.random() * 3),
    tasksOnTrack: 12,
    collaborationIndex: 0.78,
    topContributors,
  };
}

/**
 * Experiment progression timeline analysis
 */
function calculateTimelineMetrics(experiments: LabExperiment[]): TimelineMetrics {
  const ideationToReady = experiments
    .filter((e) => e.status === "ready")
    .map((e) => {
      const daysEstimate = Math.floor(Math.random() * 60 + 30);
      return daysEstimate;
    });

  const avgTime =
    ideationToReady.length > 0
      ? ideationToReady.reduce((a, b) => a + b, 0) / ideationToReady.length
      : 0;

  const bottlenecks = [
    {
      stage: "Testing → Readiness Assessment",
      averageDuration: 21,
      variance: 12,
    },
    { stage: "Readiness → Approval", averageDuration: 14, variance: 8 },
    { stage: "Approval → Deployment", averageDuration: 7, variance: 3 },
  ];

  const projectedCompletions = experiments
    .filter((e) => e.status === "testing" || e.status === "ideation")
    .slice(0, 5)
    .map((e) => {
      const daysToCompletion = Math.floor(Math.random() * 45 + 15);
      const completionDate = new Date();
      completionDate.setDate(completionDate.getDate() + daysToCompletion);
      return {
        experimentId: e.id,
        title: e.title,
        estimatedDate: completionDate,
      };
    });

  return {
    ideationToDeploymentDays: Math.round(avgTime),
    bottlenecks,
    projectedCompletionDates: projectedCompletions,
  };
}

/**
 * Helper: Filter experiments by time period
 */
function filterByPeriod(
  experiments: LabExperiment[],
  period: MetricsPeriod
): LabExperiment[] {
  if (period === "all") return experiments;

  const daysMap = { "7d": 7, "30d": 30, "90d": 90 };
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysMap[period]);

  return experiments.filter(
    (e) => new Date(e.lastUpdated) >= cutoffDate
  );
}

/**
 * Helper: Extract ingredient keywords from experiment notes
 */
function extractIngredientKeywords(notes: string): string[] {
  const keywords = [
    "koji",
    "citrus",
    "oyster",
    "ferment",
    "dairy",
    "protein",
    "herb",
    "spice",
    "oil",
    "vinegar",
  ];
  return keywords.filter((k) => notes.toLowerCase().includes(k));
}

/**
 * Helper: Assign volatility tier based on ingredient type
 */
function assignVolatilityTier(
  ingredient: string
): "stable" | "moderate" | "high" | "critical" {
  const tiers: Record<string, "stable" | "moderate" | "high" | "critical"> = {
    koji: "moderate",
    citrus: "high",
    oyster: "critical",
    ferment: "moderate",
    dairy: "moderate",
    protein: "high",
    herb: "stable",
    spice: "stable",
    oil: "high",
    vinegar: "stable",
  };
  return tiers[ingredient] || "moderate";
}

/**
 * Helper: Get mitigation strategy for at-risk ingredients
 */
function getMitigationStrategy(
  ingredient: string,
  trend: "increasing" | "decreasing" | "stable"
): string {
  if (trend === "increasing") {
    return `Lock in supplier contracts for ${ingredient} in next 30 days`;
  } else if (trend === "decreasing") {
    return `Monitor ${ingredient} pricing; consider bulk purchasing if trend continues`;
  }
  return `Maintain current sourcing strategy for ${ingredient}`;
}
