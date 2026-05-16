export interface OnboardingPhaseInput {
  id: string;
  name: string;
  durationDays: number;
  objectives: string[];
  roiBaseline: number;
  roiTarget: number;
  metricLabel: string;
  dependencies?: string[];
  glCodes: string[];
  zapierWorkflowId?: string;
}
export interface OnboardingPhaseReport {
  id: string;
  name: string;
  startDay: number;
  endDay: number;
  durationDays: number;
  liftPercent: number;
  paybackDays: number;
  objectives: string[];
  metricLabel: string;
  roiBaseline: number;
  roiTarget: number;
  cumulativeRoi: number;
  dependencies: string[];
  glCodes: string[];
  zapierWorkflowId?: string;
}
export interface OnboardingPlaybookSummary {
  totalDuration: number;
  overallLiftPercent: number;
  averagePayback: number;
  phases: OnboardingPhaseReport[];
}
export interface OnboardingPlaybookInput {
  phases: OnboardingPhaseInput[];
}
export function buildOnboardingPlaybook(
  input: OnboardingPlaybookInput,
): OnboardingPlaybookSummary {
  if (input.phases.length === 0) {
    return {
      totalDuration: 0,
      overallLiftPercent: 0,
      averagePayback: 0,
      phases: [],
    };
  }
  const phases = [...input.phases].sort(
    (a, b) =>
      getDependenciesCount(a, input.phases) -
      getDependenciesCount(b, input.phases),
  );
  const reports: OnboardingPhaseReport[] = [];
  let dayCursor = 0;
  let cumulativeRoi = 0;
  let paybackSum = 0;
  for (const phase of phases) {
    const startDay = dayCursor;
    const endDay = startDay + Math.max(phase.durationDays, 0);
    const liftPercent = calculateLiftPercent(
      phase.roiBaseline,
      phase.roiTarget,
    );
    cumulativeRoi += Math.max(phase.roiTarget - phase.roiBaseline, 0);
    const payback = calculatePaybackDays(
      phase.roiBaseline,
      phase.roiTarget,
      phase.durationDays,
    );
    paybackSum += payback;
    reports.push({
      id: phase.id,
      name: phase.name,
      startDay,
      endDay,
      durationDays: Math.max(phase.durationDays, 0),
      liftPercent,
      paybackDays: payback,
      objectives: phase.objectives,
      metricLabel: phase.metricLabel,
      roiBaseline: roundCurrency(phase.roiBaseline),
      roiTarget: roundCurrency(phase.roiTarget),
      cumulativeRoi: roundCurrency(cumulativeRoi),
      dependencies: phase.dependencies ?? [],
      glCodes: phase.glCodes,
      zapierWorkflowId: phase.zapierWorkflowId,
    });
    dayCursor = endDay;
  }
  const totalDuration =
    reports.length > 0 ? reports[reports.length - 1].endDay : 0;
  const overallLiftPercent = calculateLiftPercent(
    input.phases[0].roiBaseline,
    reports[reports.length - 1].roiTarget,
  );
  const averagePayback =
    reports.length > 0
      ? Math.round((paybackSum / reports.length) * 10) / 10
      : 0;
  return { totalDuration, overallLiftPercent, averagePayback, phases: reports };
}
function calculateLiftPercent(baseline: number, target: number) {
  if (baseline === 0) {
    return target === 0 ? 0 : 100;
  }
  return Math.round(((target - baseline) / Math.abs(baseline)) * 1000) / 10;
}
function calculatePaybackDays(
  baseline: number,
  target: number,
  duration: number,
) {
  if (target <= baseline || duration <= 0) {
    return duration;
  }
  const incrementalRoi = target - baseline;
  const dailyReturn = incrementalRoi / duration;
  if (dailyReturn <= 0) {
    return duration;
  }
  return Math.max(1, Math.round((baseline / dailyReturn) * 10) / 10);
}
function getDependenciesCount(
  phase: OnboardingPhaseInput,
  phases: OnboardingPhaseInput[],
) {
  if (!phase.dependencies || phase.dependencies.length === 0) {
    return 0;
  }
  const phaseMap = new Map(phases.map((item) => [item.id, item]));
  let count = 0;
  const stack = [...phase.dependencies];
  while (stack.length > 0) {
    const dep = stack.pop();
    if (dep && phaseMap.has(dep)) {
      count += 1;
      const nested = phaseMap.get(dep)?.dependencies ?? [];
      for (const id of nested) {
        stack.push(id);
      }
    }
  }
  return count;
}
function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
