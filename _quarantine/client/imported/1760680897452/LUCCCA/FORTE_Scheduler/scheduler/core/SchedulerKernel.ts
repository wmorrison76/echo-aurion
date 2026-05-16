// FORTE_Scheduler/scheduler/core/SchedulerKernel.ts

import { ForecastEngine } from './ForecastEngine';
import { PositionMatrixEngine } from './PositionMatrixEngine';
import { OptimizationSolver } from './OptimizationSolver';
import { ComplianceKernel } from './ComplianceKernel';
import { TheoryCost } from './TheoryCost';
import { PhoenixGate } from './PhoenixGate';
import type { ScheduleInput, ScheduleResult } from '@data/models';

export async function runScheduler(input: ScheduleInput): Promise<ScheduleResult> {
  const forecast = await ForecastEngine.compute(input.forecast);
  const matrix   = PositionMatrixEngine.resolve(forecast.covers, input.tiers);
  const draft    = OptimizationSolver.solve(input, matrix);
  const checked  = ComplianceKernel.validate(draft, input.rules);
  const costs    = TheoryCost.compute(checked, input.employees, input.salesForecast);
  const gate     = PhoenixGate.evaluate(checked, costs, input.policies);

  return { ...checked, costs, publishable: gate.ok, gateReport: gate.report };
}
