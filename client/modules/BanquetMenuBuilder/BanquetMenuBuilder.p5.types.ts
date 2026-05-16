/**
 * BanquetMenuBuilder.p5.types.ts
 * ----------------------------------------------------------------------------
 * Type extensions introduced by Package 5. These types extend (do not
 * replace) the core types from Pkg 1-3. Imported by P5 hooks, services,
 * and components.
 *
 * Why a separate file:
 *   Keeps the Pkg 1-3 types file stable. Future P6+ types follow the
 *   same pattern.
 * ----------------------------------------------------------------------------
 */

import type { PropertyItem, MenuItemId, Money } from './BanquetMenuBuilder.types';

// ============================================================================
// Templates
// ============================================================================

/**
 * A saved menu template. Templates encode the structural intent of a menu
 * type — the sections, suggested items, dietary balance, target price band.
 * Chefs apply a template to a new menu as a starting point.
 *
 * Templates ARE NOT a frozen menu copy. They're a "recipe" for a menu —
 * sections may have suggested items but always allow substitution.
 */
export interface MenuTemplate {
  id: string;
  /** Human-readable name */
  name: string;
  /** What event type this is for */
  eventType: string;
  /** Optional descriptive subtitle */
  subtitle?: string;
  /** Categorization for the gallery — wedding, corporate, etc. */
  category: TemplateCategory;
  /** Style descriptors — used for filtering and Echo prompts */
  styleTags: string[];
  /** Recommended budget band per guest */
  budgetBand: {
    low: Money;
    high: Money;
    currency: string;
  };
  /** Recommended guest count band */
  guestCountBand: {
    min: number;
    max: number;
  };
  /** Section structure */
  sections: TemplateSection[];
  /** Aggregate dietary coverage targets */
  dietaryTargets?: {
    vegetarian?: number; // % of items
    vegan?: number;
    glutenFree?: number;
    dairyFree?: number;
  };
  /** Source — where this template came from */
  source: 'system' | 'property' | 'network';
  /** Optional brand overlay defaults */
  brandOverlay?: BrandOverlay;
  /** ISO timestamp */
  createdAt: string;
  updatedAt: string;
  /** Author display name (or property name for system) */
  author?: string;
}

export type TemplateCategory =
  | 'wedding'
  | 'corporate'
  | 'social'
  | 'gala'
  | 'cocktail'
  | 'plated'
  | 'buffet'
  | 'station'
  | 'breakfast'
  | 'lunch'
  | 'other';

export interface TemplateSection {
  /** Stable id within the template */
  id: string;
  kind: string;
  label: string;
  /** Suggested item ids — chef may swap any of them */
  suggestedItemIds: MenuItemId[];
  /** Min/max items the section should have */
  itemCountTarget: { min: number; max: number };
  /** Notes from template author */
  notes?: string;
}

/**
 * Brand overlay — per-property visual styling that wraps a menu when
 * published. Keeps the menu structure separate from the brand application.
 */
export interface BrandOverlay {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  /** Image URL for the brand mark */
  logoUrl?: string;
  /** Display font family */
  displayFont?: string;
  /** Body font family */
  bodyFont?: string;
  /** Header text override (e.g., property name + event title) */
  headerLine?: string;
  /** Footer text override (e.g., "presented by [property]") */
  footerLine?: string;
}

// ============================================================================
// Network Intelligence
// ============================================================================

/**
 * Anonymized cross-property data for a single PropertyItem. The network
 * intelligence service computes percentile rankings against comparable
 * properties (same region, similar event scale).
 *
 * Privacy note:
 *   Returned data is always aggregated. We never expose another property's
 *   specific menu, item details, or pricing. Only the property's own
 *   percentile within the comparison set.
 */
