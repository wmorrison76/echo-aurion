export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "receiver" | "chef" | "finance";
  outlet_ids: string[];
  current_outlet_id: string;
}
export interface Outlet {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  manager: string;
  status: "active" | "inactive";
}
export interface Delivery {
  id: string;
  outlet_id: string;
  invoice_number: string;
  vendor: string;
  status: "pending" | "in_transit" | "delivered" | "rejected";
  items_count: number;
  total_amount: number;
  invoice_date: string;
  delivery_date: string | null;
  created_at: string;
  updated_at: string;
}
export interface DeliveryItem {
  id: string;
  delivery_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  received_quantity?: number;
  status: "pending" | "received" | "rejected";
}
export interface PurchaseOrder {
  id: string;
  outlet_id: string;
  vendor: string;
  order_number: string;
  status: "draft" | "pending" | "confirmed" | "shipped" | "received";
  total_amount: number;
  items_count: number;
  created_at: string;
  updated_at: string;
}
export interface InventoryItem {
  id: string;
  outlet_id: string;
  product_name: string;
  sku: string;
  category: string;
  quantity: number;
  min_stock: number;
  max_stock: number;
  unit_price: number;
  unit_of_measure: string;
  last_counted_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface Vendor {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  payment_terms: string;
  status: "active" | "inactive";
}
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
export interface ApiError {
  message: string;
  status: number;
  code?: string;
}
export type NavParams = {
  OutletDetails: { outletId: string };
  InvoiceDetails: { deliveryId: string };
};
