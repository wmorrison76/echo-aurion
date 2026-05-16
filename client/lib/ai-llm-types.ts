/**
 * Client-safe types for AI/LLM experiment design.
 * Mirrors ExperimentDesignResponse from server ai-llm-service for use in client components.
 */

export interface Variable {
  name: string;
  min: number;
  max: number;
  unit: string;
  importance: "critical" | "important" | "nice-to-have";
  rationale: string;
}

export interface SuccessCriteria {
  metric: string;
  target: string;
  how_measured: string;
  unit?: string;
}

export interface RiskFlag {
  risk: string;
  severity: "low" | "medium" | "high";
  mitigation: string;
  category: "allergen" | "cost" | "timeline" | "equipment" | "technique";
}

export interface ExperimentDesignResponse {
  hypothesis: string;
  variables: Variable[];
  controls: {
    baselineIngredients: string[];
    standardProcedure: string;
    controlDescription: string;
  };
  testMatrix: {
    sampleSize: number;
    replicates: number;
    rationale: string;
    duration_days: number;
  };
  successCriteria: SuccessCriteria[];
  riskFlags: RiskFlag[];
  estimatedTimeline: {
    days: number;
    phases: string[];
    critical_path: string;
  };
  equipmentNeeded: string[];
  expectedOutcomes: string[];
  nextSteps: string[];
  confidenceScore: number;
}