export interface NetworkPercentileData {
  /** The item this data describes */
  itemId: MenuItemId;
  /** The metric measured */
  metric: 'price_per_guest' | 'usage_frequency' | 'guest_satisfaction';
  /** Where this property's value falls — 0..100 */
  percentile: number;
  /** This property's own value */
  yourValue: number;
  /** Median across the comparison set */
  networkMedian: number;
  /** Sample size — properties contributing data */
  sampleSize: number;
  /** Comparison set descriptor — "luxury hotels in Northeast US, weddings 100-200 guests" */
  comparisonContext: string;
  /** Whether the sample size is large enough for confidence (>=20) */
  isStatisticallySignificant: boolean;
  /** ISO timestamp of latest update */
  updatedAt: string;
}

/**
 * A network-wide benchmark for the current menu, not a single item.
 * Includes price positioning, dietary coverage compared to peers, and
 * common pairings.
 */
export interface NetworkBenchmark {
  perGuestCostPercentile: number;
  /** Dietary coverage compared to network median (per-tag) */
  dietaryCoverageDelta: Record<string, number>;
  /** Items this property uses that peers also use frequently */
  commonPairings: Array<{
    pairId: MenuItemId;
    coOccurrenceRate: number; // 0..1
  }>;
  /** Items peers use that this property doesn't */
  commonGaps: Array<{
    itemId: MenuItemId;
    itemName: string;
    networkUsageRate: number;
  }>;
  comparisonContext: string;
  sampleSize: number;
  updatedAt: string;
}

// ============================================================================
// Workflow
// ============================================================================

/**
 * Menu publishing workflow stages. Each menu progresses through these
 * stages from initial draft to published artifact.
 */
export type WorkflowStage =
  | 'draft'
  | 'review'
  | 'approved'
  | 'published'
  | 'archived';

export interface WorkflowState {
  currentStage: WorkflowStage;
  /** Stages completed and when */
  history: Array<{
    stage: WorkflowStage;
    enteredAt: string;
    enteredBy: string;
    note?: string;
  }>;
  /** Required approvers for the next stage transition (if any) */
  pendingApprovers?: string[];
  /** Reviewers who've approved */
  approvals?: Array<{
    reviewer: string;
    approvedAt: string;
    note?: string;
  }>;
  /** Reviewers who've rejected (with reason) */
  rejections?: Array<{
    reviewer: string;
    rejectedAt: string;
    reason: string;
  }>;
}

/**
 * A stage transition request. Backed by the Decision Clearance Algorithm
 * (LUCCCA core) to validate gates.
 */
export interface StageTransitionRequest {
  fromStage: WorkflowStage;
  toStage: WorkflowStage;
  initiatedBy: string;
  note?: string;
}

export interface StageTransitionResult {
  success: boolean;
  newState?: WorkflowState;
  /** Reason if blocked */
  blockedReason?: string;
  /** Specific gates that failed */
  failedGates?: string[];
}

// ============================================================================
// Publishing
// ============================================================================

/**
 * A surface a published menu can render to. Each surface has its own
 * formatter (print, web, BEO).
 */
export type PublishSurface = 'print' | 'web' | 'beo' | 'guest_pdf' | 'kitchen_card';

export interface PublishedArtifact {
  surface: PublishSurface;
  /** Generated content URL or inline data */
  url?: string;
  /** Inline content for surfaces that don't need a URL */
  content?: string;
  contentType: string;
  generatedAt: string;
  /** Bytes — for downloadable artifacts */
  size?: number;
}

export interface PublishRequest {
  surfaces: PublishSurface[];
  /** Optional brand overlay override */
  brandOverlay?: BrandOverlay;
  /** Whether to generate fresh artifacts even if cached */
  forceRegenerate?: boolean;
}

export interface PublishResult {
  artifacts: PublishedArtifact[];
  publishedAt: string;
  publishedBy: string;
  errors?: Array<{
    surface: PublishSurface;
    error: string;
  }>;
}

// ============================================================================
// Helper re-exports for P5 services
// ============================================================================

export type { PropertyItem, MenuItemId, Money };
