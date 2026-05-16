/**
 * Train forecast model per outlet on historical data.
 */

export interface HistoricalData {
  date: string;
  guestCount: number;
  revenue?: number;
  mealPeriod?: string;
}

export interface TrainedModel {
  outletId: string;
  algorithm: string;
  parameters: Record<string, unknown>;
  trainedAt: string;
  sampleCount: number;
}

/**
 * Train forecast model for an outlet on historical data.
 */
export async function trainForecastModel(
  outletId: string,
  _historicalData: HistoricalData[],
): Promise<TrainedModel> {
  return {
    outletId,
    algorithm: "historical_avg",
    parameters: {},
    trainedAt: new Date().toISOString(),
    sampleCount: 0,
  };
}
