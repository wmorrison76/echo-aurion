/**
 * Index Creation Script
 *
 * Creates all indexes required by the Banquet Menu Builder module.
 * Idempotent — safe to re-run. Existing indexes are skipped.
 *
 * Run via:
 *   npx tsx src/modules/MaestroBqts/BanquetMenuBuilder/data/indexes/createIndexes.ts
 *
 * Note: Atlas Search and Vector Search indexes are NOT created here.
 * Those use a different API and are configured in the Atlas dashboard.
 * (Package 4 will provide the JSON definitions to paste into Atlas.)
 */

import { getDb, closeMongoConnection } from '../mongoClient';
import { COLLECTIONS } from '../../BanquetMenuBuilder.constants';

interface IndexResult {
  collection: string;
  indexName: string;
  created: boolean;
  error?: string;
}

async function createIndex(
  collectionName: string,
  spec: Record<string, 1 | -1 | 'text'>,
  options: { name?: string; unique?: boolean; sparse?: boolean; expireAfterSeconds?: number } = {}
): Promise<IndexResult> {
  const db = await getDb();
  const collection = db.collection(collectionName);

  try {
    const indexName = await collection.createIndex(spec, options);
    return { collection: collectionName, indexName, created: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { collection: collectionName, indexName: options.name ?? 'unknown', created: false, error };
  }
}

async function createAllIndexes(): Promise<void> {
  // eslint-disable-next-line no-console
  console.info('Creating indexes for Banquet Menu Builder...\n');

  const results: IndexResult[] = [];

  // ===================================================
  // property_items collection
  // ===================================================

  // Primary lookup: propertyId + itemId (uniqueness within property)
  results.push(
    await createIndex(
      COLLECTIONS.PROPERTY_ITEMS,
      { propertyId: 1, itemId: 1 },
      { name: 'propertyId_itemId_unique', unique: true }
    )
  );

  // Status filter (most common query — active items only)
  results.push(
    await createIndex(
      COLLECTIONS.PROPERTY_ITEMS,
      { propertyId: 1, status: 1 },
      { name: 'propertyId_status' }
    )
  );

  // Category browsing
  results.push(
    await createIndex(
      COLLECTIONS.PROPERTY_ITEMS,
      { propertyId: 1, 'current.category': 1, status: 1 },
      { name: 'propertyId_category_status' }
    )
  );

  // Dietary tags filter
  results.push(
    await createIndex(
      COLLECTIONS.PROPERTY_ITEMS,
      { propertyId: 1, 'current.dietary.tags': 1 },
      { name: 'propertyId_dietary_tags' }
    )
  );

  // Diet compatibility filters
  results.push(
    await createIndex(
      COLLECTIONS.PROPERTY_ITEMS,
      { propertyId: 1, 'current.dietary.dietCompatibility.vegan': 1 },
      { name: 'propertyId_diet_vegan', sparse: true }
    )
  );
  results.push(
    await createIndex(
      COLLECTIONS.PROPERTY_ITEMS,
      { propertyId: 1, 'current.dietary.dietCompatibility.glutenFree': 1 },
      { name: 'propertyId_diet_gf', sparse: true }
    )
  );

  // Network archetype provenance (for fork tracking)
  results.push(
    await createIndex(
      COLLECTIONS.PROPERTY_ITEMS,
      { 'provenance.networkArchetypeKey': 1, 'provenance.type': 1 },
      { name: 'provenance_archetype_type', sparse: true }
    )
  );

  // BEO version locking
  results.push(
    await createIndex(
      COLLECTIONS.PROPERTY_ITEMS,
      { 'versionHistory.lockedByBEOs': 1 },
      { name: 'versionHistory_lockedByBEOs', sparse: true }
    )
  );

  // Tags filter
  results.push(
    await createIndex(
      COLLECTIONS.PROPERTY_ITEMS,
      { propertyId: 1, tags: 1 },
      { name: 'propertyId_tags' }
    )
  );

  // Text search across name + descriptions
  results.push(
    await createIndex(
      COLLECTIONS.PROPERTY_ITEMS,
      {
        'current.canonicalName': 'text',
        'current.descriptions.short': 'text',
        'current.descriptions.standard': 'text',
        'current.descriptions.poetic': 'text',
      } as Record<string, 1 | -1 | 'text'>,
      { name: 'item_text_search' }
    )
  );

  // ===================================================
  // network_items collection
  // ===================================================

  results.push(
    await createIndex(
      COLLECTIONS.NETWORK_ITEMS,
      { archetypeKey: 1 },
      { name: 'archetypeKey_unique', unique: true }
    )
  );

  results.push(
    await createIndex(
      COLLECTIONS.NETWORK_ITEMS,
      { 'identity.category': 1, 'identity.cuisineFamily': 1 },
      { name: 'category_cuisine' }
    )
  );

  // ===================================================
  // network_intelligence collection
  // ===================================================

  results.push(
    await createIndex(
      COLLECTIONS.NETWORK_INTELLIGENCE,
      { archetypeKey: 1, 'period.year': -1, 'period.quarter': -1 },
      { name: 'archetype_period' }
    )
  );

  results.push(
    await createIndex(
      COLLECTIONS.NETWORK_INTELLIGENCE,
      { region: 1, 'pricing.propertyTier': 1, archetypeKey: 1 },
      { name: 'region_tier_archetype' }
    )
  );

  // ===================================================
  // menus collection
  // ===================================================

  results.push(
    await createIndex(
      COLLECTIONS.MENUS,
      { propertyId: 1, menuId: 1 },
      { name: 'propertyId_menuId_unique', unique: true }
    )
  );

  results.push(
    await createIndex(
      COLLECTIONS.MENUS,
      { propertyId: 1, workflowStage: 1, updatedAt: -1 },
      { name: 'propertyId_stage_updated' }
    )
  );

  results.push(
    await createIndex(
      COLLECTIONS.MENUS,
      { 'attachedTo.beoId': 1 },
      { name: 'attached_beoId', sparse: true }
    )
  );

  results.push(
    await createIndex(
      COLLECTIONS.MENUS,
      { 'attachedTo.eventId': 1 },
      { name: 'attached_eventId', sparse: true }
    )
  );

  results.push(
    await createIndex(
      COLLECTIONS.MENUS,
      { 'attachedTo.clientId': 1, createdAt: -1 },
      { name: 'attached_clientId_created', sparse: true }
    )
  );

  // ===================================================
  // menu_drafts collection
  // ===================================================

  results.push(
    await createIndex(
      COLLECTIONS.MENU_DRAFTS,
      { propertyId: 1, draftId: 1 },
      { name: 'propertyId_draftId_unique', unique: true }
    )
  );

  results.push(
    await createIndex(
      COLLECTIONS.MENU_DRAFTS,
      { propertyId: 1, status: 1, createdAt: -1 },
      { name: 'propertyId_status_created' }
    )
  );

  results.push(
    await createIndex(
      COLLECTIONS.MENU_DRAFTS,
      { propertyId: 1, 'sourceContext.userId': 1, status: 1 },
      { name: 'propertyId_userId_status' }
    )
  );

  // TTL index — auto-delete drafts 90 days after expiry
  results.push(
    await createIndex(
      COLLECTIONS.MENU_DRAFTS,
      { expiresAt: 1 },
      { name: 'expiresAt_ttl', expireAfterSeconds: 90 * 24 * 60 * 60 }
    )
  );

  // ===================================================
  // Report results
  // ===================================================

  const successful = results.filter((r) => r.created);
  const failed = results.filter((r) => !r.created);

  // eslint-disable-next-line no-console
  console.info(`✓ Created ${successful.length} indexes successfully`);
  successful.forEach((r) => {
    // eslint-disable-next-line no-console
    console.info(`  ✓ ${r.collection}.${r.indexName}`);
  });

  if (failed.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`\n⚠ ${failed.length} indexes had issues:`);
    failed.forEach((r) => {
      // eslint-disable-next-line no-console
      console.warn(`  ⚠ ${r.collection}.${r.indexName}: ${r.error}`);
    });
  }

  // eslint-disable-next-line no-console
  console.info('\nNote: Atlas Search and Vector Search indexes must be created');
  // eslint-disable-next-line no-console
  console.info('separately in the Atlas dashboard. See Package 4 for definitions.\n');
}

// Run when executed directly
{
  createAllIndexes()
    .then(async () => {
      await closeMongoConnection();
      process.exit(0);
    })
    .catch(async (err) => {
      // eslint-disable-next-line no-console
      console.error('✗ Index creation failed:', err);
      await closeMongoConnection();
      process.exit(1);
    });
}

export { createAllIndexes };
