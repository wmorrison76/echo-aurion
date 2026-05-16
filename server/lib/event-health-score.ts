/***
 * LUCCCA — BUILD 37
 * Event Health Score Engine
 *
 * PURPOSE:
 *  - Generate a numeric "health score" for each event (0–100)
 *  - Lower = dangerous, higher = stable
 *
 * Inputs:
 *  - Headcount volatility
 *  - Menu complexity
 *  - Inventory gap risk
 *  - Staffing imbalance
 *  - Labor availability
 *  - Space conflict status
 *  - Weather risk
 *  - External dependencies (AV, Decor)
 *
 * Output:
 *  - score: number (0–100)
 *  - severity: low / medium / high / critical
 ***/

export function computeEventHealthScore(event: any): {
  score: number;
  severity: string;
  drivers: { label: string; impact: number }[];
} {
  const drivers: { label: string; impact: number }[] = [];

  function add(label: string, value: number) {
    drivers.push({ label, impact: value });
  }

  const hcVol = Math.min(
    Math.abs(
      (event.headcountCurrent || 0) - (event.headcountForecast || 0)
    ) / ((event.headcountForecast || 1) === 0 ? 1 : event.headcountForecast),
    1
  );
  add("Headcount volatility", hcVol * 20);

  const complexity =
    ((event.menu?.courses?.length || 0) +
      (event.menu?.modifications?.length || 0)) *
    2;
  add("Menu complexity", Math.min(complexity, 20));

  add("Inventory gaps", (event.inventoryGaps || 0) * 5);

  add("Staffing imbalance", (event.staffingIssues || 0) * 5);

  add("Space conflicts", event.spaceConflicts ? 20 : 0);

  add("Weather risk", (event.weatherRisk || 0) * 10);

  add(
    "External dependency risk",
    Math.min((event.vendorDependencies || 0) * 3, 15)
  );

  const totalImpact = drivers.reduce((a, b) => a + b.impact, 0);
  const score = Math.max(0, 100 - totalImpact);

  let severity = "low";
  if (score < 70) severity = "medium";
  if (score < 50) severity = "high";
  if (score < 30) severity = "critical";

  return { score, severity, drivers };
}
