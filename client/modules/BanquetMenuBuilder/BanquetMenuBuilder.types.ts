/**
 * Banquet Menu Builder — TypeScript Types
 *
 * This file is the single source of truth for the module's data shapes.
 * All schemas designed in the architecture phase are codified here.
 *
 * Conventions:
 * - All entities use UUID strings (not ObjectIds) for portability
 * - Discriminated unions are used for variant types (PricingModel, SelectionRule)
 * - Nested objects use `Partial` only where override semantics apply
 * - Dates are JavaScript Date objects, not ISO strings
 */

import type { ObjectId } from 'mongodb';
import type {
  BanquetModuleRole,
  DietaryTag,
  Allergen,
  DietCompatibility,
  ItemCategory,
  MenuType,
  ServiceStyle,
  WorkflowStage,
  PricingKind,
  SelectionRuleKind,
} from './BanquetMenuBuilder.constants';

// =====================================================
// Identity types
// =====================================================
export type UUID = string;
export type PropertyId = string;
export type MenuItemId = string;
export type MenuId = string;
export type DraftId = string;
export type ArchetypeKey = string;
export type UserId = string;

// =====================================================
// Money & Pricing
// =====================================================
export interface Money {
  amount: number;
  currency: 'USD'; // Single currency for now; expandable later
}

export interface PackageTier {
  hours: number;
  price: Money;
}

/**
 * Discriminated union for all pricing models seen across reference menus.
 * The `kind` field determines which other fields are available.
 */
export type PricingModel =
  | { kind: 'per-guest'; price: Money; minGuests?: number }
  | { kind: 'per-dozen'; price: Money; minOrder: number }
  | { kind: 'per-piece'; price: Money; minOrder: number }
  | { kind: 'per-gallon'; price: Money }
  | { kind: 'per-bottle'; price: Money }
  | { kind: 'per-drink'; price: Money }
  | { kind: 'flat-fee'; price: Money; serves: string }
  | { kind: 'market-price'; lastQuoted?: Money; quotedAt?: Date }
  | { kind: 'package-tier'; tiers: PackageTier[] }
  | { kind: 'add-on'; basePrice: Money; appliedTo: string };

export interface PricingMetadata {
  costBasis: Money;
  targetMarginPct: number;
  competitorBenchmark?: Money;
  networkPercentile?: number; // 0-100, where this price sits vs network
  lastReviewedAt: Date;
  priceLockUntil?: Date;
}

// =====================================================
// Dietary Profile
// =====================================================
export interface AllergenFlag {
  contains: boolean;
  species?: string[]; // For fish/shellfish — specific species
  specific?: string[]; // For tree nuts — specific nuts
}

export interface DietaryProfile {
  // Display tags (lossy projection for menu rendering)
  tags: DietaryTag[];

  // Granular allergen flags (kitchen layer — full truth)
  allergens: {
    milk: boolean;
    eggs: boolean;
    fish: AllergenFlag;
    shellfish: AllergenFlag;
    treeNuts: AllergenFlag;
    peanuts: boolean;
    wheat: boolean;
    soy: boolean;
    sesame: boolean;
    sulfites: boolean;
    crossContaminationRisk: boolean;
  };

  // Certifications
  certifications: {
    kosher: 'none' | 'kosher' | 'mevushal' | 'glatt';
    halal: boolean;
    organic: boolean;
    nonGMO: boolean;
  };

  // Diet compatibility (used for filter searches)
  dietCompatibility: {
    vegan: boolean;
    vegetarian: boolean;
    pescatarian: boolean;
    glutenFree: boolean;
    dairyFree: boolean;
    keto: boolean;
    paleo: boolean;
    lowFodmap: boolean;
  };
}

// =====================================================
// Service Requirements
// =====================================================
export type PreparationStyle =
  | 'pre-set'
  | 'displayed'
  | 'attendant-served'
  | 'chef-prepared'
  | 'carved'
  | 'butler-passed';

