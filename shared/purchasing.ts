/**
 * Purchasing & Receiving Module - Type Definitions
 * Core types for purchase orders, vendors, catalogs, and related entities
 */

/**
 * Vendor information
 */
export interface Vendor {
  id: string; // UUID
  org_id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  website?: string;
  payment_terms?: string; // e.g., "Net 30"
  lead_time_days?: number; // Days to deliver
  min_order_amount?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Product in vendor catalog
 */
export interface VendorCatalogItem {
  id: string; // UUID
  vendor_id: string;
  product_id: string;
  sku: string; // Vendor's SKU
  vendor_name: string; // Vendor's product name
  unit_price: number;
  currency: string;
  unit_of_measure: string; // e.g., "case", "lb", "each"
  minimum_order_qty: number;
  moq_unit?: string; // Minimum order quantity unit
  case_size?: number; // Units per case
  pack_size?: string;
  is_available: boolean;
  last_price_update: string;
  created_at: string;
  updated_at: string;
}

/**
 * Purchase order
 */
export interface PurchaseOrder {
  id: string; // UUID
  org_id: string;
  po_number: string; // Human-readable PO number
  vendor_id: string;
  order_date: string; // ISO 8601
  expected_delivery_date: string;
  status: "draft" | "submitted" | "confirmed" | "received" | "cancelled";
  total_amount: number;
  currency: string;
  notes?: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Single line item in a purchase order
 */
export interface PurchaseOrderLine {
  id: string; // UUID
  po_id: string;
  product_id: string;
  catalog_item_id?: string;
  vendor_catalog_item_id?: string;
  quantity: number;
  unit_of_measure: string;
  unit_price: number;
  line_total: number;
  received_qty: number;
  received_uom?: string;
  conversion_factor?: number; // For unit conversion (e.g., cases to units)
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Delivery/Receipt record
 */
export interface Receipt {
  id: string; // UUID
  org_id: string;
  po_id: string;
  receipt_date: string; // ISO 8601
  status: "pending" | "partial" | "complete" | "discrepancy";
  total_items: number;
  created_at: string;
  updated_at: string;
}

/**
 * Single item received
 */
export interface ReceiptLineItem {
  id: string; // UUID
  receipt_id: string;
  po_line_id: string;
  quantity_received: number;
  unit_of_measure: string;
  lot_number?: string;
  expiration_date?: string;
  condition: "good" | "damaged" | "missing" | "expired";
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Invoice from vendor
 */
export interface VendorInvoice {
  id: string; // UUID
  org_id: string;
  vendor_id: string;
  invoice_number: string;
  po_id?: string;
  receipt_id?: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  currency: string;
  status: "pending" | "received" | "matched" | "paid" | "disputed";
  file_url?: string; // URL to PDF or scanned invoice
  ocr_data?: Record<string, any>; // Extracted data from OCR
  three_way_match_status?: "pending" | "matched" | "unmatched";
  created_at: string;
  updated_at: string;
}

/**
 * Invoice line item
 */
export interface InvoiceLineItem {
  id: string; // UUID
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  po_line_id?: string; // Link to PO line if matched
  matched: boolean;
  created_at: string;
}

/**
 * Discount or adjustment on invoice
 */
export interface InvoiceAdjustment {
  id: string; // UUID
  invoice_id: string;
  type: "discount" | "tax" | "shipping" | "other";
  description: string;
  amount: number;
  percentage?: number;
  created_at: string;
}

/**
 * Purchase order guide/standard order template
 */
export interface OrderGuide {
  id: string; // UUID
  org_id: string;
  name: string;
  vendor_id?: string; // If tied to specific vendor
  category?: string;
  items: OrderGuideItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Item in order guide
 */
export interface OrderGuideItem {
  id: string; // UUID
  guide_id: string;
  product_id: string;
  vendor_id?: string;
  catalog_item_id?: string;
  quantity: number;
  unit_of_measure: string;
  unit_price?: number;
  par_level?: number; // Target inventory level
  ordering_frequency?: "daily" | "weekly" | "biweekly" | "monthly";
  created_at: string;
}

/**
 * API Response for purchasing operations
 */
export interface PurchasingApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * Request to create/update purchase order
 */
export interface CreatePurchaseOrderRequest {
  vendor_id: string;
  order_date?: string;
  expected_delivery_date?: string;
  notes?: string;
  lines: {
    product_id: string;
    quantity: number;
    unit_of_measure: string;
    unit_price?: number;
  }[];
}

/**
 * Request to record receipt
 */
export interface RecordReceiptRequest {
  po_id: string;
  receipt_date?: string;
  items: {
    po_line_id: string;
    quantity_received: number;
    unit_of_measure: string;
    condition?: "good" | "damaged" | "missing" | "expired";
    lot_number?: string;
    expiration_date?: string;
    notes?: string;
  }[];
}
