/**
 * Seed Helpers
 *
 * Compact constructors for building PropertyItem records during seeding.
 * Without these helpers, each item would be 60+ lines of JSON. With them,
 * each item is 6-8 lines plus the descriptions.
 */

import type {
  PropertyItem,
  ItemSnapshot,
  PropertyId,
  PricingModel,
  ServiceRequirement,
  DietaryProfile,
  DietaryTag,
  ItemCategory,
  PreparationStyle,
} from '../../BanquetMenuBuilder.types';
import { profileFromTags } from '../../utils/dietary';
import { money } from '../../utils/pricing';
import { deterministicItemId } from '../../utils/idGeneration';
import { createInitialVersion } from '../../utils/version';

/**
 * Compact specification for building a seed item.
 */
export interface SeedItemSpec {
  name: string;
  category: ItemCategory;
  cuisineFamily?: string[];

  descriptions: {
    short: string;
    standard?: string; // Defaults to short if not provided
    long?: string; // Defaults to standard
    poetic?: string; // Defaults to standard
    kitchen?: string; // Internal prep notes
  };

  taglineOptions?: string[];

  // Pricing — most common case is per-guest
  pricing: PricingModel;
  costBasis?: number; // For margin tracking; defaults to 30% of price
  targetMarginPct?: number; // Defaults to 70%

  // Dietary tags drive the profile derivation
  dietaryTags: DietaryTag[];

  // Service style
  preparation?: PreparationStyle; // Defaults to 'displayed'
  needsChef?: boolean;
  needsAttendant?: boolean;
  minGuests?: number;

  // Tags
  tags?: string[];

  // Provenance
  networkArchetype?: string;
}

const DEFAULT_PROPERTY = 'demo-property-001';
const SEED_USER = 'system-seed';

function makeServiceRequirement(spec: SeedItemSpec): ServiceRequirement {
  return {
    preparationStyle: spec.preparation ?? 'displayed',
    staffingRequired: {
      chef: { needed: spec.needsChef ?? false, ratio: spec.needsChef ? '1 per 50 guests' : undefined },
      attendant: {
        needed: spec.needsAttendant ?? false,
        ratio: spec.needsAttendant ? '1 per 75 guests' : undefined,
      },
      sushiChef: { needed: false },
      mixologist: { needed: false },
      bartender: { needed: false },
      carver: { needed: spec.preparation === 'carved' },
    },
    durationLimits: {
      maxServiceMinutes: spec.preparation === 'displayed' ? 60 : 120,
      requiresHotHold: ['hot-selection', 'entree', 'soup'].includes(spec.category),
      requiresColdHold: ['cold-selection', 'salad', 'dessert', 'sushi', 'raw-bar'].includes(
        spec.category
      ),
    },
    equipment: spec.needsChef ? ['induction-burner'] : [],
    setupFootprint: {
      linearFeet: spec.needsAttendant || spec.needsChef ? 6 : 4,
      powerRequirement: spec.needsChef ? '110v' : 'none',
    },
    minGuestCount: spec.minGuests ?? (spec.preparation === 'displayed' ? 50 : 1),
  };
}

function makeSnapshot(spec: SeedItemSpec): ItemSnapshot {
  const dietary = profileFromTags(spec.dietaryTags);
  const displayPrice =
    spec.pricing.kind === 'per-guest' || spec.pricing.kind === 'per-piece' || spec.pricing.kind === 'per-dozen'
      ? spec.pricing.price.amount
      : 0;

  const costBasis = spec.costBasis ?? displayPrice * 0.3;
  const targetMargin = spec.targetMarginPct ?? 70;

  return {
    canonicalName: spec.name,
    category: spec.category,
    cuisineFamily: spec.cuisineFamily ?? [],
    descriptions: {
      short: spec.descriptions.short,
      standard: spec.descriptions.standard ?? spec.descriptions.short,
      long: spec.descriptions.long ?? spec.descriptions.standard ?? spec.descriptions.short,
      poetic: spec.descriptions.poetic ?? spec.descriptions.standard ?? spec.descriptions.short,
      kitchen: spec.descriptions.kitchen ?? `Standard preparation. Allergens per dietary tags.`,
    },
    taglineOptions: spec.taglineOptions ?? [],
    pricing: spec.pricing,
    pricingMetadata: {
      costBasis: money(costBasis),
      targetMarginPct: targetMargin,
      lastReviewedAt: new Date(),
    },
    dietary,
    serviceRequirement: makeServiceRequirement(spec),
    mediaAssetIds: [],
  };
}

/**
 * Build a complete PropertyItem from a compact spec.
 * Used by seed files to keep them readable.
 */
export function buildSeedItem(
  spec: SeedItemSpec,
  propertyId: PropertyId = DEFAULT_PROPERTY
): Omit<PropertyItem, '_id' | 'createdAt' | 'updatedAt'> {
  const snapshot = makeSnapshot(spec);
  const initialVersion = createInitialVersion({
    snapshot,
    changedBy: SEED_USER,
    approvedBy: SEED_USER,
  });

  return {
    propertyId,
    itemId: deterministicItemId(propertyId, spec.name),
    provenance: {
      type: spec.networkArchetype ? 'forked' : 'original',
      networkArchetypeKey: spec.networkArchetype,
      forkedAt: spec.networkArchetype ? new Date() : undefined,
      forkedFromVersion: spec.networkArchetype ? '1.0.0' : undefined,
      upstreamSyncPolicy: 'notify-on-change',
      networkContribution: 'anonymized',
    },
    current: snapshot,
    currentVersionId: '1.0.0',
    versionHistory: [initialVersion],
    status: 'active',
    ownerRole: 'executive-chef-banquets',
    tags: spec.tags ?? [],
  };
}

/**
 * Helper: per-guest pricing builder.
 */
export function perGuest(amount: number): PricingModel {
  return { kind: 'per-guest', price: money(amount) };
}

/**
 * Helper: per-piece pricing builder.
 */
export function perPiece(amount: number, minOrder = 24): PricingModel {
  return { kind: 'per-piece', price: money(amount), minOrder };
}

/**
 * Helper: per-dozen pricing builder.
 */
export function perDozen(amount: number, minOrder = 1): PricingModel {
  return { kind: 'per-dozen', price: money(amount), minOrder };
}

/**
 * Helper: flat-fee pricing builder.
 */
export function flatFee(amount: number, serves: string): PricingModel {
  return { kind: 'flat-fee', price: money(amount), serves };
}

/**
 * Helper: market-price pricing builder.
 */
export function marketPrice(): PricingModel {
  return { kind: 'market-price' };
}
