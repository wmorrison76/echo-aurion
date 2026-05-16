/** * Invoice Management Types * Outlet-scoped invoice tracking with GL code categorization and image vault */ export type GLCodeCategory =

    | "FOOD"
    | "BEVERAGES"
    | "NON_FOOD"
    | "PAPER_SUPPLIES"
    | "EQUIPMENT"
    | "MAINTENANCE"
    | "UTILITIES"
    | "OTHER";
export interface GLCode {
  id: string;
  organization_id: string;
  code: string;
  description: string;
  category: GLCodeCategory;
  parent_code?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}
export interface Vendor {
  id: string;
  organization_id: string;
  name: string;
  vendor_code?: string;
  contact_email?: string;
  phone?: string;
  address?: string;
  punchout_enabled: boolean;
  punchout_url?: string;
  website?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}
export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  sku?: string;
  item_description: string;
  quantity: number;
  unit_of_measure?: string;
  unit_price: number;
  extended_price: number;
  gl_code?: string;
  gl_category?: GLCodeCategory;
  lot_number?: string;
  expiration_date?: string;
}
export interface Invoice {
  id: string;
  organization_id: string;
  outlet_id: string;
  vendor_id: string;
  invoice_number: string;
  invoice_date: string;
  received_date?: string;
  due_date?: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: "draft" | "received" | "reviewed" | "approved" | "paid";
  payment_method?: string;
  po_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}
export interface InvoiceImage {
  id: string;
  invoice_id: string;
  url: string;
  page_number?: number;
  uploaded_by?: string;
  uploaded_at: string;
  notes?: string;
}
export interface InvoiceSearchPreferences {
  user_id: string;
  outlet_id: string;
  recent_searches: {
    vendor_id?: string;
    gl_category?: GLCodeCategory;
    search_term?: string;
    timestamp: string;
  }[];
  last_updated: string;
}
export interface InvoiceMetrics {
  outlet_id: string;
  total_invoices: number;
  total_amount: number;
  by_vendor: Record<string, number>;
  by_category: Record<GLCodeCategory, number>;
}
