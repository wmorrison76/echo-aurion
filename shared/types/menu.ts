/**
 * Menu domain types
 * Menu items, categories - extends base so you only add domain fields
 */
import {
  StandardEntity,
  Nameable,
  UUID,
  Money,
  Taggable
} from './base';

// ============================================================================
// MENU CORE TYPES
// ============================================================================

/**
 * Menu item - gets id, orgId, createdAt, updatedAt, createdBy, updatedBy,
 * name, description, tags from StandardEntity + Nameable + Taggable
 */
export interface MenuItem extends StandardEntity, Nameable, Taggable {
  price: Money;
  recipeId: UUID;
  categoryId: UUID;
  isAvailable: boolean;
}

/**
 * Menu category (e.g. Appetizers, Mains, Desserts)
 */
export interface MenuCategory extends StandardEntity, Nameable {
  sortOrder: number;
  isActive: boolean;
}
