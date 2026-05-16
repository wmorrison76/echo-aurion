/**
 * Inventory domain types
 * Refactored to use base types (75% reduction in code)
 */
import {
  StandardEntity,
  Nameable,
  UUID,
  Money,
  ISODate,
  Taggable
} from './base';

/**
 * Physical inventory item
 */
export interface InventoryItem extends StandardEntity, Nameable, Taggable {
  sku: string;
  quantity: number;
  unit: string;
  cost: Money;
  supplierId: UUID;
  categoryId: UUID;
  locationId: UUID;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  lastOrdered?: ISODate;
  lastReceived?: ISODate;
}

/**
 * Storage location (kitchen, walk-in, dry storage, etc.)
 */
export interface InventoryLocation extends StandardEntity, Nameable {
  type: 'kitchen' | 'walk_in' | 'dry_storage' | 'bar' | 'prep' | 'other';
  capacity?: number;
  isActive: boolean;
}

/**
 * Inventory category (produce, meat, dairy, etc.)
 */
export interface InventoryCategory extends StandardEntity, Nameable {
  parentCategoryId?: UUID;
  sortOrder?: number;
  color?: string;
}

/**
 * Inventory transaction (receipt, consumption, transfer, adjustment)
 */
export interface InventoryTransaction extends StandardEntity {
  itemId: UUID;
  type: 'receipt' | 'consumption' | 'transfer' | 'adjustment' | 'waste';
  quantity: number;
  fromLocationId?: UUID;
  toLocationId?: UUID;
  referenceId?: UUID; // Link to PO, recipe, etc.
  referenceType?: string;
  reason?: string;
}

/**
 * Inventory count/audit
 */
export interface InventoryCount extends StandardEntity {
  locationId: UUID;
  scheduledDate: ISODate;
  completedDate?: ISODate;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  countedBy?: UUID;
  notes?: string;
}

/**
 * Individual item count during inventory audit
 */
export interface InventoryCountItem extends StandardEntity {
  countId: UUID;
  itemId: UUID;
  expectedQuantity: number;
  actualQuantity: number;
  variance: number;
  varianceValue: Money;
  notes?: string;
}