export interface StaffingRequirement {
  needed: boolean;
  ratio?: string; // e.g., "1 per 50 guests"
}

export interface ServiceRequirement {
  preparationStyle: PreparationStyle;
  staffingRequired: {
    chef: StaffingRequirement;
    attendant: StaffingRequirement;
    sushiChef: StaffingRequirement;
    mixologist: StaffingRequirement;
    bartender: StaffingRequirement;
    carver: StaffingRequirement;
  };
  durationLimits: {
    maxServiceMinutes: number;
    requiresHotHold: boolean;
    requiresColdHold: boolean;
  };
  equipment: string[];
  setupFootprint: {
    linearFeet: number;
    powerRequirement: 'none' | '110v' | '220v' | 'gas';
  };
  minGuestCount: number;
}

// =====================================================
// Description Variants
// =====================================================
export interface DescriptionSet {
  short: string; // Tight layouts: 12 words max
  standard: string; // Default menu copy
  long: string; // Hero/featured treatment
  poetic: string; // Marketing/social copy
  kitchen: string; // Internal prep notes
}

// =====================================================
// Media Assets
// =====================================================
export type MediaAssetType =
  | 'photography-hero'
  | 'photography-cropped'
  | 'photography-lifestyle'
  | 'photography-flatlay'
  | 'illustration'
  | 'icon';

export type AspectRatio = '1:1' | '4:5' | '16:9' | '3:2' | '9:16';
export type PhotoMood = 'warm' | 'rustic' | 'editorial' | 'minimal' | 'dramatic' | 'bright';
export type PhotoLighting = 'natural' | 'studio' | 'moody' | 'bright';

export interface MediaAssetVariant {
  aspectRatio: AspectRatio;
  resolution: { width: number; height: number };
  fileUrl: string;
  cdnUrl: string;
}

export interface MediaAsset {
  id: UUID;
  menuItemId: MenuItemId;
  type: MediaAssetType;
  variants: MediaAssetVariant[];
  treatment: {
    moodTags: PhotoMood[];
    palette: string[]; // Hex codes for template-matching
    lighting: PhotoLighting;
  };
  rights: {
    photographer: string;
    licenseType: 'owned' | 'licensed' | 'royalty-free';
    expiresAt?: Date;
  };
  approvedForUse: ('client-menu' | 'marketing' | 'social' | 'print' | 'pos')[];
}

// =====================================================
// Item Versioning
// =====================================================
export interface ItemSnapshot {
  canonicalName: string;
  category: ItemCategory;
  cuisineFamily: string[];
  descriptions: DescriptionSet;
  taglineOptions: string[];
  pricing: PricingModel;
  pricingMetadata: PricingMetadata;
  dietary: DietaryProfile;
  serviceRequirement: ServiceRequirement;
  mediaAssetIds: UUID[];
}

export interface ItemVersion {
  versionId: string; // Semver-style: '4.2.1'
  changeType: 'major' | 'minor' | 'patch';
  changeReason: string;
  snapshot: ItemSnapshot;
  changedBy: UserId;
  changedAt: Date;
  approvedBy?: UserId;
  approvedAt?: Date;
  lockedByBEOs: string[]; // BEO IDs that locked this version
}

// =====================================================
// Provenance — Hybrid Library Layer
// =====================================================
export type UpstreamSyncPolicy = 'auto-accept' | 'notify-on-change' | 'frozen';
export type NetworkContributionLevel = 'full' | 'anonymized' | 'opted-out';

export interface ItemProvenance {
  type: 'forked' | 'original' | 'private';
  networkArchetypeKey?: ArchetypeKey; // null if original
  forkedAt?: Date;
  forkedFromVersion?: string;
  upstreamSyncPolicy: UpstreamSyncPolicy;
  networkContribution: NetworkContributionLevel;
}

// =====================================================
// Embedding (for vector search — populated in Package 4)
// =====================================================
export interface ItemEmbedding {
  vector: number[]; // 1536-dim from OpenAI text-embedding-3-small
  sourceHash: string; // Hash of source text — re-embed when changed
  modelVersion: string;
  embeddedAt: Date;
}

