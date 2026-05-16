/**
 * Banquet Menu Builder — Constants
 *
 * Enums, role IDs, dietary tag definitions, and other constants used
 * across the module. Centralized here so they don't drift across files.
 */

// =====================================================
// Roles permitted to use the module
// =====================================================
export const BANQUET_MODULE_ROLES = [
  'executive-chef-banquets',
  'banquet-sales',
  'marketing-executive',
  'marketing-sales',
  'senior-art-media-director',
] as const;

export type BanquetModuleRole = typeof BANQUET_MODULE_ROLES[number];

// Role permissions — what each role can do
export const ROLE_PERMISSIONS: Record<BanquetModuleRole, {
  canEditItems: boolean;
  canEditPricing: boolean;
  canComposeMenus: boolean;
  canApproveMenus: boolean;
  canEditTemplates: boolean;
  canPublishMarketing: boolean;
  canViewNetworkIntelligence: boolean;
}> = {
  'executive-chef-banquets': {
    canEditItems: true,
    canEditPricing: true,
    canComposeMenus: true,
    canApproveMenus: true,
    canEditTemplates: false,
    canPublishMarketing: false,
    canViewNetworkIntelligence: true,
  },
  'banquet-sales': {
    canEditItems: false,
    canEditPricing: false,
    canComposeMenus: true,
    canApproveMenus: false,
    canEditTemplates: false,
    canPublishMarketing: false,
    canViewNetworkIntelligence: true,
  },
  'marketing-executive': {
    canEditItems: false,
    canEditPricing: false,
    canComposeMenus: false,
    canApproveMenus: false,
    canEditTemplates: false,
    canPublishMarketing: true,
    canViewNetworkIntelligence: true,
  },
  'marketing-sales': {
    canEditItems: false,
    canEditPricing: false,
    canComposeMenus: false,
    canApproveMenus: false,
    canEditTemplates: false,
    canPublishMarketing: true,
    canViewNetworkIntelligence: false,
  },
  'senior-art-media-director': {
    canEditItems: false,
    canEditPricing: false,
    canComposeMenus: false,
    canApproveMenus: false,
    canEditTemplates: true,
    canPublishMarketing: true,
    canViewNetworkIntelligence: false,
  },
};

// =====================================================
// MongoDB Collection Names
// =====================================================
export const COLLECTIONS = {
  PROPERTY_ITEMS: 'property_items',
  NETWORK_ITEMS: 'network_items',
  NETWORK_INTELLIGENCE: 'network_intelligence',
  MENUS: 'menus',
  MENU_DRAFTS: 'menu_drafts',
  ECHO_AUDIT: 'echo_audit',
} as const;

// =====================================================
// Dietary Tags (display layer — used on menus)
// =====================================================
export const DIETARY_TAGS = {
  D: { label: 'Dairy', description: 'Contains dairy' },
  G: { label: 'Gluten', description: 'Contains gluten' },
  N: { label: 'Nuts', description: 'Contains nuts' },
  S: { label: 'Shellfish', description: 'Contains shellfish' },
  VE: { label: 'Vegan', description: 'Vegan' },
  VG: { label: 'Vegetarian', description: 'Vegetarian' },
} as const;

export type DietaryTag = keyof typeof DIETARY_TAGS;

export const ALL_DIETARY_TAGS: DietaryTag[] = Object.keys(DIETARY_TAGS) as DietaryTag[];

// =====================================================
// Allergens (granular kitchen layer — FDA Big-9 + extended)
// =====================================================
export const ALLERGENS = [
  'milk',
  'eggs',
  'fish',
  'shellfish',
  'treeNuts',
  'peanuts',
  'wheat',
  'soy',
  'sesame',
  'sulfites',
] as const;

export type Allergen = typeof ALLERGENS[number];

// =====================================================
// Diet Compatibility (for filter searches)
// =====================================================
export const DIET_COMPATIBILITIES = [
  'vegan',
  'vegetarian',
  'pescatarian',
  'glutenFree',
  'dairyFree',
  'keto',
  'paleo',
  'lowFodmap',
] as const;

export type DietCompatibility = typeof DIET_COMPATIBILITIES[number];

// =====================================================
// Item Categories
// =====================================================
export const ITEM_CATEGORIES = [
  'bakery',
  'cold-selection',
  'hot-selection',
  'soup',
  'salad',
  'hors-doeuvre',
  'entree',
  'station-component',
  'carving',
  'enhancement',
  'dessert',
  'beverage',
  'sushi',
  'raw-bar',
] as const;

export type ItemCategory = typeof ITEM_CATEGORIES[number];

// Display labels for categories
export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  'bakery': 'Bakery',
  'cold-selection': 'Cold Selection',
  'hot-selection': 'Hot Selection',
  'soup': 'Soup',
  'salad': 'Salad',
  'hors-doeuvre': 'Hors d\'Oeuvres',
  'entree': 'Entrée',
  'station-component': 'Station',
  'carving': 'Carving',
  'enhancement': 'Enhancement',
  'dessert': 'Dessert',
  'beverage': 'Beverage',
  'sushi': 'Sushi & Sashimi',
  'raw-bar': 'Raw Bar',
};

// =====================================================
// Menu Types
// =====================================================
export const MENU_TYPES = [
  'breakfast',
  'brunch',
  'lunch',
  'reception',
  'dinner',
  'break',
  'beverage-package',
  'specialty',
] as const;

export type MenuType = typeof MENU_TYPES[number];

// =====================================================
// Service Styles
// =====================================================
export const SERVICE_STYLES = [
  'plated',
  'plated-with-shared-apps',
  'buffet',
  'station',
  'family-style',
  'butler-passed',
  'grab-and-go',
  'seated-service',
] as const;

export type ServiceStyle = typeof SERVICE_STYLES[number];

// =====================================================
// Workflow Stages
// =====================================================
export const WORKFLOW_STAGES = [
  'chef-draft',
  'sales-review',
  'art-review',
  'client-review',
  'approved',
  'published',
  'archived',
] as const;

export type WorkflowStage = typeof WORKFLOW_STAGES[number];

// =====================================================
// Pricing Models
// =====================================================
export const PRICING_KINDS = [
  'per-guest',
  'per-dozen',
  'per-piece',
  'per-gallon',
  'per-bottle',
  'per-drink',
  'flat-fee',
  'market-price',
  'package-tier',
  'add-on',
] as const;

export type PricingKind = typeof PRICING_KINDS[number];

// =====================================================
// Selection Rules (for menu sections)
// =====================================================
export const SELECTION_RULE_KINDS = [
  'select-all',
  'select-n',
  'select-range',
  'select-by-category',
  'pre-assigned',
] as const;

export type SelectionRuleKind = typeof SELECTION_RULE_KINDS[number];

// =====================================================
// Module Identity
// =====================================================
export const MODULE_ID = 'banquet-menu-builder';
export const MODULE_DISPLAY_NAME = 'Banquet Menu Builder';
export const MODULE_VERSION = '0.1.0-package-1';
