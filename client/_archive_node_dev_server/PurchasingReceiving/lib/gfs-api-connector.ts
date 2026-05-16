import { supabase } from "./supabase";
import { logger } from "./logger";
import crypto from "crypto";
export interface GFSProduct {
  id: string;
  gfsItemNumber: string;
  name: string;
  category: string;
  description: string;
  unitPrice: number;
  unitOfMeasure: string;
  packaging: string;
  availability: "in_stock" | "limited" | "out_of_stock";
  leadTime: number;
}
export interface GFSOrder {
  id: string;
  organizationId: string;
  outletId: string;
  supplierId: string;
  gfsOrderNumber?: string;
  status:
    | "draft"
    | "submitted"
    | "confirmed"
    | "shipped"
    | "delivered"
    | "cancelled";
  items: Array<{ gfsItemNumber: string; quantity: number; unitPrice: number }>;
  totalAmount: number;
  submittedAt?: string;
  deliveryDate?: string;
  createdAt: string;
} /** * GFS API Connector * Integrates with Gordon Food Service (GFS) for catalog and ordering * MOCK IMPLEMENTATION - Replace with real GFS API calls once credentials are available */
export class GFSAPIConnector {
  private catalogCache: Map<string, GFSProduct[]> = new Map();
  private catalogCacheExpiry = 24 * 60 * 60 * 1000; // 24 hours private apiBaseUrl = 'https://api.gfsdeliver.com/v1'; // MOCK - to be replaced /** * Fetch GFS product catalog * MOCK: Returns sample data; replace with real API call */ async fetchCatalog(forceRefresh: boolean = false): Promise<GFSProduct[]> { try { const cacheKey = 'gfs_catalog'; if (!forceRefresh && this.catalogCache.has(cacheKey)) { return this.catalogCache.get(cacheKey)!; } // MOCK DATA - Replace with real GFS API call // Real implementation: const response = await fetch(`${this.apiBaseUrl}/products`, { ... }) const mockCatalog: GFSProduct[] = [ { id: crypto.randomUUID(), gfsItemNumber: 'GFS-BEEF-001', name: 'Beef Chuck Roast, USDA Prime', category: 'Meat & Seafood', description: 'Grade USDA Prime, case', unitPrice: 5.99, unitOfMeasure: 'LB', packaging: '25 lb box', availability: 'in_stock', leadTime: 1, }, { id: crypto.randomUUID(), gfsItemNumber: 'GFS-CHICKEN-001', name: 'Chicken Breast, Boneless Skinless', category: 'Meat & Seafood', description: 'Fresh, individually wrapped', unitPrice: 3.49, unitOfMeasure: 'LB', packaging: '10 lb case', availability: 'in_stock', leadTime: 1, }, { id: crypto.randomUUID(), gfsItemNumber: 'GFS-PRODUCE-001', name: 'Fresh Broccoli Crowns', category: 'Produce', description: 'Grade A, ready to cook', unitPrice: 2.99, unitOfMeasure: 'LB', packaging: '25 lb case', availability: 'in_stock', leadTime: 1, }, { id: crypto.randomUUID(), gfsItemNumber: 'GFS-DAIRY-001', name: 'Butter, Unsalted', category: 'Dairy & Cheese', description: 'Grade AA', unitPrice: 4.49, unitOfMeasure: 'LB', packaging: '5 lb case', availability: 'in_stock', leadTime: 1, }, ]; this.catalogCache.set(cacheKey, mockCatalog); logger.info('GFS catalog fetched', { itemCount: mockCatalog.length, cacheKey, note: 'MOCK DATA - Replace with real GFS API call', }); return mockCatalog; } catch (error) { logger.error('Error fetching GFS catalog', { error }); throw error; } } /** * Search GFS catalog */ async searchCatalog(query: string): Promise<GFSProduct[]> { try { const catalog = await this.fetchCatalog(); return catalog.filter( item => item.name.toLowerCase().includes(query.toLowerCase()) || item.gfsItemNumber.toLowerCase().includes(query.toLowerCase()) || item.category.toLowerCase().includes(query.toLowerCase()), ); } catch (error) { logger.error('Error searching GFS catalog', { query, error }); return []; } } /** * Submit order to GFS * MOCK: Save to database; replace with real GFS API call */ async submitOrder( organizationId: string, outletId: string, items: Array<{ gfsItemNumber: string; quantity: number; unitPrice: number; }>, deliveryDate: string, ): Promise<GFSOrder> { try { const orderId = crypto.randomUUID(); const now = new Date().toISOString(); const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0); // MOCK: Just save to database // Real implementation: const response = await fetch(`${this.apiBaseUrl}/orders`, { ... }) const gfsOrderNumber = `GFS-${Date.now()}`; // MOCK const { error } = await supabase .from('supplier_orders') .insert({ id: orderId, organization_id: organizationId, outlet_id: outletId, supplier_id: 'gfs', // GFS supplier ID status: 'submitted', supplier_order_number: gfsOrderNumber, total_amount: totalAmount, items, delivery_date: deliveryDate, submitted_at: now, created_at: now, }); if (error) { logger.error('Failed to save GFS order', { error }); throw error; } const order: GFSOrder = { id: orderId, organizationId, outletId, supplierId: 'gfs', gfsOrderNumber, status: 'submitted', items, totalAmount, submittedAt: now, deliveryDate, createdAt: now, }; logger.info('GFS order submitted', { orderId, gfsOrderNumber, itemCount: items.length, totalAmount, note: 'MOCK - Replace with real GFS API call', }); return order; } catch (error) { logger.error('Error submitting GFS order', { error }); throw error; } } /** * Get punchout URL for GFS * MOCK: Generate stub URL; replace with real cXML punchout service */ async getPunchoutURL(organizationId: string, userId: string): Promise<string> { try { // MOCK: Generate placeholder URL // Real implementation: Generate cXML punchout request and get URL from GFS const punchoutUrl = `https://www.gfsdeliver.com/cXML/punchout?orgId=${organizationId}&userId=${userId}&timestamp=${Date.now()}`; logger.info('GFS punchout URL generated (MOCK)', { organizationId, note: 'Replace with real GFS cXML punchout service', }); return punchoutUrl; } catch (error) { logger.error('Error generating GFS punchout URL', { error }); throw error; } } /** * Get order status from GFS * MOCK: Retrieve from local database */ async getOrderStatus(gfsOrderNumber: string): Promise<{ status: string; estimatedDelivery?: string; trackingInfo?: any; }> { try { // MOCK: Check local database // Real implementation: Query GFS API for actual order status const { data } = await supabase .from('supplier_orders') .select('*') .eq('supplier_order_number', gfsOrderNumber) .single(); if (!data) { throw new Error('Order not found'); } return { status: data.status, estimatedDelivery: data.delivery_date, trackingInfo: null, // MOCK - would include real GFS tracking }; } catch (error) { logger.error('Error getting GFS order status', { gfsOrderNumber, error }); throw error; } } /** * Sync pricing from GFS * MOCK: Store sample pricing */ async syncPricing(): Promise<void> { try { // MOCK: Fetch catalog and store pricing // Real implementation: Call GFS pricing API and update database const catalog = await this.fetchCatalog(true); logger.info('GFS pricing synced (MOCK)', { itemCount: catalog.length, note: 'Replace with real GFS pricing API call', }); } catch (error) { logger.error('Error syncing GFS pricing', { error }); throw error; } }
}
export const gfsAPIConnector = new GFSAPIConnector();
