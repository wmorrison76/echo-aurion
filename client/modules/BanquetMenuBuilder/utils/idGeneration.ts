/**
 * ID Generation Utilities
 *
 * Property-stable, human-readable IDs for menu items, menus, drafts, etc.
 * Format: `{prefix}-{slug}-{shortRandom}`
 *   e.g. "dp1-burrata-caprese-7k2x"
 *
 * The prefix encodes property scope (e.g. dp1 = demo-property-001).
 * The slug makes IDs grep-friendly.
 * The short random suffix prevents collisions on duplicate names.
 */

import { randomBytes } from 'crypto';

/**
 * Property prefixes — keep stable. Adding new properties: add new prefix.
 */
export const PROPERTY_PREFIXES: Record<string, string> = {
  'demo-property-001': 'dp1',
  'ritz-carlton-fll': 'rcf',
  // Add more as needed
};

/**
 * Convert a string to a URL-safe slug.
 *   "Burrata Caprese" → "burrata-caprese"
 *   "Açaí Berry Bowl" → "acai-berry-bowl"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Decompose accents
    .replace(/[\u0300-\u036f]/g, '') // Strip accent marks
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Generate a short random suffix for collision avoidance.
 */
export function shortRandom(length = 4): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .substring(0, length);
}

/**
 * Generate a property-scoped item ID.
 *   generateItemId('demo-property-001', 'Burrata Caprese')
 *     → "dp1-burrata-caprese-a3f9"
 */
export function generateItemId(propertyId: string, name: string): string {
  const prefix = PROPERTY_PREFIXES[propertyId] ?? propertyId.substring(0, 4);
  const slug = slugify(name);
  const suffix = shortRandom(4);
  return `${prefix}-${slug}-${suffix}`;
}

/**
 * Deterministic item ID — same name + property always produces same ID.
 * Useful for seed scripts where re-running shouldn't create duplicates.
 */
export function deterministicItemId(propertyId: string, name: string): string {
  const prefix = PROPERTY_PREFIXES[propertyId] ?? propertyId.substring(0, 4);
  const slug = slugify(name);
  return `${prefix}-${slug}`;
}

/**
 * Generate a menu ID.
 *   generateMenuId('demo-property-001', 'Rehearsal Dinner')
 *     → "menu-dp1-rehearsal-dinner-7k2x"
 */
export function generateMenuId(propertyId: string, name: string): string {
  const prefix = PROPERTY_PREFIXES[propertyId] ?? propertyId.substring(0, 4);
  const slug = slugify(name);
  const suffix = shortRandom(4);
  return `menu-${prefix}-${slug}-${suffix}`;
}

/**
 * Generate a draft ID.
 */
export function generateDraftId(propertyId: string, source: 'echo' | 'human' | 'template'): string {
  const prefix = PROPERTY_PREFIXES[propertyId] ?? propertyId.substring(0, 4);
  const timestamp = Date.now().toString(36);
  const suffix = shortRandom(4);
  return `draft-${source}-${prefix}-${timestamp}-${suffix}`;
}

/**
 * Generate a UUID-style identifier (for entities not tied to a property).
 */
export function generateUuid(): string {
  // Simple UUIDv4-ish — for entities like MenuItemPlacement IDs
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