// =====================================================
// Property Item — The main entity in property_items collection
// =====================================================
export interface PropertyItem {
  _id?: ObjectId;
  propertyId: PropertyId;
  itemId: MenuItemId;

  // Provenance
  provenance: ItemProvenance;

  // Current active version (denormalized for read performance)
  current: ItemSnapshot;
  currentVersionId: string;

  // Embedded version history (last 20 versions; older cold-stored)
  versionHistory: ItemVersion[];

  // Lifecycle
  status: 'draft' | 'active' | 'seasonal-paused' | 'retired';
  ownerRole: BanquetModuleRole;
  tags: string[]; // Free-form: 'signature', 'wedding-favorite', 'seasonal-spring'

  // Vector embedding (populated in Package 4)
  embedding?: ItemEmbedding;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// Network Item — Shared core archetype
// =====================================================
export interface NetworkItem {
  _id?: ObjectId;
  archetypeKey: ArchetypeKey;
  schemaVersion: number;

  identity: {
    canonicalName: string;
    category: ItemCategory;
    cuisineFamily: string[];
    archetypeDescription: string;
  };

  baseDietary: {
    typicalTags: DietaryTag[];
    flexibleTags: DietaryTag[]; // Achievable with substitution
    commonAllergens: Allergen[];
    commonCertifications: { kosherPossible: boolean };
  };

  baseService: {
    typicalStyle: PreparationStyle | 'plated-or-buffet';
    typicalStaffing: { chef: boolean; attendant: boolean };
    typicalDuration: number;
  };

  pricingGuidance: {
    networkP25: Money;
    networkMedian: Money;
    networkP75: Money;
    lastBenchmarkedAt: Date;
    sampleSize: number;
  };

  variants: {
    key: string;
    description?: string;
    upcharge?: { p50: number };
  }[];

  metadata: {
    createdAt: Date;
    curatedBy: string;
    lastReviewedAt: Date;
    forkCount: number;
    subscriberCount: number;
  };
}

// =====================================================
// Network Intelligence — Aggregated anonymized signal
// =====================================================
export interface NetworkIntelligenceEntry {
  _id?: ObjectId;
  archetypeKey: ArchetypeKey;
  period: { year: number; quarter: number };
  region: string;

  pricing: {
    p10: number;
    p25: number;
    median: number;
    p75: number;
    p90: number;
    sampleSize: number;
    propertyTier: 'luxury' | 'premium' | 'upscale';
  };

  popularity: {
    selectedInMenusPct: number;
    averageGuestsServed: number;
    eventTypeAffinities: Record<string, number>;
  };

  margins: {
    p25: number;
    median: number;
    p75: number;
    costBasisRange: { p25: number; p75: number };
  };

  seasonality: {
    indexedDemand: number[]; // 12 monthly values, baseline 1.0
  };

  dietary: {
    coOccurrenceWithVeganOption: number;
    coOccurrenceWithGfOption: number;
  };

  computedAt: Date;
  contributingProperties: number;
}

// =====================================================
// Menu Composition
// =====================================================
export interface CategoryRule {
  category: string;
  count: number;
}

export type SelectionRule =
  | { kind: 'select-all' }
  | { kind: 'select-n'; count: number }
  | { kind: 'select-range'; min: number; max: number }
  | { kind: 'select-by-category'; rules: CategoryRule[] }
  | { kind: 'pre-assigned' };

export interface MenuItemPlacement {
  id: UUID;
  menuItemId: MenuItemId;
  itemVersionId: string; // Locked at compose time
  ordinal: number;

  // Per-placement overrides
  overrides?: {
    displayName?: string;
    description?: string;
    descriptionVariant?: keyof DescriptionSet;
    pricingOverride?: PricingModel;
    mediaAssetId?: UUID;
    upcharge?: Money;
    badge?: 'chef-signature' | 'new' | 'seasonal' | 'guest-favorite' | 'add-on';
  };

