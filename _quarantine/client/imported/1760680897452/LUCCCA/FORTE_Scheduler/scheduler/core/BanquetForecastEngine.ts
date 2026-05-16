/**
 * BanquetForecastEngine
 * Integrates BEO (banquet event orders) and recipe complexity to predict prep hours and staffing needs.
 */
import type { BEOInput, BEOForecast } from '@data/beoModels';

export const BanquetForecastEngine = {
  compute(beos: BEOInput[]): BEOForecast {
    // For now, produce a simple aggregated model
    let totalGuests = 0;
    let totalHours = 0;

    for (const beo of beos) {
      totalGuests += beo.guestCount;
      // Estimate time: guestCount * menuComplexity * baseFactor
      const baseFactor = beo.menuComplexity === 'high' ? 0.05 : beo.menuComplexity === 'medium' ? 0.03 : 0.02;
      totalHours += beo.guestCount * baseFactor;
    }

    return {
      totalGuests,
      estimatedPrepHours: totalHours,
      notes: 'Basic BEO forecast - refine with real recipe/training data'
    };
  }
};
