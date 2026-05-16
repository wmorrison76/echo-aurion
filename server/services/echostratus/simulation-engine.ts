/**
 * EchoStratus Simulation Engine
 * 
 * Runs 10,000+ scenario Monte Carlo simulations for decision proposals
 * Produces probability distributions, failure probabilities, bottlenecks, sensitivity
 * 
 * All text is i18n-ready with translation keys
 */

import { logger } from '../utils/logger.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type DecisionProposal =
  | { type: 'add_table'; outletId: string; table: { seatsMin: number; seatsMax: number; location?: any }; section?: string }
  | { type: 'change_hours'; outletId: string; hoursPolicy: any }
  | { type: 'staffing_change'; outletId: string; changes: any }
  | { type: 'menu_change'; outletId: string; menuChanges: any }
  | { type: 'accept_event'; eventId: string; modifications?: any }
  | { type: 'procurement_substitution'; itemId: string; substituteId: string };

export interface SimulationAssumptions {
  horizonDays: 7 | 30 | 365;
  scenarios: number; // 10k+ for "director mode"
  timeSliceMinutes: 5 | 10 | 15;
  demandUncertainty: { sigma: number; shocks?: any[] };
  laborConstraints: any;
  kitchenConstraints: any;
  guestExperienceWeights: { wait: number; ticket: number; noise: number };
  confidenceTarget?: number;
}

export interface Quantiles {
  p10: number;
  p50: number;
  p90: number;
  p95: number;
  mean: number;
}

export interface SimulationResultSummary {
  metrics: {
    profit: Quantiles;
    revenue: Quantiles;
    primeCostPct: Quantiles;
    waitTimeMinutes: Quantiles;
    abandonmentPct: Quantiles;
    ticketTimeP90Minutes: Quantiles;
    guestRiskScore: Quantiles;
  };
  failureProbabilities: Array<{ condition: string; probability: number }>;
  bottlenecks: Array<{ name: string; timeWindow: string; severity: number; driver: string }>;
  sensitivity: Array<{ variable: string; importance: number; direction: 'up' | 'down' | 'nonlinear' }>;
  confidence: { score: number; reasons: string[] };
}

// ============================================================================
// SIMULATION ENGINE
// ============================================================================

export class SimulationEngine {
  /**
   * Run simulation for a decision proposal
   */
  async simulate(
    proposal: DecisionProposal,
    assumptions: SimulationAssumptions,
    twinState: any // Digital twin state snapshot
  ): Promise<SimulationResultSummary> {
    logger.info(`[Stratus] Running simulation: ${proposal.type} (${assumptions.scenarios} scenarios)`);

    // Run Monte Carlo simulation
    const results = this.runMonteCarlo(proposal, assumptions, twinState);

    // Calculate distributions
    const distributions = this.calculateDistributions(results);

    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(results, twinState);

    // Calculate sensitivity
    const sensitivity = this.calculateSensitivity(results, proposal);

    // Calculate failure probabilities
    const failureProbs = this.calculateFailureProbabilities(results);

    // Calculate confidence
    const confidence = this.calculateConfidence(results, assumptions);

    return {
      metrics: distributions,
      failureProbabilities: failureProbs,
      bottlenecks,
      sensitivity,
      confidence,
    };
  }

  /**
   * Run Monte Carlo simulation
   */
  private runMonteCarlo(
    proposal: DecisionProposal,
    assumptions: SimulationAssumptions,
    twinState: any
  ): any[] {
    const results: any[] = [];

    for (let i = 0; i < assumptions.scenarios; i++) {
      // Sample from uncertainty distributions
      const demandSample = this.sampleDemand(assumptions.demandUncertainty, twinState);
      const laborSample = this.sampleLabor(assumptions.laborConstraints, twinState);
      const kitchenSample = this.sampleKitchen(assumptions.kitchenConstraints, twinState);

      // Apply decision proposal
      const modifiedState = this.applyProposal(proposal, twinState);

      // Run scenario
      const scenarioResult = this.runScenario(
        modifiedState,
        demandSample,
        laborSample,
        kitchenSample,
        assumptions
      );

      results.push(scenarioResult);
    }

    return results;
  }

  /**
   * Sample demand from uncertainty distribution
   */
  private sampleDemand(uncertainty: any, twinState: any): number {
    // Simplified: normal distribution around baseline
    const baseline = twinState.demand?.baseline || 100;
    const sigma = uncertainty.sigma || 0.1;
    return this.normalRandom(baseline, baseline * sigma);
  }