  visibilityRules?: {
    showPrice: boolean;
    showDietaryTags: boolean;
    showDescription: boolean;
  };
}

export type MenuSectionType =
  | 'bakery'
  | 'cold-selection'
  | 'hot-selection'
  | 'enhancement'
  | 'beverage'
  | 'dessert'
  | 'station'
  | 'carving'
  | 'raw-bar'
  | 'sushi'
  | 'shared-appetizers'
  | 'plated-entree'
  | 'salad'
  | 'soup';

export interface MenuSection {
  id: UUID;
  type: MenuSectionType;
  title: string;
  subtitle?: string;
  ordinal: number;
  selectionRule: SelectionRule;
  items: MenuItemPlacement[];
  notes?: string[];
}

// =====================================================
// Template Binding (Package 5 will fully define)
// =====================================================
export interface DesignTokenOverrides {
  [key: string]: unknown; // Loose for now; tightened in Package 5
}

export interface ClientBrandOverlay {
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  fontPreference?: string;
}

export interface TemplateBinding {
  templateId: string;
  designTokenOverrides?: DesignTokenOverrides;
  brandOverlay?: ClientBrandOverlay;
}

// =====================================================
// Approvals
// =====================================================
export interface ApprovalRecord {
  stage: WorkflowStage;
  approvedBy: UserId;
  approvedAt: Date;
  comments?: string;
}

// =====================================================
// Published Surfaces
// =====================================================
export interface PublishedSurfaces {
  clientPdf?: { url: string; generatedAt: Date };
  clientPortal?: { url: string };
  inRoomDigital?: { url: string };
  socialTiles?: { urls: string[] };
  kitchenPrep?: { url: string };
  posModifiers?: { exportedAt: Date };
}

// =====================================================
// Menu — The composed deliverable
// =====================================================
export interface Menu {
  _id?: ObjectId;
  menuId: MenuId;
  propertyId: PropertyId;
  name: string;
  type: MenuType;
  serviceStyle: ServiceStyle;
  sections: MenuSection[];
  templateBinding?: TemplateBinding;

  pricing: {
    basePrice: Money;
    enhancements: { name: string; price: Money }[];
    estimatedPerGuest: Money;
    minimumRevenue?: Money;
  };

  attachedTo: {
    beoId?: string;
    eventId?: string;
    clientId?: string;
  };

  workflowStage: WorkflowStage;
  approvals: ApprovalRecord[];
  publishedSurfaces?: PublishedSurfaces;

  versionHistory: {
    versionId: string;
    changedAt: Date;
    changedBy: UserId;
    note: string;
  }[];

  createdAt: Date;
  updatedAt: Date;
  createdBy: UserId;
}

// =====================================================
// Menu Draft — Echo-composed proposal awaiting human review
// =====================================================
export interface MenuDraft {
  _id?: ObjectId;
  draftId: DraftId;
  propertyId: PropertyId;

  source: 'echo' | 'human' | 'template';
  sourceContext: {
    userId: UserId;
    sessionId: string;
    originatingRequest: string;
    echoMode?: 'compose' | 'critique' | 'generate';
  };

  composition: {
    name: string;
    type: MenuType;
    serviceStyle: ServiceStyle;
    sections: MenuSection[];
    estimatedPerGuestPrice: Money;
    estimatedTotalRevenue: Money;
  };

  templateRecommendation?: {
    templateId: string;
    confidence: number;
    rationale: string;
  };

  rationale?: {
    overallConcept: string;
    keyDecisions: {
      decision: string;
      reasoning: string;
      networkSignal?: string;
    }[];
    tradeoffs: string[];
  };

  status: 'pending-review' | 'accepted' | 'rejected' | 'expired';
  reviewedBy?: UserId;
  reviewedAt?: Date;

  promotedToMenuId?: MenuId; // Set when accepted

