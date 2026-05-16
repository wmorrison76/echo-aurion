/**
 * Property Item Repository
 *
 * All access patterns for the `property_items` collection.
 * Services and hooks call this — never raw MongoDB queries elsewhere.
 */

import { Collection, Filter, ObjectId } from 'mongodb';
import { getDb } from '../mongoClient';
import { COLLECTIONS } from '../../BanquetMenuBuilder.constants';
import type {
  PropertyItem,
  PropertyId,
  MenuItemId,
  ItemSearchFilters,
  ItemVersion,
  ItemSnapshot,
  DietarySearchFilter,
} from '../../BanquetMenuBuilder.types';

export class PropertyItemRepository {
  private async coll(): Promise<Collection<PropertyItem>> {
    const db = await getDb();
    return db.collection<PropertyItem>(COLLECTIONS.PROPERTY_ITEMS);
  }

  // ===================================================
  // READ PATTERNS
  // ===================================================

  /**
   * Find a single item by property + item ID.
   * Returns null if not found or retired.
   */
  async findById(propertyId: PropertyId, itemId: MenuItemId): Promise<PropertyItem | null> {
    const c = await this.coll();
    return c.findOne({
      propertyId,
      itemId,
      status: { $ne: 'retired' },
    });
  }

  /**
   * Find a single item including retired ones (for audit/version lookup).
   */
  async findByIdIncludingRetired(
    propertyId: PropertyId,
    itemId: MenuItemId
  ): Promise<PropertyItem | null> {
    const c = await this.coll();
    return c.findOne({ propertyId, itemId });
  }

  /**
   * Find multiple items by their IDs (batch fetch for menu hydration).
   */
  async findByIds(propertyId: PropertyId, itemIds: MenuItemId[]): Promise<PropertyItem[]> {
    if (itemIds.length === 0) return [];
    const c = await this.coll();
    return c
      .find({
        propertyId,
        itemId: { $in: itemIds },
        status: { $ne: 'retired' },
      })
      .toArray();
  }

