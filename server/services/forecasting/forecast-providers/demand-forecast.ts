/**
 * Demand Forecast Provider
 * Forecasts customer demand/covers
 */

import { TimeSeriesData, HistoricalDataPoint, UUID } from '../../../../shared/types/forecasting-unified';

export class DemandForecastProvider {
  async loadData(
    orgId: UUID,
    startDate: string,
    endDate: string
  ): Promise<TimeSeriesData> {
    // TODO: Query covers/reservations from database
    // SELECT date, COUNT(*) as value
    // FROM reservations
    // WHERE org_id = $1 AND date BETWEEN $2 AND $3
    // GROUP BY date
    
    return {
      type: 'demand',
      granularity: 'day',
      dataPoints: [],
      startDate,
      endDate
    };
  }
  
  prepareData(dataPoints: HistoricalDataPoint[]): HistoricalDataPoint[] {
    // Fill missing days with 0 (no demand)
    return dataPoints;
  }
}

export const demandForecastProvider = new DemandForecastProvider();