  createdAt: Date;
  expiresAt: Date;
}

// =====================================================
// Search & Filter Types
// =====================================================
export interface DietarySearchFilter {
  mustHaveTags?: DietaryTag[];
  mustExcludeAllergens?: Allergen[];
  dietCompatibility?: DietCompatibility[];
}

export interface ItemSearchFilters {
  category?: ItemCategory;
  cuisineFamily?: string[];
  dietary?: DietarySearchFilter;
  priceRange?: {
    min?: number;
    max?: number;
    model?: PricingKind;
  };
  seasonalAvailability?: string;
  status?: PropertyItem['status'];
  tags?: string[];
}

export interface MenuItemSummary {
  itemId: MenuItemId;
  canonicalName: string;
  category: ItemCategory;
  shortDescription: string;
  price: Money;
  pricingKind: PricingKind;
  dietaryTags: DietaryTag[];
  networkPercentile?: number;
  relevanceScore?: number; // For semantic search
}

// =====================================================
// Module Context (passed through service calls)
// =====================================================
export interface ModuleContext {
  userId: UserId;
  userRole: BanquetModuleRole;
  propertyId: PropertyId;
  permissions: string[];
  sessionId: string;
}

// =====================================================
// Echo Types (full definitions in Package 4)
// =====================================================
export interface ComposeIntent {
  eventType?: string;
  guestCount?: number;
  serviceStyle?: ServiceStyle;
  themeMood?: string[];
  budgetPerGuest?: number;
  dietaryAccommodations?: string[];
  preferences?: string[];
  rawNaturalLanguage?: string;
}

// Placeholder — fully defined in Package 4
export interface ComposedMenuDraft extends MenuDraft {}
export interface CritiqueReport {
  menuId: MenuId;
  reviewedAt: Date;
  overallAssessment: {
    readinessScore: number;
    summary: string;
    recommendedAction: 'publish' | 'revise-minor' | 'revise-major' | 'rework';
  };
  findings: unknown[]; // Detailed in Package 4
  positiveObservations: string[];
}
export interface GeneratedCollateral {
  sourceMenuId: MenuId;
  templateFamily: string;
  generatedAt: Date;
  surfaces: Record<string, unknown>; // Detailed in Package 4
  rationale: { toneCalibration: string; keyMessageHierarchy: string[] };
}

// =====================================================
// Canvas Snapshot — flattened item shape consumed by Pkg 3's canvas
//
// PropertyItem nests the active version under `current.*` and provenance
// under `provenance.*`. Pkg 3's UI/engines read flat fields. The flattening
// happens once when the user adds the item to the composition; from then on
// the canvas works against this snapshot. See snapshotAdapter.ts.
// =====================================================
export interface CanvasOperationalLoad {
  complexityScore?: number;
  stations?: KitchenStation[];
  equipment?: EquipmentCategory[];
}

export interface CanvasSnapshot {
  id: MenuItemId;
  name: string;
  description?: string;
  category: ItemCategory;
  pricing: PricingModel;
  costBasis?: Money;
  dietaryTags: DietaryTag[];
  networkArchetypeId?: ArchetypeKey;
  operationalLoad?: CanvasOperationalLoad;
}

// =====================================================
// Operational — Kitchen stations & equipment categories
// Consumed by Package 3's operationalEngine.ts.
// =====================================================
export type KitchenStation =
  | 'saute'
  | 'grill'
  | 'garde_manger'
  | 'pastry'
  | 'fry'
  | 'raw_bar'
  | 'carving'
  | 'oven'
  | 'steam'
  | 'cold_prep'
  | 'beverage'
  | 'expo';

export type EquipmentCategory =
  | 'induction_burner'
  | 'chafer'
  | 'carving_station'
  | 'raw_bar'
  | 'fryer'
  | 'hot_box'
  | 'cold_well'
  | 'espresso_machine'
  | 'pizza_oven'
  | 'griddle'
  | 'smoker'
  | 'beverage_dispenser'
  | 'ice_well'
  | 'display_case'
  | 'other';
