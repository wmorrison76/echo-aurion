/**
 * Network Item Repository
 *
 * Access patterns for the `network_items` collection — the curated
 * shared core library of archetype menu items.
 */

import { Collection, ObjectId } from 'mongodb';
import { getDb } from '../mongoClient';
import { COLLECTIONS } from '../../BanquetMenuBuilder.constants';
import type { NetworkItem, ArchetypeKey, ItemCategory } from '../../BanquetMenuBuilder.types';

export class NetworkItemRepository {
  private async coll(): Promise<Collection<NetworkItem>> {
    const db = await getDb();
    return db.collection<NetworkItem>(COLLECTIONS.NETWORK_ITEMS);
  }

  // ===================================================
  // READ PATTERNS
  // ===================================================

  async findByArchetypeKey(archetypeKey: ArchetypeKey): Promise<NetworkItem | null> {
    const c = await this.coll();
    return c.findOne({ archetypeKey });
  }

  async findByCategory(category: ItemCategory, limit = 50): Promise<NetworkItem[]> {
    const c = await this.coll();
    return c
      .find({ 'identity.category': category })
      .sort({ 'metadata.subscriberCount': -1 })
      .limit(limit)
      .toArray();
  }

  async findByCuisineFamily(cuisineFamily: string, limit = 50): Promise<NetworkItem[]> {
    const c = await this.coll();
    return c
      .find({ 'identity.cuisineFamily': cuisineFamily })
      .limit(limit)
      .toArray();
  }

  async listAll(limit = 200): Promise<NetworkItem[]> {
    const c = await this.coll();
    return c.find({}).sort({ archetypeKey: 1 }).limit(limit).toArray();
  }

  async searchByName(query: string, limit = 20): Promise<NetworkItem[]> {
    const c = await this.coll();
    return c
      .find({
        $or: [
          { 'identity.canonicalName': { $regex: query, $options: 'i' } },
          { archetypeKey: { $regex: query, $options: 'i' } },
        ],
      })
      .limit(limit)
      .toArray();
  }

  // ===================================================
  // WRITE PATTERNS
  // ===================================================

  async create(item: Omit<NetworkItem, '_id'>): Promise<NetworkItem> {
    const c = await this.coll();
    const doc: NetworkItem = { ...item, _id: new ObjectId() };
    await c.insertOne(doc);
    return doc;
  }

  async incrementForkCount(archetypeKey: ArchetypeKey): Promise<void> {
    const c = await this.coll();
    await c.updateOne(
      { archetypeKey },
      { $inc: { 'metadata.forkCount': 1, 'metadata.subscriberCount': 1 } }
    );
  }

  async updatePricingGuidance(
    archetypeKey: ArchetypeKey,
    guidance: NetworkItem['pricingGuidance']
  ): Promise<void> {
    const c = await this.coll();
    await c.updateOne(
      { archetypeKey },
      {
        $set: {
          pricingGuidance: guidance,
          'metadata.lastReviewedAt': new Date(),
        },
      }
    );
  }
}

export const networkItemRepository = new NetworkItemRepository();
