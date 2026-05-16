/**
 * Echo AI Advisory Layer Types
 * Synthesizes operational impacts from all intelligence layers
 * Provides deterministic, auditable recommendations to chef/manager
 */

export type AdvisoryImpact = {
  foodCostDelta?: number;
  laborHoursDelta?: number;
  laborStaffDelta?: number;
};

export type AdvisoryMessage = {
  advisoryId: string;
  beoId: string;
  revision: number;

  title: string;
  summary: string;

  impacts: AdvisoryImpact;

  recommendations: string[];
  severity: "info" | "warning" | "critical";

  generatedAt: string;
};
