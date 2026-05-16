import { supabase } from "./supabase";
import { logger } from "./logger";
import crypto from "crypto";
export interface RestaurantDepotProduct {
  id: string;
  itemNumber: string;
  name: string;
  category: string;
  unitPrice: number;
  unitOfMeasure: string;
  availability: "in_stock" | "limited" | "out_of_stock";
  supplier: "restaurant_depot";
}
export interface RestaurantDepotOrder {
  id: string;
  organizationId: string;
  outletId: string;
  orderNumber: string;
  status:
    | "draft"
    | "submitted"
    | "confirmed"
    | "shipped"
    | "delivered"
    | "cancelled";
  items: Array<{ itemNumber: string; quantity: number; unitPrice: number }>;
  totalAmount: number;
  submittedAt?: string;
  deliveryDate?: string;
  createdAt: string;
} /** * Restaurant Depot Connector * Integrates with Restaurant Depot for catalog and ordering * * Required environment variables: * - RESTAURANT_DEPOT_API_KEY: API key from Restaurant Depot * - RESTAURANT_DEPOT_BASE_URL: Base URL for Restaurant Depot API (default: https://api.restaurantdepot.com) * * Setup: * 1. Contact Restaurant Depot sales representative * 2. Request API access and credentials * 3. Set environment variables with provided credentials */
export class RestaurantDepotConnector {
  private apiKey = process.env.RESTAURANT_DEPOT_API_KEY || "";
  private baseUrl =
    process.env.RESTAURANT_DEPOT_BASE_URL ||
    "https://api.restaurantdepot.com/v1";
  private catalogCache: Map<string, RestaurantDepotProduct[]> = new Map();
  private catalogCacheExpiry = 24 * 60 * 60 * 1000; // 24 hours constructor() { this.validateConfig(); } private validateConfig(): void { if (!this.apiKey) { logger.warn('Restaurant Depot: API key is not configured', { configStatus: 'missing_api_key', }); } } /** * Fetch Restaurant Depot catalog */ async fetchCatalog(forceRefresh: boolean = false): Promise<RestaurantDepotProduct[]> { try { const cacheKey = 'rd_catalog'; if (!forceRefresh && this.catalogCache.has(cacheKey)) { return this.catalogCache.get(cacheKey)!; } if (!this.apiKey) { throw new Error('Restaurant Depot API key is not configured'); } const response = await fetch(`${this.baseUrl}/products/catalog`, { method: 'GET', headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json', }, }); if (!response.ok) { throw new Error(`Restaurant Depot API error: ${response.status}`); } const data = await response.json(); const catalog: RestaurantDepotProduct[] = data.products.map((item: any) => ({ id: crypto.randomUUID(), itemNumber: item.item_number || item.id, name: item.name, category: item.category, unitPrice: parseFloat(item.price), unitOfMeasure: item.uom || 'UNIT', availability: item.in_stock ? 'in_stock' : 'out_of_stock', supplier: 'restaurant_depot', })); this.catalogCache.set(cacheKey, catalog); logger.info('Restaurant Depot catalog fetched', { itemCount: catalog.length, }); return catalog; } catch (error) { logger.error('Error fetching Restaurant Depot catalog', { error: error instanceof Error ? error.message : 'Unknown error', }); throw error; } } /** * Search Restaurant Depot catalog */ async searchCatalog(query: string): Promise<RestaurantDepotProduct[]> { try { const catalog = await this.fetchCatalog(); return catalog.filter( item => item.name.toLowerCase().includes(query.toLowerCase()) || item.itemNumber.toLowerCase().includes(query.toLowerCase()) || item.category.toLowerCase().includes(query.toLowerCase()), ); } catch (error) { logger.error('Error searching Restaurant Depot catalog', { query, error: error instanceof Error ? error.message : 'Unknown error', }); return []; } } /** * Submit order to Restaurant Depot */ async submitOrder( organizationId: string, outletId: string, items: Array<{ itemNumber: string; quantity: number; unitPrice: number; }>, deliveryDate: string, ): Promise<RestaurantDepotOrder> { try { if (!this.apiKey) { throw new Error('Restaurant Depot API key is not configured'); } const orderId = crypto.randomUUID(); const now = new Date().toISOString(); const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0); const payload = { items: items.map(item => ({ item_number: item.itemNumber, quantity: item.quantity, unit_price: item.unitPrice, })), delivery_date: deliveryDate, organization_id: organizationId, outlet_id: outletId, }; const response = await fetch(`${this.baseUrl}/orders`, { method: 'POST', headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json', }, body: JSON.stringify(payload), }); if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error( errorData.message || `Restaurant Depot API error: ${response.status}`, ); } const responseData = await response.json(); const orderNumber = responseData.order_number; // Store order in database const { error: dbError } = await supabase .from('supplier_orders') .insert({ id: orderId, organization_id: organizationId, outlet_id: outletId, supplier_id: 'restaurant_depot', status: 'submitted', supplier_order_number: orderNumber, total_amount: totalAmount, items, delivery_date: deliveryDate, submitted_at: now, created_at: now, }); if (dbError) { throw dbError; } const order: RestaurantDepotOrder = { id: orderId, organizationId, outletId, orderNumber, status: 'submitted', items, totalAmount, submittedAt: now, deliveryDate, createdAt: now, }; logger.info('Order submitted to Restaurant Depot', { orderId, orderNumber, itemCount: items.length, totalAmount, }); return order; } catch (error) { logger.error('Error submitting order to Restaurant Depot', { organizationId, outletId, error: error instanceof Error ? error.message : 'Unknown error', }); throw error; } } /** * Get order status from Restaurant Depot */ async getOrderStatus(orderNumber: string): Promise<{ status: string; estimatedDelivery?: string; trackingInfo?: any; }> { try { if (!this.apiKey) { throw new Error('Restaurant Depot API key is not configured'); } const response = await fetch(`${this.baseUrl}/orders/${orderNumber}/status`, { method: 'GET', headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json', }, }); if (!response.ok) { throw new Error(`Restaurant Depot API error: ${response.status}`); } const data = await response.json(); return { status: data.status, estimatedDelivery: data.estimated_delivery, trackingInfo: data.tracking_info || null, }; } catch (error) { logger.error('Error getting order status from Restaurant Depot', { orderNumber, error: error instanceof Error ? error.message : 'Unknown error', }); throw error; } } /** * Cancel order */ async cancelOrder(orderNumber: string): Promise<void> { try { if (!this.apiKey) { throw new Error('Restaurant Depot API key is not configured'); } const response = await fetch(`${this.baseUrl}/orders/${orderNumber}/cancel`, { method: 'POST', headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json', }, }); if (!response.ok) { throw new Error(`Restaurant Depot API error: ${response.status}`); } logger.info('Order cancelled on Restaurant Depot', { orderNumber, }); } catch (error) { logger.error('Error cancelling order on Restaurant Depot', { orderNumber, error: error instanceof Error ? error.message : 'Unknown error', }); throw error; } }
}
export const restaurantDepotConnector = new RestaurantDepotConnector();
