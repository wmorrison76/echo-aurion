/**
 * Data Integrity Verification
 *
 * Standalone verification queries that confirm Package 2 seeded
 * the database correctly. Runs a battery of checks and reports.
 *
 * Run via:
 *   npx tsx src/modules/MaestroBqts/BanquetMenuBuilder/data/verify/verifyDataIntegrity.ts
 *
 * Exits with code 0 if all checks pass, 1 if any fail.
 */

import { propertyItemRepository } from '../repositories';
import { closeMongoConnection } from '../mongoClient';
import { aggregateAllergens, findUncoveredDiets } from '../../utils/dietary';
import { formatMoney, calculatePerGuestCost } from '../../utils/pricing';

const PROPERTY_ID = 'demo-property-001';

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

const checks: CheckResult[] = [];

function record(name: string, passed: boolean, detail: string): void {
  checks.push({ name, passed, detail });
  const icon = passed ? '✓' : '✗';
  // eslint-disable-next-line no-console
  console.info(`  ${icon} ${name}: ${detail}`);
}

async function runAllChecks(): Promise<void> {
  // eslint-disable-next-line no-console
  console.info('🔍 Running data integrity checks...\n');

  // Check 1: Items exist
  const allItems = await propertyItemRepository.listActive(PROPERTY_ID, 1000);
  record(
    'Items exist',
    allItems.length > 0,
    `${allItems.length} active items found`
  );

  if (allItems.length === 0) {
    // eslint-disable-next-line no-console
    console.warn('\nNo items found. Run the seed script first: npx tsx data/seeds/runSeeds.ts');
    return;
  }

  // Check 2: Each category is represented
  const byCategory = new Set(allItems.map((i) => i.current.category));
  const expectedCategories = ['cold-selection', 'hot-selection', 'entree', 'dessert', 'hors-doeuvre'];
  const missingCats = expectedCategories.filter((c) => !byCategory.has(c as never));
  record(
    'Core categories present',
    missingCats.length === 0,
    missingCats.length === 0
      ? `Categories: ${[...byCategory].join(', ')}`
      : `Missing: ${missingCats.join(', ')}`
  );

  // Check 3: All items have valid pricing
  const itemsWithoutPricing = allItems.filter((i) => !i.current.pricing);
  record(
    'All items have pricing',
    itemsWithoutPricing.length === 0,
    itemsWithoutPricing.length === 0
      ? 'All items priced'
      : `${itemsWithoutPricing.length} items missing pricing`
  );

  // Check 4: All items have versions
  const itemsWithoutVersion = allItems.filter(
    (i) => !i.currentVersionId || i.versionHistory.length === 0
  );
  record(
    'All items versioned',
    itemsWithoutVersion.length === 0,
    itemsWithoutVersion.length === 0
      ? 'All items have version history'
      : `${itemsWithoutVersion.length} items missing version`
  );

  // Check 5: Dietary profile derivation
  const profilesValid = allItems.every((i) => {
    const tags = i.current.dietary.tags;
    const allergens = i.current.dietary.allergens;
    if (tags.includes('D') && !allergens.milk) return false;
    if (tags.includes('G') && !allergens.wheat) return false;
    if (tags.includes('S') && !allergens.shellfish.contains) return false;
    return true;
  });
  record(
    'Dietary profiles consistent',
    profilesValid,
    profilesValid
      ? 'Display tags match underlying allergens'
      : 'Some items have inconsistent tag/allergen data'
  );

  // Check 6: At least one vegan option exists
  const hasVegan = allItems.some((i) => i.current.dietary.dietCompatibility.vegan);
  record(
    'Vegan option available',
    hasVegan,
    hasVegan ? 'Vegan-compatible items found' : 'No vegan options in library'
  );

  // Check 7: At least one gluten-free option exists
  const hasGlutenFree = allItems.some(
    (i) => i.current.dietary.dietCompatibility.glutenFree
  );
  record(
    'Gluten-free option available',
    hasGlutenFree,
    hasGlutenFree ? 'GF-compatible items found' : 'No GF options in library'
  );

  // Check 8: Forked items have archetype keys
  const forkedItems = allItems.filter((i) => i.provenance.type === 'forked');
  const forkedHaveKeys = forkedItems.every((i) => i.provenance.networkArchetypeKey);
  record(
    'Forked items have archetype keys',
    forkedHaveKeys,
    `${forkedItems.length} forked items, all valid`
  );

  // Check 9: Cost basis present where expected
  const itemsWithCost = allItems.filter((i) => i.current.pricingMetadata.costBasis.amount > 0);
  record(
    'Cost basis present',
    itemsWithCost.length > 0,
    `${itemsWithCost.length} items have cost basis (out of ${allItems.length})`
  );

  // Check 10: Test query — find seafood entrees
  const seafoodEntrees = allItems.filter(
    (i) =>
      i.current.category === 'entree' &&
      (i.tags.includes('seafood') ||
        i.current.canonicalName.toLowerCase().match(/salmon|tuna|grouper|mahi|sea bass|crab/))
  );
  record(
    'Seafood entree query works',
    seafoodEntrees.length > 0,
    `Found ${seafoodEntrees.length} seafood entrees`
  );

  // Check 11: Sample pricing calculation
  const sampleItem = allItems.find((i) => i.current.pricing.kind === 'per-guest');
  if (sampleItem) {
    const perGuest = calculatePerGuestCost(sampleItem.current.pricing, 50);
    record(
      'Pricing calculation works',
      perGuest !== null,
      `Sample: ${sampleItem.current.canonicalName} = ${formatMoney(perGuest!)} per guest`
    );
  }

  // Check 12: Diet coverage analysis
  const profiles = allItems.map((i) => i.current.dietary);
  const uncovered = findUncoveredDiets(profiles, ['vegan', 'glutenFree', 'keto']);
  record(
    'Common diet coverage',
    uncovered.length === 0,
    uncovered.length === 0
      ? 'Vegan, GF, and Keto all covered'
      : `Missing coverage: ${uncovered.join(', ')}`
  );

  // Check 13: Allergen distribution
  const allergenStats = aggregateAllergens(profiles);
  // eslint-disable-next-line no-console
  console.info('\n  Allergen distribution:');
  Object.entries(allergenStats)
    .filter(([, data]) => data.count > 0)
    .sort((a, b) => b[1].pct - a[1].pct)
    .forEach(([allergen, data]) => {
      // eslint-disable-next-line no-console
      console.info(`    ${allergen.padEnd(12)} ${data.count} items (${data.pct}%)`);
    });
}

async function main(): Promise<void> {
  try {
    await runAllChecks();

    const passed = checks.filter((c) => c.passed).length;
    const failed = checks.filter((c) => !c.passed).length;

    // eslint-disable-next-line no-console
    console.info('\n' + '='.repeat(50));
    if (failed === 0) {
      // eslint-disable-next-line no-console
      console.info(`✓ All ${passed} checks passed`);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`✗ ${failed} checks failed (${passed} passed)`);
    }
    // eslint-disable-next-line no-console
    console.info('='.repeat(50));

    await closeMongoConnection();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('✗ Verification failed:', err);
    await closeMongoConnection();
    process.exit(1);
  }
}

{
  main();
}

export { runAllChecks };
