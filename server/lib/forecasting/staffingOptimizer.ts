/**
 * PHASE 1: CORE AI FOUNDATION - Week 3 Day 12
 * Staffing Optimizer using Integer Linear Programming
 * 
 * Solves:
 * - Minimize labor cost
 * - Subject to coverage constraints
 * - Subject to compliance rules
 * - Subject to budget constraints
 * 
 * Uses simplified solver (in production: use pulp, PuLP, or SCIP)
 */

interface StaffingProblem {
  demandForecast: number; // Expected customers/covers
  availableStaff: number; // Number of employees available
  laborBudget: number; // Max $ to spend on this shift
  minCoverageRatio: number; // Min staff per customer (e.g., 1 staff per 15 covers)
  minStaffPerShift: number; // Absolute minimum
  maxStaffPerShift: number; // Absolute maximum
  averageHourlyRate: number; // Average $ per hour for position
  shiftDurationHours: number; // Hours in shift
}

interface OptimizationResult {
  recommendedStaff: number;
  estimatedCost: number;
  coverageRatio: number;
  constraints: {
    demand: boolean;
    budget: boolean;
    minStaff: boolean;
    maxStaff: boolean;
  };
  rationale: string;
}

/**
 * Staffing Optimizer
 * Recommends optimal staff count given constraints
 */
export class StaffingOptimizer {
  /**
   * Optimize staffing for a shift
   */
  static optimize(problem: StaffingProblem): OptimizationResult {
    // Calculate required staff based on demand
    const demandBasedStaff = Math.ceil(problem.demandForecast / (1 / problem.minCoverageRatio));

    // Calculate staff we can afford
    const maxAffordable = Math.floor(problem.laborBudget / (problem.averageHourlyRate * problem.shiftDurationHours));

    // Apply constraints
    let recommendedStaff = demandBasedStaff;

    // Apply min/max constraints
    recommendedStaff = Math.max(recommendedStaff, problem.minStaffPerShift);
    recommendedStaff = Math.min(recommendedStaff, problem.maxStaffPerShift);

    // Apply budget constraint
    if (recommendedStaff > maxAffordable) {
      // If we can't afford demand-based staffing, reduce as much as possible while meeting minimums
      recommendedStaff = Math.min(Math.max(maxAffordable, problem.minStaffPerShift), problem.maxStaffPerShift);
    }

    // Ensure we have available staff
    recommendedStaff = Math.min(recommendedStaff, problem.availableStaff);

    // Calculate estimated cost and coverage
    const estimatedCost = recommendedStaff * problem.averageHourlyRate * problem.shiftDurationHours;
    const coverageRatio = recommendedStaff > 0 ? problem.demandForecast / recommendedStaff : 0;

    // Check all constraints
    const constraints = {
      demand: recommendedStaff >= demandBasedStaff,
      budget: estimatedCost <= problem.laborBudget,
      minStaff: recommendedStaff >= problem.minStaffPerShift,
      maxStaff: recommendedStaff <= problem.maxStaffPerShift,
    };

    // Build rationale
    const rationale = this.buildRationale(
      recommendedStaff,
      demandBasedStaff,
      estimatedCost,
      problem.laborBudget,
      constraints
    );

    return {
      recommendedStaff,
      estimatedCost,
      coverageRatio,
      constraints,
      rationale,
    };
  }

  /**
   * Build human-readable explanation of the optimization
   */
  private static buildRationale(
    recommended: number,
    demandBased: number,
    estimatedCost: number,
    budget: number,
    constraints: { demand: boolean; budget: boolean; minStaff: boolean; maxStaff: boolean }
  ): string {
    if (!constraints.demand) {
      return `Budget constraint: can only afford ${recommended} staff (need ${demandBased} for demand)`;
    }

    if (!constraints.budget) {
      return `${recommended} staff needed for demand but would cost $${estimatedCost} (budget: $${budget})`;
    }

    if (constraints.demand && constraints.budget) {
      return `Optimal: ${recommended} staff covers demand and within budget`;
    }

    return `Recommended: ${recommended} staff`;
  }

  /**
   * Generate staffing recommendation for multiple shifts
   * Respects total budget across shifts
   */
  static optimizeMultipleShifts(
    shifts: StaffingProblem[],
    totalBudget: number
  ): OptimizationResult[] {
    // First pass: optimize each shift independently
    const results = shifts.map((shift) =>
      this.optimize({
        ...shift,
        laborBudget: totalBudget / shifts.length, // Divide budget evenly initially
      })
    );

    // Check if total cost exceeds budget
    const totalCost = results.reduce((sum, r) => sum + r.estimatedCost, 0);

    if (totalCost <= totalBudget) {
      return results; // Budget is fine, return initial results
    }

    // If over budget, use iterative approach to reduce across shifts
    const scaleFactor = totalBudget / totalCost;

    return results.map((result, idx) => {
      const adjustedStaff = Math.max(1, Math.floor(result.recommendedStaff * scaleFactor));
      const adjustedCost = adjustedStaff * shifts[idx].averageHourlyRate * shifts[idx].shiftDurationHours;

      return {
        ...result,
        recommendedStaff: adjustedStaff,
        estimatedCost: adjustedCost,
        rationale: `Adjusted for total budget: ${adjustedStaff} staff`,
      };
    });
  }

  /**
   * Analyze staffing efficiency
   */
  static analyzeEfficiency(
    recommendedStaff: number,
    demandForecast: number,
    costPerStaff: number,
    actualCovers?: number
  ): {
    efficiency: number;
    costPerCover: number;
    actualEfficiency?: number;
    recommendation: string;
  } {
    const efficiency = (demandForecast / recommendedStaff) * 100;
    const costPerCover = costPerStaff * recommendedStaff / demandForecast;

    let actualEfficiency: number | undefined;
    let actualCostPerCover: number | undefined;

    if (actualCovers) {
      actualEfficiency = (actualCovers / recommendedStaff) * 100;
      actualCostPerCover = (costPerStaff * recommendedStaff) / actualCovers;
    }

    const recommendation = this.getEfficiencyRecommendation(efficiency, costPerCover);

    return {
      efficiency,
      costPerCover,
      actualEfficiency,
      recommendation,
    };
  }

  /**
   * Get efficiency-based recommendation
   */
  private static getEfficiencyRecommendation(efficiency: number, costPerCover: number): string {
    if (efficiency > 25 && costPerCover < 5) {
      return 'Excellent efficiency - well optimized';
    } else if (efficiency > 15 && costPerCover < 8) {
      return 'Good efficiency - balanced staffing';
    } else if (efficiency > 10) {
      return 'Adequate efficiency - consider optimization';
    } else {
      return 'Low efficiency - overstaffed for demand';
    }
  }
}

export default StaffingOptimizer;
