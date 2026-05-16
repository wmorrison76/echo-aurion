/**
 * sectionDefaults.ts
 * ----------------------------------------------------------------------------
 * Default section structures keyed by event type. When the chef starts a
 * new menu, these are the sections pre-created so they're not staring at
 * a blank slate.
 *
 * These reflect 35 years of operator experience: a wedding starts with
 * cocktail hour and ends with dessert. A corporate breakfast doesn't need
 * a carving station. A buffet wants stations, not courses.
 *
 * Chefs CAN edit/add/remove sections after — these are just sensible
 * starting points, not constraints.
 * ----------------------------------------------------------------------------
 */

import type { MenuSection as MenuSectionType } from '../BanquetMenuBuilder.types';

export const DEFAULT_SECTIONS_BY_EVENT_TYPE: Record<string, MenuSectionType[]> = {
  // ----------------------------------------------------------------------
  // Plated meal events
  // ----------------------------------------------------------------------
  wedding: ['canape', 'appetizer', 'salad', 'entree', 'dessert'],
  rehearsal_dinner: ['cold', 'appetizer', 'entree', 'dessert'],
  plated_dinner: ['appetizer', 'soup', 'salad', 'entree', 'dessert'],
  plated_lunch: ['salad', 'entree', 'dessert'],
  plated_breakfast: ['bakery', 'hot', 'beverage'],

  // ----------------------------------------------------------------------
  // Buffet events
  // ----------------------------------------------------------------------
  buffet_dinner: ['cold', 'hot', 'carving', 'side', 'dessert'],
  buffet_lunch: ['cold', 'hot', 'side', 'dessert'],
  buffet_breakfast: ['bakery', 'cold', 'hot', 'beverage'],

  // ----------------------------------------------------------------------
  // Reception / cocktail
  // ----------------------------------------------------------------------
  cocktail_reception: ['canape', 'cold', 'hot', 'station'],
  reception: ['canape', 'cold', 'hot', 'station', 'dessert'],

  // ----------------------------------------------------------------------
  // Corporate
  // ----------------------------------------------------------------------
  corporate_breakfast: ['bakery', 'hot', 'beverage'],
  corporate_lunch: ['cold', 'hot', 'side', 'dessert'],
  corporate_gala: ['canape', 'appetizer', 'entree', 'dessert'],
  corporate_event: ['cold', 'hot', 'dessert'],

  // ----------------------------------------------------------------------
  // Stations / interactive
  // ----------------------------------------------------------------------
  action_stations: ['station', 'station', 'station', 'dessert'],
  food_truck_style: ['station', 'station', 'beverage'],

  // ----------------------------------------------------------------------
  // Fallback
  // ----------------------------------------------------------------------
  default: ['cold', 'hot', 'dessert'],
};

/**
 * Lookup section defaults safely with fallback.
 */
export function getDefaultSections(eventType: string): MenuSectionType[] {
  return (
    DEFAULT_SECTIONS_BY_EVENT_TYPE[eventType] ??
    DEFAULT_SECTIONS_BY_EVENT_TYPE.default
  );
}

/**
 * Suggest sections to ADD based on items present that don't have a home.
 * Used when chef drags an item that doesn't fit existing sections.
 */
export function suggestSectionForItem(
  itemCategory: string,
  existingSectionKinds: MenuSectionType[],
): MenuSectionType {
  // Map item categories to section kinds
  const map: Record<string, MenuSectionType> = {
    appetizer: 'appetizer',
    salad: 'salad',
    soup: 'soup',
    entree: 'entree',
    dessert: 'dessert',
    canape: 'canape',
    side: 'side',
    bakery: 'bakery',
    beverage: 'beverage',
    cold_app: 'cold',
    hot_app: 'hot',
    carving: 'carving',
    station: 'station',
  };
  const suggested = map[itemCategory.toLowerCase()] ?? 'other';
  // If the suggested section already exists, return it; otherwise still
  // return it so caller knows to create one.
  return suggested;
}
