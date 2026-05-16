/**
 * BEOPlanner
 * Converts BEO data into structured workload tasks.
 */
import { BEOInput } from '@data/beoModels';
import { BanquetForecastEngine } from './BanquetForecastEngine';

export const BEOPlanner = {
  plan(beos: BEOInput[]) {
    return BanquetForecastEngine.compute(beos);
  }
};
