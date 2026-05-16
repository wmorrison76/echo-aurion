/**
 * Seed Runner
 *
 * Idempotent script that seeds the database with menu item data.
 * Safe to re-run: existing items (by deterministic itemId) are not duplicated.
 *
 * Run via:
 *   npx tsx src/modules/MaestroBqts/BanquetMenuBuilder/data/seeds/runSeeds.ts
 *
 * Optional flags via env:
 *   SEED_FORCE=true    — Force re-seed even if items exist (drops + re-inserts)
 *   SEED_VERIFY=true   — Run verification queries after seeding (default: true)
 */

import { propertyItemRepository } from '../repositories';
import { closeMongoConnection } from '../mongoClient';
import { getDemoPropertySeedItems } from './demoPropertySeed';

const PROPERTY_ID = 'demo-property-001';

interface SeedResult {
  totalRequested: number;
  inserted: number;
  skipped: number;
  failed: number;
  errors: string[];
}

async function checkExistingItems(itemIds: string[]): Promise<Set<string>> {
  if (itemIds.length === 0) return new Set();

  const existing = await propertyItemRepository.findByIds(PROPERTY_ID, itemIds);
  return new Set(existing.map((item) => item.itemId));
}

async function runSeed(force = false): Promise<SeedResult> {
  // eslint-disable-next-line no-console
  console.info('🌱 Starting demo property seed...\n');

  const items = getDemoPropertySeedItems();
  const result: SeedResult = {
    totalRequested: items.length,
    inserted: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // eslint-disable-next-line no-console
  console.info(`Loaded ${items.length} items from seed definitions`);

  // Check for existing items unless forcing
  let existing: Set<string> = new Set();
  if (!force) {
    existing = await checkExistingItems(items.map((i) => i.itemId));
    if (existing.size > 0) {
      // eslint-disable-next-line no-console
      console.info(`Found ${existing.size} items already in database (will skip)`);
      // eslint-disable-next-line no-console
      console.info('Use SEED_FORCE=true to override\n');
    }
  } else {
    // eslint-disable-next-line no-console
    console.info('SEED_FORCE=true — will re-insert all items\n');
  }

  // Filter out existing items (unless forcing)
  const toInsert = force ? items : items.filter((item) => !existing.has(item.itemId));
  result.skipped = items.length - toInsert.length;

  if (toInsert.length === 0) {
    // eslint-disable-next-line no-console
    console.info('✓ All items already seeded. Nothing to do.');
    return result;
  }

  // Bulk insert
  try {
    const inserted = await propertyItemRepository.bulkCreate(toInsert);
    result.inserted = inserted;
    // eslint-disable-next-line no-console
    console.info(`✓ Inserted ${inserted} new items\n`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    result.failed = toInsert.length;
    result.errors.push(error);
    // eslint-disable-next-line no-console
    console.error(`✗ Bulk insert failed: ${error}`);

    // Fallback: try one at a time to identify which item failed
    // eslint-disable-next-line no-console
    console.info('\nAttempting individual inserts to identify failures...\n');
    result.inserted = 0;
    result.failed = 0;

    for (const item of toInsert) {
      try {
        await propertyItemRepository.create(item);
        result.inserted++;
      } catch (itemErr) {
        const itemError = itemErr instanceof Error ? itemErr.message : String(itemErr);
        result.failed++;
        result.errors.push(`${item.itemId}: ${itemError}`);
      }
    }
  }

  return result;
}

async function runVerification(): Promise<void> {
  // eslint-disable-next-line no-console
  console.info('\n🔍 Running verification queries...\n');

  // Total count
  const allItems = await propertyItemRepository.listActive(PROPERTY_ID, 1000);
  // eslint-disable-next-line no-console
  console.info(`Total active items: ${allItems.length}`);

  // Count by category
  const byCategory: Record<string, number> = {};
  allItems.forEach((item) => {
    byCategory[item.current.category] = (byCategory[item.current.category] ?? 0) + 1;
  });
  // eslint-disable-next-line no-console
  console.info('\nBy category:');
  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      // eslint-disable-next-line no-console
      console.info(`  ${cat.padEnd(20)} ${count}`);
    });

  // Count by dietary tag
  const byTag: Record<string, number> = { D: 0, G: 0, N: 0, S: 0, VE: 0, VG: 0 };
  allItems.forEach((item) => {
    item.current.dietary.tags.forEach((tag) => {
      byTag[tag] = (byTag[tag] ?? 0) + 1;
    });
  });
  // eslint-disable-next-line no-console
  console.info('\nBy dietary tag:');
  Object.entries(byTag).forEach(([tag, count]) => {
    // eslint-disable-next-line no-console
    console.info(`  ${tag.padEnd(4)} ${count}`);
  });

  // Vegan-compatible items
  const veganItems = allItems.filter((i) => i.current.dietary.dietCompatibility.vegan);
  // eslint-disable-next-line no-console
  console.info(`\nVegan-compatible items: ${veganItems.length}`);

  // Gluten-free compatible items
  const gfItems = allItems.filter((i) => i.current.dietary.dietCompatibility.glutenFree);
  // eslint-disable-next-line no-console
  console.info(`Gluten-free compatible items: ${gfItems.length}`);

  // Items with network archetype links
  const forkedItems = allItems.filter((i) => i.provenance.type === 'forked');
  // eslint-disable-next-line no-console
  console.info(`Items linked to network archetypes: ${forkedItems.length}`);

  // Sample item structure
  if (allItems.length > 0) {
    const sample = allItems[0];
    // eslint-disable-next-line no-console
    console.info('\nSample item structure (first item):');
    // eslint-disable-next-line no-console
    console.info(`  Name:        ${sample.current.canonicalName}`);
    // eslint-disable-next-line no-console
    console.info(`  Category:    ${sample.current.category}`);
    // eslint-disable-next-line no-console
    console.info(`  Pricing:     ${JSON.stringify(sample.current.pricing)}`);
    // eslint-disable-next-line no-console
    console.info(`  Tags:        ${sample.current.dietary.tags.join(', ')}`);
    // eslint-disable-next-line no-console
    console.info(`  Version:     ${sample.currentVersionId}`);
    // eslint-disable-next-line no-console
    console.info(`  Provenance:  ${sample.provenance.type}`);
  }
}

async function main(): Promise<void> {
  const force = process.env.SEED_FORCE === 'true';
  const verify = process.env.SEED_VERIFY !== 'false';

  try {
    const result = await runSeed(force);

    // eslint-disable-next-line no-console
    console.info('\n' + '='.repeat(50));
    // eslint-disable-next-line no-console
    console.info('SEED COMPLETE');
    // eslint-disable-next-line no-console
    console.info('='.repeat(50));
    // eslint-disable-next-line no-console
    console.info(`Total requested: ${result.totalRequested}`);
    // eslint-disable-next-line no-console
    console.info(`Inserted:        ${result.inserted}`);
    // eslint-disable-next-line no-console
    console.info(`Skipped:         ${result.skipped}`);
    // eslint-disable-next-line no-console
    console.info(`Failed:          ${result.failed}`);

    if (result.errors.length > 0) {
      // eslint-disable-next-line no-console
      console.warn('\nErrors:');
      result.errors.forEach((err) => {
        // eslint-disable-next-line no-console
        console.warn(`  ⚠ ${err}`);
      });
    }

    if (verify && result.failed === 0) {
      await runVerification();
    }

    await closeMongoConnection();
    process.exit(result.failed > 0 ? 1 : 0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('✗ Seed failed:', err);
    await closeMongoConnection();
    process.exit(1);
  }
}

{
  main();
}

export { runSeed, runVerification };
