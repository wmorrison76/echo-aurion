/**
 * Cleanup — Legacy Property Records
 *
 * One-shot script that removes records keyed to the prior demo
 * propertyId from the property-scoped BMB collections. Run after
 * the demo property has been renamed and re-seeded under the new key.
 *
 * Run via:
 *   npx tsx client/modules/BanquetMenuBuilder/data/seeds/cleanupLegacyProperty.ts
 *
 * Optional flags via env:
 *   LEGACY_PROPERTY_ID=<id>   — Override the legacy id (default below)
 *   CLEANUP_DRY_RUN=true      — Report counts only, do not delete
 */

import { getDb, closeMongoConnection } from '../mongoClient';
import { COLLECTIONS } from '../../BanquetMenuBuilder.constants';

const LEGACY_PROPERTY_ID = process.env.LEGACY_PROPERTY_ID ?? 'pier-sixty-six-fll';
const DRY_RUN = process.env.CLEANUP_DRY_RUN === 'true';

const TARGET_COLLECTIONS = [
  COLLECTIONS.PROPERTY_ITEMS,
  COLLECTIONS.MENUS,
  COLLECTIONS.MENU_DRAFTS,
] as const;

interface CollectionResult {
  collection: string;
  matched: number;
  deleted: number;
  error?: string;
}

async function cleanCollection(name: string): Promise<CollectionResult> {
  const db = await getDb();
  const collection = db.collection(name);
  const filter = { propertyId: LEGACY_PROPERTY_ID };

  const matched = await collection.countDocuments(filter);
  if (matched === 0) {
    return { collection: name, matched: 0, deleted: 0 };
  }
  if (DRY_RUN) {
    return { collection: name, matched, deleted: 0 };
  }

  const result = await collection.deleteMany(filter);
  return { collection: name, matched, deleted: result.deletedCount ?? 0 };
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.info(
    `🧹 Cleaning legacy propertyId="${LEGACY_PROPERTY_ID}"${DRY_RUN ? ' (DRY RUN)' : ''}\n`,
  );

  const results: CollectionResult[] = [];
  let hadError = false;

  for (const name of TARGET_COLLECTIONS) {
    try {
      const result = await cleanCollection(name);
      results.push(result);
      // eslint-disable-next-line no-console
      console.info(
        `  ${name.padEnd(22)} matched=${result.matched.toString().padStart(4)} ` +
          `deleted=${result.deleted.toString().padStart(4)}`,
      );
    } catch (err) {
      hadError = true;
      const message = err instanceof Error ? err.message : String(err);
      results.push({ collection: name, matched: 0, deleted: 0, error: message });
      // eslint-disable-next-line no-console
      console.error(`  ${name.padEnd(22)} ✗ ${message}`);
    }
  }

  const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);
  const totalMatched = results.reduce((sum, r) => sum + r.matched, 0);

  // eslint-disable-next-line no-console
  console.info('\n' + '='.repeat(50));
  // eslint-disable-next-line no-console
  console.info(DRY_RUN ? 'CLEANUP DRY RUN COMPLETE' : 'CLEANUP COMPLETE');
  // eslint-disable-next-line no-console
  console.info('='.repeat(50));
  // eslint-disable-next-line no-console
  console.info(`Total matched:  ${totalMatched}`);
  // eslint-disable-next-line no-console
  console.info(`Total deleted:  ${totalDeleted}`);

  await closeMongoConnection();
  process.exit(hadError ? 1 : 0);
}

{
  main().catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error('✗ Cleanup failed:', err);
    await closeMongoConnection();
    process.exit(1);
  });
}
