import type { ForecastTier } from '@data/models';

export const PositionMatrixEngine = {
  resolve(covers: number, tiers: ForecastTier[]) {
    const tier = tiers.find(t => covers >= t.coversMin && covers <= t.coversMax)
             || tiers.sort((a,b)=>a.coversMin-b.coversMin)[0];
    return tier;
  }
};
