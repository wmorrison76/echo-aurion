/**
 * data/templates/systemTemplates.ts
 * ----------------------------------------------------------------------------
 * The seed templates that ship with LUCCCA. Properties get these immediately
 * on install and can clone them into their own customized templates. This
 * is the "starter pantry" — broad coverage of common event types.
 *
 * Convention: system template ids prefix with `sys-`. Property-authored
 * templates use UUIDs.
 *
 * Item id references:
 *   The `suggestedItemIds` reference items in the property's library. Since
 *   each property has different items, system templates use SLOT
 *   placeholders that the application binding logic resolves at apply time.
 *
 *   Slot format: 'slot:<kind>' (e.g. 'slot:hot-canape', 'slot:plated-entree-meat')
 *   The template application service (templateBindingService) resolves
 *   slots to real PropertyItem ids by matching tags + dietary + cost band.
 * ----------------------------------------------------------------------------
 */

import type { MenuTemplate } from '../../BanquetMenuBuilder.p5.types';

const NOW = '2026-01-01T00:00:00.000Z';

export const SYSTEM_TEMPLATES: MenuTemplate[] = [
  // ---------------------------------------------------------------------------
  // Wedding — plated dinner, mid-luxury
  // ---------------------------------------------------------------------------
  {
    id: 'sys-wedding-plated-classic',
    name: 'Classic Plated Wedding',
    eventType: 'wedding',
    subtitle: 'Four-course plated dinner, traditional progression',
    category: 'wedding',
    styleTags: ['classic', 'plated', 'formal', 'traditional'],
    budgetBand: { low: 95, high: 175, currency: 'USD' },
    guestCountBand: { min: 80, max: 280 },
    sections: [
      {
        id: 'sec-1',
        kind: 'cocktail-canape',
        label: 'Cocktail Reception',
        suggestedItemIds: ['slot:cold-canape', 'slot:cold-canape', 'slot:hot-canape', 'slot:hot-canape'],
        itemCountTarget: { min: 4, max: 6 },
        notes: 'Pass for 45-60 minutes. Aim for 1 vegetarian + 1 GF in the lineup.',
      },
      {
        id: 'sec-2',
        kind: 'first-course',
        label: 'First Course',
        suggestedItemIds: ['slot:plated-salad-or-soup'],
        itemCountTarget: { min: 1, max: 1 },
        notes: 'Soup OR salad — alternating not recommended for plated service.',
      },
      {
        id: 'sec-3',
        kind: 'entree',
        label: 'Entree',
        suggestedItemIds: ['slot:plated-entree-meat', 'slot:plated-entree-fish', 'slot:plated-entree-veg'],
        itemCountTarget: { min: 2, max: 3 },
        notes: 'Three-protein duet is standard. The veg option must be a complete dish, not a side plate.',
      },
      {
        id: 'sec-4',
        kind: 'dessert',
        label: 'Dessert',
        suggestedItemIds: ['slot:plated-dessert'],
        itemCountTarget: { min: 1, max: 1 },
        notes: 'Coordinate with bakery if cake is provided.',
      },
    ],
    dietaryTargets: { vegetarian: 0.25, glutenFree: 0.2, dairyFree: 0.15 },
    source: 'system',
    createdAt: NOW,
    updatedAt: NOW,
    author: 'LUCCCA',
  },

  // ---------------------------------------------------------------------------
  // Wedding — station style, modern
  // ---------------------------------------------------------------------------
  {
    id: 'sys-wedding-stations-modern',
    name: 'Modern Station Wedding',
    eventType: 'wedding',
    subtitle: 'Interactive station-style reception, no seated dinner',
    category: 'wedding',
    styleTags: ['modern', 'station', 'interactive', 'casual-elevated'],
    budgetBand: { low: 110, high: 195, currency: 'USD' },
    guestCountBand: { min: 100, max: 350 },
    sections: [
      {
        id: 'sec-1',
        kind: 'canape',
        label: 'Welcome Bites',
        suggestedItemIds: ['slot:cold-canape', 'slot:hot-canape'],
        itemCountTarget: { min: 3, max: 4 },
      },
      {
        id: 'sec-2',
        kind: 'station',
        label: 'Action Stations',
        suggestedItemIds: ['slot:carving-station', 'slot:pasta-station', 'slot:raw-bar'],
        itemCountTarget: { min: 3, max: 5 },
        notes: 'Plan capacity: 1 station per 50 guests. Carving station for >150.',
      },
      {
        id: 'sec-3',
        kind: 'station',
        label: 'Cold Stations',
        suggestedItemIds: ['slot:cheese-charcuterie', 'slot:salad-station'],
        itemCountTarget: { min: 1, max: 2 },
      },
      {
        id: 'sec-4',
        kind: 'dessert',
        label: 'Sweet Stations',
        suggestedItemIds: ['slot:dessert-station'],
        itemCountTarget: { min: 1, max: 2 },
      },
    ],
    dietaryTargets: { vegetarian: 0.3, glutenFree: 0.25, vegan: 0.1 },
    source: 'system',
    createdAt: NOW,
    updatedAt: NOW,
    author: 'LUCCCA',
  },

  // ---------------------------------------------------------------------------
  // Corporate dinner — standard
  // ---------------------------------------------------------------------------
  {
    id: 'sys-corporate-plated-standard',
    name: 'Corporate Plated Dinner',
    eventType: 'corporate_event',
    subtitle: 'Three-course plated for boards, retreats, conferences',
    category: 'corporate',
    styleTags: ['plated', 'business', 'efficient'],
    budgetBand: { low: 65, high: 120, currency: 'USD' },
    guestCountBand: { min: 20, max: 150 },
    sections: [
      {
        id: 'sec-1',
        kind: 'first-course',
        label: 'First Course',
        suggestedItemIds: ['slot:plated-salad-or-soup'],
        itemCountTarget: { min: 1, max: 1 },
      },
      {
        id: 'sec-2',
        kind: 'entree',
        label: 'Entree',
        suggestedItemIds: ['slot:plated-entree-meat', 'slot:plated-entree-fish', 'slot:plated-entree-veg'],
        itemCountTarget: { min: 2, max: 3 },
        notes: 'Always include a vegetarian option — corporate guest dietary needs vary.',
      },
      {
        id: 'sec-3',
        kind: 'dessert',
        label: 'Dessert',
        suggestedItemIds: ['slot:plated-dessert'],
        itemCountTarget: { min: 1, max: 1 },
      },
    ],
    dietaryTargets: { vegetarian: 0.25, glutenFree: 0.2, dairyFree: 0.15 },
    source: 'system',
    createdAt: NOW,
    updatedAt: NOW,
    author: 'LUCCCA',
  },

  // ---------------------------------------------------------------------------
  // Cocktail reception
  // ---------------------------------------------------------------------------
  {
    id: 'sys-cocktail-reception',
    name: 'Cocktail Reception',
    eventType: 'cocktail_reception',
    subtitle: 'Standing reception, passed and stationary hors d\'oeuvres',
    category: 'cocktail',
    styleTags: ['standing', 'passed', 'reception'],
    budgetBand: { low: 55, high: 125, currency: 'USD' },
    guestCountBand: { min: 30, max: 250 },
    sections: [
      {
        id: 'sec-1',
        kind: 'canape',
        label: 'Passed Canapes',
        suggestedItemIds: [
          'slot:cold-canape',
          'slot:cold-canape',
          'slot:hot-canape',
          'slot:hot-canape',
          'slot:hot-canape',
        ],
        itemCountTarget: { min: 5, max: 8 },
        notes: 'Plan 6-8 pieces per guest for 90 minutes. 60/40 hot/cold ratio.',
      },
      {
        id: 'sec-2',
        kind: 'station',
        label: 'Stationary Display',
        suggestedItemIds: ['slot:cheese-charcuterie', 'slot:crudite-display'],
        itemCountTarget: { min: 1, max: 2 },
      },
      {
        id: 'sec-3',
        kind: 'sweets',
        label: 'Sweet Bites',
        suggestedItemIds: ['slot:mini-dessert', 'slot:mini-dessert'],
        itemCountTarget: { min: 2, max: 4 },
      },
    ],
    dietaryTargets: { vegetarian: 0.4, glutenFree: 0.3, dairyFree: 0.2 },
    source: 'system',
    createdAt: NOW,
    updatedAt: NOW,
    author: 'LUCCCA',
  },

  // ---------------------------------------------------------------------------
  // Gala dinner — luxury
  // ---------------------------------------------------------------------------
  {
    id: 'sys-gala-luxury',
    name: 'Luxury Gala Dinner',
    eventType: 'gala',
    subtitle: 'Five-course tasting menu, formal high-end',
    category: 'gala',
    styleTags: ['luxury', 'tasting', 'formal', 'multi-course'],
    budgetBand: { low: 195, high: 425, currency: 'USD' },
    guestCountBand: { min: 60, max: 400 },
    sections: [
      {
        id: 'sec-1',
        kind: 'amuse',
        label: 'Amuse-Bouche',
        suggestedItemIds: ['slot:amuse-bouche'],
        itemCountTarget: { min: 1, max: 1 },
      },
      {
        id: 'sec-2',
        kind: 'cold-course',
        label: 'Cold Course',
        suggestedItemIds: ['slot:plated-cold-course'],
        itemCountTarget: { min: 1, max: 1 },
      },
      {
        id: 'sec-3',
        kind: 'fish-course',
        label: 'Fish Course',
        suggestedItemIds: ['slot:plated-entree-fish'],
        itemCountTarget: { min: 1, max: 1 },
      },
      {
        id: 'sec-4',
        kind: 'main-course',
        label: 'Main Course',
        suggestedItemIds: ['slot:plated-entree-meat', 'slot:plated-entree-veg'],
        itemCountTarget: { min: 1, max: 2 },
      },
      {
        id: 'sec-5',
        kind: 'dessert',
        label: 'Dessert',
        suggestedItemIds: ['slot:plated-dessert'],
        itemCountTarget: { min: 1, max: 1 },
      },
      {
        id: 'sec-6',
        kind: 'mignardises',
        label: 'Mignardises',
        suggestedItemIds: ['slot:mini-dessert', 'slot:mini-dessert', 'slot:mini-dessert'],
        itemCountTarget: { min: 2, max: 4 },
        notes: 'Usually served with coffee.',
      },
    ],
    dietaryTargets: { vegetarian: 0.2, glutenFree: 0.2 },
    source: 'system',
    createdAt: NOW,
    updatedAt: NOW,
    author: 'LUCCCA',
  },

  // ---------------------------------------------------------------------------
  // Plated lunch — corporate / social
  // ---------------------------------------------------------------------------
  {
    id: 'sys-lunch-plated',
    name: 'Plated Lunch',
    eventType: 'corporate_event',
    subtitle: 'Two-course efficient luncheon',
    category: 'lunch',
    styleTags: ['plated', 'lunch', 'efficient'],
    budgetBand: { low: 35, high: 85, currency: 'USD' },
    guestCountBand: { min: 20, max: 200 },
    sections: [
      {
        id: 'sec-1',
        kind: 'entree',
        label: 'Entree',
        suggestedItemIds: ['slot:plated-entree-light', 'slot:plated-entree-veg'],
        itemCountTarget: { min: 2, max: 3 },
        notes: 'Lunches benefit from lighter proteins — chicken, fish, grain bowls.',
      },
      {
        id: 'sec-2',
        kind: 'dessert',
        label: 'Dessert',
        suggestedItemIds: ['slot:plated-dessert-light'],
        itemCountTarget: { min: 1, max: 1 },
      },
    ],
    dietaryTargets: { vegetarian: 0.3, glutenFree: 0.25, dairyFree: 0.15 },
    source: 'system',
    createdAt: NOW,
    updatedAt: NOW,
    author: 'LUCCCA',
  },
];

/**
 * Convenience lookup
 */
export function findSystemTemplate(id: string): MenuTemplate | undefined {
  return SYSTEM_TEMPLATES.find((t) => t.id === id);
}
