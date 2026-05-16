/**
 * LUCCCA Inventory Framework - Product Type Definitions
 * 
 * Products are the items being tracked in inventory
 * Examples: Beef Tenderloin, Olive Oil, Red Wine, etc.
 */

export enum ProductCategory {
  PROTEINS = "proteins",
  VEGETABLES = "vegetables",
  GRAINS = "grains",
  DAIRY = "dairy",
  OILS_VINEGARS = "oils_vinegars",
  CONDIMENTS = "condiments",
  SPICES = "spices",
  BEVERAGES = "beverages",
  WINES = "wines",
  SPIRITS = "spirits",
  PRODUCE = "produce",
  FROZEN = "frozen",
  SUPPLIES = "supplies",
  OTHER = "other",
}

export enum ProductFamily {
  PANTRY = "pantry",
  PERISHABLE = "perishable",
  BEVERAGE = "beverage",
  WINE = "wine",
  SPIRITS = "spirits",
  SUPPLIES = "supplies",
}

/**
 * Product: Master data for inventory items
 * One product can exist in multiple locations (via InventoryItem)
 */
export interface Product {
  id: string; // UUID
  org_id: string; // Multi-tenant isolation
  name: string; // e.g., "Beef Tenderloin", "Extra Virgin Olive Oil"
  description?: string; // Optional detailed description
  category: ProductCategory; // For filtering and reporting
  family: ProductFamily; // For costing/P&L grouping
  base_uom: string; // Base unit of measure (EA, KG, L, OZ, etc.)
  par_qty?: number; // Suggested par level per location (informational)
  is_active: boolean; // Soft delete flag
  tags?: string[]; // For advanced filtering (e.g., "local", "organic", "seasonal")
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * ProductVariant: Future-proofing for variants (sizes, colors, etc.)
 * Currently minimal; can be expanded as needed
 */
export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string; // e.g., "12oz bottle", "1kg bag"
  variant_code?: string; // e.g., SKU
  conversion_factor: number; // How many base units does this variant contain?
  is_default: boolean;
}

/**
 * Vendor: Supplier information
 * Used for procurement suggestions and sourcing
 */
export interface Vendor {
  id: string;
  org_id: string;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  lead_time_days?: number; // How long to receive order?
  min_order_qty?: number; // Minimum order quantity
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * ProductVendor: Link products to vendors
 */
export interface ProductVendor {
  id: string;
  product_id: string;
  vendor_id: string;
  vendor_product_code?: string; // Vendor's SKU/code for this product
  vendor_price?: number; // Price per unit from this vendor
  is_preferred: boolean;
}