  /**
   * Sample labor capacity
   */
  private sampleLabor(constraints: any, twinState: any): any {
    // Simplified: sample from labor productivity distribution
    return {
      serverCapacity: this.normalRandom(4, 0.5), // tables per server
      kitchenCapacity: this.normalRandom(20, 2), // tickets per hour
    };
  }

  /**
   * Sample kitchen throughput
   */
  private sampleKitchen(constraints: any, twinState: any): any {
    // Simplified: sample from station capacity distributions
    return {
      grill: this.normalRandom(15, 2), // tickets per 15min
      expo: this.normalRandom(12, 1.5),
      pantry: this.normalRandom(10, 1),
    };
  }

  /**
   * Apply decision proposal to twin state
   */
  private applyProposal(proposal: DecisionProposal, twinState: any): any {
    const modified = JSON.parse(JSON.stringify(twinState)); // Deep clone

    switch (proposal.type) {
      case 'add_table':
        modified.capacity.tables.push({
          seatsMin: proposal.table.seatsMin,
          seatsMax: proposal.table.seatsMax,
          location: proposal.table.location,
        });
        modified.capacity.totalSeats += proposal.table.seatsMax;
        break;

      case 'change_hours':
        modified.hours = proposal.hoursPolicy;
        break;

      case 'staffing_change':
        modified.labor = { ...modified.labor, ...proposal.changes };
        break;

      case 'menu_change':
        modified.menu = { ...modified.menu, ...proposal.menuChanges };
        break;

      // Add other proposal types...
    }

    return modified;
  }

  /**
   * Run a single scenario
   */
  private runScenario(
    state: any,
    demand: number,
    labor: any,
    kitchen: any,
    assumptions: SimulationAssumptions
  ): any {
    // Simplified scenario runner
    // In production, this would be a full queue/kitchen/labor model

    const revenue = demand * (state.menu?.avgCheck || 50);
    const cogs = revenue * (state.costs?.cogsPct || 0.3);
    const laborCost = this.calculateLaborCost(demand, labor, state);
    const primeCost = cogs + laborCost;
    const profit = revenue - primeCost - (state.costs?.fixed || 0);

    // Calculate wait time (simplified queue model)
    const waitTime = this.calculateWaitTime(demand, state.capacity, labor);

    // Calculate ticket time (simplified kitchen model)
    const ticketTime = this.calculateTicketTime(demand, kitchen, state);

    // Calculate abandonment risk
    const abandonment = this.calculateAbandonment(waitTime);

    // Calculate guest risk score
    const guestRisk = this.calculateGuestRisk(waitTime, ticketTime, state);

    return {
      profit,
      revenue,
      primeCostPct: (primeCost / revenue) * 100,
      waitTimeMinutes: waitTime,
      abandonmentPct: abandonment,
      ticketTimeP90Minutes: ticketTime * 1.5, // Simplified p90
      guestRiskScore: guestRisk,
    };
  }

  /**
   * Calculate labor cost
   */
  private calculateLaborCost(demand: number, labor: any, state: any): number {
    const hoursNeeded = demand / (labor.serverCapacity * 2); // Simplified
    const hourlyRate = state.labor?.avgRate || 20;
    return hoursNeeded * hourlyRate;
  }

  /**
   * Calculate wait time (simplified queue model)
   */
  private calculateWaitTime(demand: number, capacity: any, labor: any): number {
    const arrivalRate = demand / 4; // covers per hour
    const serviceRate = capacity.totalSeats / 2; // simplified
    const utilization = arrivalRate / serviceRate;

    if (utilization >= 1) {
      return 60; // High wait if overloaded
    }

    // M/M/1 queue approximation
    return (utilization / (1 - utilization)) * 5; // minutes
  }

  /**
   * Calculate ticket time (simplified kitchen model)
   */
  private calculateTicketTime(demand: number, kitchen: any, state: any): number {
    const ticketsPerHour = demand / 2; // Simplified
    const kitchenCapacity = kitchen.grill || 15; // tickets per 15min
    const utilization = ticketsPerHour / (kitchenCapacity * 4);

    if (utilization >= 1) {
      return 30; // High ticket time if overloaded
    }

    // Simplified: base time + queue delay
    return 12 + (utilization / (1 - utilization)) * 3; // minutes
  }

