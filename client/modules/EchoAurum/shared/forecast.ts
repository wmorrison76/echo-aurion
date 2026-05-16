export interface PredictHqEventDriver {
  id: string;
  name: string;
  impact: number; // percentage impact on demand startDate: string; endDate: string;
}
export interface NoaaWeatherDriver {
  date: string;
  temperatureAnomaly: number; // deviation in °C precipitationChance: number; // 0-1
}
export interface BaseForecastInput {
  date: string;
  roomsAvailable: number;
  baselineOccupancy: number; // 0-1 adr: number;
}
export interface ForecastScenarioInput {
  base: BaseForecastInput[];
  events: PredictHqEventDriver[];
  weather: NoaaWeatherDriver[];
}
export interface SensitivitySettings {
  adrDeltaPercent?: number; // +/- percentage change applied to ADR groupPickupDelta?: number; // additional occupancy percentage points (0.05 = +5pp) wagePressure?: number; // percentage reduction to occupancy due to staffing drag
}
export interface StressTestConfig {
  capitalProjectRoomsOffline?: number; // rooms removed from inventory eventCancellations?: string[]; // PredictHQ event IDs to remove
}
export interface ForecastDayProjection {
  date: string;
  occupancy: number;
  adr: number;
  revenue: number;
  drivers: { eventsImpact: number; weatherImpact: number };
}
export interface ForecastScenario {
  id: string;
  label: string;
  projection: ForecastDayProjection[];
  totalRevenue: number;
}
function dateWithin(date: string, start: string, end: string) {
  const value = new Date(date).getTime();
  return value >= new Date(start).getTime() && value <= new Date(end).getTime();
}
const safeNum = (n: number) => (Number.isFinite(n) ? n : 0);
function calculateEventImpact(date: string, events: PredictHqEventDriver[]) {
  return events
    .filter((event) => dateWithin(date, event.startDate, event.endDate))
    .reduce((sum, event) => sum + safeNum(event.impact), 0);
}
function calculateWeatherImpact(date: string, weather: NoaaWeatherDriver[]) {
  const driver = weather.find((entry) => entry.date === date);
  if (!driver) {
    return 0;
  }
  const tempImpact = safeNum(driver.temperatureAnomaly) * 0.02;
  const precipImpact = -safeNum(driver.precipitationChance) * 0.05;
  return tempImpact + precipImpact;
}
export function applySensitivityAdjustments(
  base: BaseForecastInput[],
  settings: SensitivitySettings = {},
): BaseForecastInput[] {
  return base.map((day) => {
    const adr = settings.adrDeltaPercent
      ? day.adr * (1 + settings.adrDeltaPercent / 100)
      : day.adr;
    const occupancyAdjustment =
      (settings.groupPickupDelta ?? 0) - (settings.wagePressure ?? 0) / 100;
    return {
      ...day,
      adr,
      baselineOccupancy: Math.max(
        0,
        Math.min(1, day.baselineOccupancy + occupancyAdjustment),
      ),
    };
  });
}
function filterEventsForStress(
  events: PredictHqEventDriver[],
  config?: StressTestConfig,
) {
  if (!config?.eventCancellations) {
    return events;
  }
  const cancelled = new Set(config.eventCancellations);
  return events.filter((event) => !cancelled.has(event.id));
}
function adjustBaseForStress(
  base: BaseForecastInput[],
  config?: StressTestConfig,
) {
  if (!config?.capitalProjectRoomsOffline) {
    return base;
  }
  return base.map((day) => ({
    ...day,
    roomsAvailable: Math.max(
      0,
      day.roomsAvailable - config.capitalProjectRoomsOffline,
    ),
  }));
}
export function buildForecastScenario(
  input: ForecastScenarioInput,
  label = "Base scenario",
): ForecastScenario {
  const projection = input.base.map((day) => {
    const eventsImpact = safeNum(calculateEventImpact(day.date, input.events));
    const weatherImpact = safeNum(
      calculateWeatherImpact(day.date, input.weather),
    );
    const occRaw = day.baselineOccupancy * (1 + eventsImpact + weatherImpact);
    const occupancy = Math.max(
      0,
      Math.min(1, Number.isFinite(occRaw) ? occRaw : day.baselineOccupancy),
    );
    const adrAdjustment = eventsImpact * 0.1 * (day.adr || 0);
    const adr = Math.max(
      0,
      (Number.isFinite(day.adr) ? day.adr : 0) + adrAdjustment,
    );
    const rev = occupancy * (day.roomsAvailable || 0) * adr;
    const revenue = Number.isFinite(rev) ? rev : 0;
    return {
      date: day.date,
      occupancy,
      adr,
      revenue,
      drivers: { eventsImpact, weatherImpact },
    };
  });
  const totalRevenue = projection.reduce((sum, day) => sum + day.revenue, 0);
  return {
    id: `scenario-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    label,
    projection,
    totalRevenue,
  };
}
export interface ForecastSummaryNarrative {
  headline: string;
  summary: string;
  actions: string[];
}
export function buildForecastNarrative(
  scenario: ForecastScenario,
): ForecastSummaryNarrative {
  const averageOccupancy =
    scenario.projection.reduce((sum, day) => sum + day.occupancy, 0) /
    scenario.projection.length;
  const peakDay = scenario.projection.reduce(
    (top, day) => (day.revenue > top.revenue ? day : top),
    scenario.projection[0],
  );
  return {
    headline: `${scenario.label}: projected revenue ${scenario.totalRevenue.toFixed(0)}`,
    summary: `Average occupancy ${Math.round(averageOccupancy * 100)}% with peak revenue on ${peakDay.date}.`,
    actions: [
      `Confirm staffing for ${peakDay.date} to support projected revenue ${peakDay.revenue.toFixed(0)}.`,
      "Monitor event and weather drivers for variance beyond ±5%.",
    ],
  };
}
export function buildStressTestScenario(
  input: ForecastScenarioInput,
  config: StressTestConfig,
  label = "Stress test",
): ForecastScenario {
  const stressedBase = adjustBaseForStress(input.base, config);
  const filteredEvents = filterEventsForStress(input.events, config);
  return buildForecastScenario(
    { base: stressedBase, events: filteredEvents, weather: input.weather },
    label,
  );
}