  /**
   * List all active items for a property.
   * Use sparingly — prefer filtered/paginated queries.
   */
  async listActive(propertyId: PropertyId, limit = 200): Promise<PropertyItem[]> {
    const c = await this.coll();
    return c
      .find({ propertyId, status: 'active' })
      .sort({ 'current.canonicalName': 1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Filter items by structured criteria.
   * Used by the library panel filters.
   */
  async search(
    propertyId: PropertyId,
    filters: ItemSearchFilters,
    options: { limit?: number; skip?: number } = {}
  ): Promise<PropertyItem[]> {
    const c = await this.coll();
    const query = this.buildSearchQuery(propertyId, filters);

    return c
      .find(query)
      .sort({ 'current.canonicalName': 1 })
      .skip(options.skip ?? 0)
      .limit(options.limit ?? 50)
      .toArray();
  }

  /**
   * Count items matching filters (for pagination).
   */
  async count(propertyId: PropertyId, filters: ItemSearchFilters): Promise<number> {
    const c = await this.coll();
    const query = this.buildSearchQuery(propertyId, filters);
    return c.countDocuments(query);
  }

  /**
   * Text search across canonical name and descriptions.
   * Requires text index on property_items (created in createIndexes.ts).
   */
  async searchByText(
    propertyId: PropertyId,
    query: string,
    limit = 20
  ): Promise<PropertyItem[]> {
    const c = await this.coll();
    return c
      .find({
        propertyId,
        status: 'active',
        $text: { $search: query },
      })
      .limit(limit)
      .toArray();
  }

  /**
   * Filter strictly by dietary criteria.
   */
  async filterByDietary(
    propertyId: PropertyId,
    filter: DietarySearchFilter
  ): Promise<PropertyItem[]> {
    const c = await this.coll();
    const query: Filter<PropertyItem> = { propertyId, status: 'active' };

    if (filter.mustHaveTags && filter.mustHaveTags.length > 0) {
      query['current.dietary.tags'] = { $all: filter.mustHaveTags };
    }

    if (filter.dietCompatibility && filter.dietCompatibility.length > 0) {
      const compatQueries: Filter<PropertyItem>[] = filter.dietCompatibility.map((diet) => ({
        [`current.dietary.dietCompatibility.${diet}`]: true,
      }));
      query.$and = [...(query.$and ?? []), ...compatQueries];
    }

    if (filter.mustExcludeAllergens && filter.mustExcludeAllergens.length > 0) {
      filter.mustExcludeAllergens.forEach((allergen) => {
        // Allergens are nested objects with `contains` boolean for some, just bool for others
        // For boolean allergens (peanuts, wheat, etc.):
        if (['peanuts', 'wheat', 'soy', 'sesame', 'sulfites', 'milk', 'eggs'].includes(allergen)) {
          query[`current.dietary.allergens.${allergen}`] = false;
        } else {
          // For object allergens (fish, shellfish, treeNuts):
          query[`current.dietary.allergens.${allergen}.contains`] = false;
        }
      });
    }

    return c.find(query).toArray();
  }

  /**
   * Find forked items linked to a network archetype.
   * Used when a network archetype is updated and forks need notification.
   */
  async findForkedFromArchetype(archetypeKey: string): Promise<PropertyItem[]> {
    const c = await this.coll();
    return c
      .find({
        'provenance.type': 'forked',
        'provenance.networkArchetypeKey': archetypeKey,
      })
      .toArray();
  }

  /**
   * Find all versions of an item locked by a specific BEO.
   * Used for BEO integrity checks.
   */
  async findItemsLockedByBEO(beoId: string): Promise<PropertyItem[]> {
    const c = await this.coll();
    return c
      .find({
        'versionHistory.lockedByBEOs': beoId,
      })
      .toArray();
  }

  // ===================================================
  // WRITE PATTERNS
  // ===================================================

  /**
   * Create a new item.
   * Sets timestamps, ensures version history starts fresh.
   */
  async create(
    item: Omit<PropertyItem, '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<PropertyItem> {
    const c = await this.coll();
    const now = new Date();
    const doc: PropertyItem = {
      ...item,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
    };
    await c.insertOne(doc);
    return doc;
  }

  /**
   * Bulk insert — used by seed scripts.
   */
  async bulkCreate(
    items: Omit<PropertyItem, '_id' | 'createdAt' | 'updatedAt'>[]
  ): Promise<number> {
    if (items.length === 0) return 0;
    const c = await this.coll();
    const now = new Date();
    const docs = items.map((item) => ({
      ...item,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
    }));
    const result = await c.insertMany(docs);
    return result.insertedCount;
  }

  /**
   * Add a new version and update the current snapshot.
   * Embeds version history (caps at last 20; older to be cold-stored separately).
   */
  async addVersion(
    propertyId: PropertyId,
    itemId: MenuItemId,
    newVersion: ItemVersion
  ): Promise<void> {
    const c = await this.coll();
    await c.updateOne(
      { propertyId, itemId },
      {
        $set: {
          current: newVersion.snapshot,
          currentVersionId: newVersion.versionId,
          updatedAt: new Date(),
        },
        $push: {
          versionHistory: {
            $each: [newVersion],
            $slice: -20,
          },
        },
      }
    );
  }

  /**
   * Update the current snapshot without bumping version (rare — for typo fixes etc.).
   * Most updates should go through addVersion.
   */
  async updateCurrentSnapshot(
    propertyId: PropertyId,
    itemId: MenuItemId,
    snapshot: Partial<ItemSnapshot>
  ): Promise<void> {
    const c = await this.coll();
    const setOps: Record<string, unknown> = { updatedAt: new Date() };
    Object.entries(snapshot).forEach(([key, value]) => {
      setOps[`current.${key}`] = value;
    });
    await c.updateOne({ propertyId, itemId }, { $set: setOps });
  }

  /**
   * Change item lifecycle status.
   */
  async updateStatus(
    propertyId: PropertyId,
    itemId: MenuItemId,
    status: PropertyItem['status']
  ): Promise<void> {
    const c = await this.coll();
    await c.updateOne(
      { propertyId, itemId },
      { $set: { status, updatedAt: new Date() } }
    );
  }

  /**
   * Lock an item version against a BEO.
   * Prevents the version from being purged if it's referenced by a signed BEO.
   */
  async lockVersionByBEO(
    propertyId: PropertyId,
    itemId: MenuItemId,
    versionId: string,
    beoId: string
  ): Promise<void> {
    const c = await this.coll();
    await c.updateOne(
      { propertyId, itemId, 'versionHistory.versionId': versionId },
      { $addToSet: { 'versionHistory.$.lockedByBEOs': beoId } }
    );
  }

  // ===================================================
  // HELPERS
  // ===================================================

  /**
   * Build a MongoDB filter from ItemSearchFilters.
   * Centralizes filter logic for reuse across search/count.
   */
  private buildSearchQuery(
    propertyId: PropertyId,
    filters: ItemSearchFilters
  ): Filter<PropertyItem> {
    const query: Filter<PropertyItem> = {
      propertyId,
      status: filters.status ?? 'active',
    };

    if (filters.category) {
      query['current.category'] = filters.category;
    }

    if (filters.cuisineFamily && filters.cuisineFamily.length > 0) {
      query['current.cuisineFamily'] = { $in: filters.cuisineFamily };
    }

    if (filters.dietary?.mustHaveTags && filters.dietary.mustHaveTags.length > 0) {
      query['current.dietary.tags'] = { $all: filters.dietary.mustHaveTags };
    }

    if (filters.dietary?.dietCompatibility) {
      filters.dietary.dietCompatibility.forEach((diet) => {
        query[`current.dietary.dietCompatibility.${diet}`] = true;
      });
    }

    if (filters.priceRange) {
      const priceFilter: Record<string, number> = {};
      if (filters.priceRange.min !== undefined) {
        priceFilter.$gte = filters.priceRange.min;
      }
      if (filters.priceRange.max !== undefined) {
        priceFilter.$lte = filters.priceRange.max;
      }
      if (Object.keys(priceFilter).length > 0) {
        query['current.pricing.price.amount'] = priceFilter;
      }
      if (filters.priceRange.model) {
        query['current.pricing.kind'] = filters.priceRange.model;
      }
    }

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    return query;
  }
}

// Singleton instance
export const propertyItemRepository = new PropertyItemRepository();