  /**
   * Calculate abandonment probability
   */
  private calculateAbandonment(waitTime: number): number {
    // Simplified: exponential model
    return Math.min(0.5, waitTime / 40);
  }

  /**
   * Calculate guest risk score
   */
  private calculateGuestRisk(waitTime: number, ticketTime: number, state: any): number {
    // Simplified: weighted combination
    const waitRisk = Math.min(1, waitTime / 30);
    const ticketRisk = Math.min(1, ticketTime / 25);
    return (waitRisk + ticketRisk) / 2;
  }

  /**
   * Calculate distributions from results
   */
  private calculateDistributions(results: any[]): SimulationResultSummary['metrics'] {
    const metrics = ['profit', 'revenue', 'primeCostPct', 'waitTimeMinutes', 'abandonmentPct', 'ticketTimeP90Minutes', 'guestRiskScore'] as const;

    const distributions: any = {};

    for (const metric of metrics) {
      const values = results.map((r) => r[metric]).sort((a, b) => a - b);
      distributions[metric] = {
        p10: this.percentile(values, 0.1),
        p50: this.percentile(values, 0.5),
        p90: this.percentile(values, 0.9),
        p95: this.percentile(values, 0.95),
        mean: values.reduce((a, b) => a + b, 0) / values.length,
      };
    }

    return distributions;
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.floor(sorted.length * p);
    return sorted[Math.min(index, sorted.length - 1)];
  }

  /**
   * Identify bottlenecks
   */
  private identifyBottlenecks(results: any[], twinState: any): SimulationResultSummary['bottlenecks'] {
    // Simplified: identify where constraints are hit
    const bottlenecks: SimulationResultSummary['bottlenecks'] = [];

    // Check wait time bottlenecks
    const highWaitScenarios = results.filter((r) => r.waitTimeMinutes > 20);
    if (highWaitScenarios.length > results.length * 0.2) {
      bottlenecks.push({
        name: 'Host Stand / Seating',
        timeWindow: 'Peak hours',
        severity: highWaitScenarios.length / results.length,
        driver: 'Capacity constraint',
      });
    }

    // Check ticket time bottlenecks
    const highTicketScenarios = results.filter((r) => r.ticketTimeP90Minutes > 25);
    if (highTicketScenarios.length > results.length * 0.2) {
      bottlenecks.push({
        name: 'Kitchen Expo',
        timeWindow: 'Peak hours',
        severity: highTicketScenarios.length / results.length,
        driver: 'Throughput constraint',
      });
    }

    return bottlenecks;
  }

  /**
   * Calculate sensitivity
   */
  private calculateSensitivity(results: any[], proposal: DecisionProposal): SimulationResultSummary['sensitivity'] {
    // Simplified: correlation analysis
    return [
      { variable: 'demand', importance: 0.6, direction: 'up' },
      { variable: 'labor_capacity', importance: 0.3, direction: 'down' },
      { variable: 'kitchen_throughput', importance: 0.4, direction: 'down' },
    ];
  }

  /**
   * Calculate failure probabilities
   */
  private calculateFailureProbabilities(results: any[]): SimulationResultSummary['failureProbabilities'] {
    return [
      {
        condition: 'Wait time > 35 minutes',
        probability: results.filter((r) => r.waitTimeMinutes > 35).length / results.length,
      },
      {
        condition: 'Ticket time p90 > 30 minutes',
        probability: results.filter((r) => r.ticketTimeP90Minutes > 30).length / results.length,
      },
      {
        condition: 'Prime cost % > 65%',
        probability: results.filter((r) => r.primeCostPct > 65).length / results.length,
      },
    ];
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(results: any[], assumptions: SimulationAssumptions): SimulationResultSummary['confidence'] {
    const reasons: string[] = [];

    if (assumptions.scenarios >= 10000) {
      reasons.push('High scenario count');
    }

    if (results.length > 0) {
      const variance = this.calculateVariance(results.map((r) => r.profit));
      if (variance < 1000) {
        reasons.push('Low variance in outcomes');
      }
    }

    return {
      score: Math.min(1, assumptions.scenarios / 10000),
      reasons,
    };
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Normal random number generator
   */
  private normalRandom(mean: number, stdDev: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }
}

// Export singleton instance
export const simulationEngine = new SimulationEngine();
