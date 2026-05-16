/**
 * LUCCCA Inventory Framework - Core Type Definitions
 * 
 * These are the canonical types for inventory management across all modules
 * (P&R, Events, EchoRecipePro, Aurum, Pastry, Maestro)
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum TransactionType {
  RECEIPT = "RECEIPT",
  TRANSFER_OUT = "TRANSFER_OUT",
  TRANSFER_IN = "TRANSFER_IN",
  WASTE = "WASTE",
  PRODUCTION_OUT = "PRODUCTION_OUT",
  PRODUCTION_IN = "PRODUCTION_IN",
}

export enum WasteCategory {
  SPOILAGE = "spoilage",
  DAMAGE = "damage",
  THEFT = "theft",
  QUALITY = "quality",
  OTHER = "other",
}

export enum LocationType {
  CENTRAL_STOREROOM = "CENTRAL_STOREROOM",
  COMMISSARY = "COMMISSARY",
  PASTRY = "PASTRY",
  MAESTRO = "MAESTRO",
  MAIN_KITCHEN = "MAIN_KITCHEN",
  OUTLET = "OUTLET",
  POOL_BAR = "POOL_BAR",
  ROOM_SERVICE = "ROOM_SERVICE",
  BANQUET = "BANQUET",
  CUSTOM = "CUSTOM",
}

// ============================================================================
// CORE INVENTORY ENTITIES
// ============================================================================

/**
 * InventoryItem: Current stock level per product per location
 * This is the source of truth for "what do we have in stock right now"
 * Cost is stored as weighted average cost
 */
export interface InventoryItem {
  id: string; // UUID
  org_id: string; // Multi-tenant isolation
  product_id: string; // Foreign key to products table
  location_id: string; // Foreign key to locations table
  on_hand_qty: number; // Current quantity (decimals for items like wine bottles)
  base_uom: string; // Unit of measure (EA, KG, L, etc.)
  avg_cost: number; // Weighted average cost per unit
  is_active: boolean; // Soft delete flag
  last_receipt_at: string | null; // ISO timestamp of last receipt
  last_count_at: string | null; // ISO timestamp of last physical count
  // Purchasing & Receiving fields
  vendor_id?: string; // Primary vendor for this item (optional)
  catalog_item_id?: string; // Link to vendor catalog item (optional)
  par_level?: number; // Target inventory level for reordering
  reorder_qty?: number; // Standard quantity to order
  last_ordered_at?: string | null; // ISO timestamp of last order
  last_received_at?: string | null; // ISO timestamp of last delivery
  lead_time_days?: number; // Expected days to receive from vendor
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * InventoryTransaction: Immutable audit log entry
 * Every movement, receipt, waste, transfer is recorded here
 * This enables full traceability and compliance
 */
export interface InventoryTransaction {
  id: string; // UUID
  org_id: string; // Multi-tenant isolation
  type: TransactionType; // What kind of movement?
  product_id: string; // Which product?
  from_location_id: string | null; // For transfers: where from?
  to_location_id: string | null; // For transfers: where to?
  location_id: string; // Primary location (for non-transfer transactions)
  qty: number; // Quantity moved (signed: positive for IN, negative for OUT)
  unit_cost: number; // Cost at time of transaction
  total_cost: number; // qty * unit_cost (for reporting)
  waste_category?: WasteCategory; // If type=WASTE, what kind?
  waste_reason?: string; // Why was this wasted?
  occurred_at: string; // ISO timestamp of transaction
  source_module: string; // Which module created this? (PR, Events, EchoRecipePro, etc.)
  source_ref?: string; // Reference ID from source (e.g., invoice_id, event_id, po_id)
  // Purchasing & Receiving specific fields
  po_id?: string; // Purchase order ID if from purchasing
  po_line_id?: string; // Purchase order line ID
  receipt_id?: string; // Receiving/delivery receipt ID
  vendor_id?: string; // Vendor if from purchase
  lot_number?: string; // Product lot/batch number
  expiration_date?: string | null; // Expiration date of received items
  created_by_user_id: string | null; // Who created this transaction?
  created_at: string; // ISO timestamp
}

/**
 * WeightedAverageCost: Helper for cost calculations
 * Used internally by inventory-service to compute new avg cost
 */
export interface WeightedAverageCost {
  existingQty: number;
  existingCost: number;
  newQty: number;
  newCost: number;
  resultingQty: number;
  resultingCost: number;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Receipt: Add inventory from purchase or production
 */
export interface ReceiptLine {
  product_id: string;
  location_id: string;
  qty: number; // Must be positive
  unit_cost: number; // Cost per unit
  source_ref?: string; // e.g., invoice_id, PO_id
  // Purchasing & Receiving specific fields
  po_id?: string; // Purchase order ID
  po_line_id?: string; // Purchase order line ID
  lot_number?: string; // Product lot number
  expiration_date?: string; // ISO date
  received_condition?: string; // good, damaged, missing, etc.
  vendor_id?: string; // Which vendor supplied this
}

export interface InventoryReceiptRequest {
  lines: ReceiptLine[];
  user_id?: string;
  notes?: string;
}

export interface InventoryReceiptResponse {
  success: boolean;
  transaction_ids: string[]; // IDs of created transactions
  items_created: number; // How many inventory_items were created/updated
  items_updated: number;
  total_qty_received: number;
  total_cost: number;
}

/**
 * Transfer: Move inventory between locations
 */
export interface TransferLine {
  product_id: string;
  from_location_id: string;
  to_location_id: string;
  qty: number; // Must be positive
}

export interface InventoryTransferRequest {
  lines: TransferLine[];
  user_id?: string;
  notes?: string;
}

export interface InventoryTransferResponse {
  success: boolean;
  transfer_ids: string[]; // Array of transaction IDs (2 per line: OUT and IN)
  lines_processed: number;
  total_qty_transferred: number;
}

/**
 * Waste: Log inventory loss/disposal
 */
export interface WasteLine {
  product_id: string;
  location_id: string;
  qty: number; // Must be positive (we negate it internally)
  category: WasteCategory;
  reason?: string;
}

export interface InventoryWasteRequest {
  lines: WasteLine[];
  user_id?: string;
  batch_reason?: string; // Common reason for batch waste (e.g., "End of day spoilage check")
}

export interface InventoryWasteResponse {
  success: boolean;
  transaction_ids: string[]; // IDs of waste transactions
  lines_processed: number;
  total_qty_wasted: number;
  total_cost_impact: number; // Negative value (cost of wasted items)
}

/**
 * Snapshot: Current inventory view for a location or org
 */
export interface InventorySnapshot {
  items: InventoryItem[];
  total_qty: number;
  total_valuation: number; // Sum of (qty * avg_cost) for all items
  as_of: string; // ISO timestamp
}

/**
 * TransactionHistory: Query results for audit trail
 */
export interface TransactionHistoryQuery {
  org_id: string;
  product_id?: string;
  location_id?: string;
  from_location_id?: string;
  to_location_id?: string;
  transaction_type?: TransactionType;
  source_module?: string;
  date_from?: string; // ISO date
  date_to?: string; // ISO date
  limit?: number;
  offset?: number;
}

export interface TransactionHistoryResponse {
  transactions: InventoryTransaction[];
  total_count: number;
  limit: number;
  offset: number;
}

/**
 * Error Response: Standardized error shape for inventory API
 */
export interface InventoryErrorResponse {
  success: false;
  error: string;
  error_code: string;
  details?: Record<string, any>;
}
