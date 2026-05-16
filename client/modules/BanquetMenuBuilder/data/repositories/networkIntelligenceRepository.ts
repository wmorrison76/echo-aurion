/**
 * Network Intelligence Repository
 *
 * Access patterns for the `network_intelligence` collection — the
 * aggregated, anonymized, time-series signal layer that powers
 * benchmarking and the Bloomberg Terminal moat.
 *
 * Note: This collection is populated by the network contribution
 * pipeline (Package 5). In Package 1 we set up the schema and
 * repository so it's ready to receive data.
 */

import { Collection, ObjectId } from 'mongodb';
import { getDb } from '../mongoClient';
import { COLLECTIONS } from '../../BanquetMenuBuilder.constants';
import type {
  NetworkIntelligenceEntry,
  ArchetypeKey,
} from '../../BanquetMenuBuilder.types';

export class NetworkIntelligenceRepository {
  private async coll(): Promise<Collection<NetworkIntelligenceEntry>> {
    const db = await getDb();
    return db.collection<NetworkIntelligenceEntry>(COLLECTIONS.NETWORK_INTELLIGENCE);
  }

  // ===================================================
  // READ PATTERNS
  // ===================================================

  /**
   * Get the latest intelligence entry for an archetype.
   * Used for "what's the network percentile for this item right now?"
   */
  async getLatest(
    archetypeKey: ArchetypeKey,
    options: { region?: string; tier?: 'luxury' | 'premium' | 'upscale' } = {}
  ): Promise<NetworkIntelligenceEntry | null> {
    const c = await this.coll();
    const query: Record<string, unknown> = { archetypeKey };
    if (options.region) query.region = options.region;
    if (options.tier) query['pricing.propertyTier'] = options.tier;

    return c.findOne(query, {
      sort: { 'period.year': -1, 'period.quarter': -1 },
    });
  }

  /**
   * Get historical intelligence over time for trend analysis.
   */
  async getHistory(
    archetypeKey: ArchetypeKey,
    quarters = 8
  ): Promise<NetworkIntelligenceEntry[]> {
    const c = await this.coll();
    return c
      .find({ archetypeKey })
      .sort({ 'period.year': -1, 'period.quarter': -1 })
      .limit(quarters)
      .toArray();
  }

  /**
   * Bulk fetch latest entries for many archetypes (for menu-wide benchmarking).
   */
  async getLatestForArchetypes(
    archetypeKeys: ArchetypeKey[]
  ): Promise<Map<ArchetypeKey, NetworkIntelligenceEntry>> {
    if (archetypeKeys.length === 0) return new Map();

    const c = await this.coll();
    const pipeline = [
      { $match: { archetypeKey: { $in: archetypeKeys } } },
      { $sort: { 'period.year': -1, 'period.quarter': -1 } },
      {
        $group: {
          _id: '$archetypeKey',
          latest: { $first: '$$ROOT' },
        },
      },
    ];

    const results = await c.aggregate(pipeline).toArray();
    const map = new Map<ArchetypeKey, NetworkIntelligenceEntry>();
    results.forEach((r: { _id: string; latest: NetworkIntelligenceEntry }) => {
      map.set(r._id, r.latest);
    });
    return map;
  }

  /**
   * Compute network percentile for a given price.
   * Returns the percentile (0-100) where this price sits.
   */
  async computePercentile(
    archetypeKey: ArchetypeKey,
    price: number
  ): Promise<number | null> {
    const latest = await this.getLatest(archetypeKey);
    if (!latest) return null;

    const { p10, p25, median, p75, p90 } = latest.pricing;

    // Linear interpolation between known percentiles
    if (price <= p10) return 10;
    if (price >= p90) return 90;
    if (price <= p25) return 10 + ((price - p10) / (p25 - p10)) * 15;
    if (price <= median) return 25 + ((price - p25) / (median - p25)) * 25;
    if (price <= p75) return 50 + ((price - median) / (p75 - median)) * 25;
    return 75 + ((price - p75) / (p90 - p75)) * 15;
  }

  // ===================================================
  // WRITE PATTERNS
  // ===================================================

  /**
   * Insert a new intelligence entry (called by aggregation jobs in Package 5).
   */
  async create(
    entry: Omit<NetworkIntelligenceEntry, '_id'>
  ): Promise<NetworkIntelligenceEntry> {
    const c = await this.coll();
    const doc: NetworkIntelligenceEntry = { ...entry, _id: new ObjectId() };
    await c.insertOne(doc);
    return doc;
  }

  /**
   * Upsert intelligence for an archetype + period (idempotent rollup).
   */
  async upsert(entry: Omit<NetworkIntelligenceEntry, '_id'>): Promise<void> {
    const c = await this.coll();
    await c.updateOne(
      {
        archetypeKey: entry.archetypeKey,
        'period.year': entry.period.year,
        'period.quarter': entry.period.quarter,
        region: entry.region,
        'pricing.propertyTier': entry.pricing.propertyTier,
      },
      { $set: { ...entry, computedAt: new Date() } },
      { upsert: true }
    );
  }
}

export const networkIntelligenceRepository = new NetworkIntelligenceRepository();
