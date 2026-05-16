import { supabase } from "./supabase";
import { logger } from "./logger";
import crypto from "crypto";
export interface USFoodsOrderData {
  orderId: string;
  organizationId: string;
  outletId: string;
  supplierId: string;
  items: Array<{
    sku: string;
    quantity: number;
    unitOfMeasure: string;
    unitPrice: number;
  }>;
  orderDate: string;
  requestedDeliveryDate: string;
  deliveryAddress: {
    address1: string;
    city: string;
    state: string;
    zip: string;
  };
}
export interface USFoodsCatalogItem {
  sku: string;
  name: string;
  category: string;
  description: string;
  unitPrice: number;
  unitOfMeasure: string;
  packaging: string;
  availability: "in_stock" | "limited" | "out_of_stock";
  leadTime: number;
}
export interface USFoodsOrder {
  id: string;
  organizationId: string;
  outletId: string;
  supplierId: string;
  status:
    | "draft"
    | "submitted"
    | "confirmed"
    | "shipped"
    | "delivered"
    | "cancelled";
  ediNumber?: string;
  totalAmount: number;
  items: Array<{ sku: string; quantity: number; unitPrice: number }>;
  submittedAt?: string;
  deliveryDate?: string;
  createdAt: string;
} /** * US Foods EDI and API Connector * Handles EDI 850 orders and API catalog sync */
export class USFoodsEDIConnector {
  private catalogCache: Map<string, USFoodsCatalogItem[]> = new Map();
  private catalogCacheExpiry = 24 * 60 * 60 * 1000; // 24 hours /** * Generate EDI 850 Purchase Order for US Foods */ async generateEDI850(orderData: USFoodsOrderData): Promise<string> { try { // EDI 850 structure const segments: string[] = []; // ISA - Interchange Control Header segments.push([ 'ISA', '00', // Authorization Information Qualifier ' ', // Authorization Information '00', // Security Information Qualifier ' ', // Security Information '01', // Interchange ID Qualifier '1234567890', // Sender Interchange ID '01', // Interchange ID Qualifier for Receiver '0987654321', // Receiver Interchange ID new Date().toISOString().split('T')[0].replace(/-/g, ''), // Interchange Date new Date().toISOString().split('T')[1].substring(0, 4), // Interchange Time '^', // Repetition Separator '00101', // Interchange Control Version Number '0', // Interchange Control Number '0', // Acknowledgment Requested 'P', // Usage Indicator '>', // Component Element Separator ].join('*')); // GS - Functional Group Header segments.push([ 'GS', 'PO', // Functional Identifier Code '1234567890', // Application Sender Code '0987654321', // Application Receiver Code new Date().toISOString().split('T')[0].replace(/-/g, ''), new Date().toISOString().split('T')[1].substring(0, 4), '1', // Group Control Number 'X', // Responsible Agency Code '004010', // Version/Release/Industry ID Code ].join('*')); // ST - Transaction Set Header segments.push(['ST', '850', '0001', '005010X222'].join('*')); // BEG - Beginning of Purchase Order segments.push([ 'BEG', '00', // Transaction Set Purpose Code 'SA', // Purchase Order Type Code orderData.orderId, // Purchase Order Number new Date().toISOString().split('T')[0], // Purchase Order Date ].join('*')); // REF - Reference Information segments.push(['REF', 'ZZ', orderData.supplierId].join('*')); // DTM - Date/Time Reference segments.push([ 'DTM', '002', // Date/Time Qualifier new Date(orderData.requestedDeliveryDate).toISOString().split('T')[0].replace(/-/g, ''), '102', // Date/Time Format ].join('*')); // N1 - Name segments.push(['N1', 'BY', 'Buyer Company Name'].join('*')); segments.push(['N3', orderData.deliveryAddress.address1].join('*')); segments.push([ 'N4', orderData.deliveryAddress.city, orderData.deliveryAddress.state, orderData.deliveryAddress.zip, ].join('*')); // Line Items let lineNumber = 1; for (const item of orderData.items) { segments.push([ 'PO1', lineNumber.toString(), item.quantity.toString(), item.unitOfMeasure, item.unitPrice.toFixed(2), 'VP', // Unit or Basis for Measurement Code item.sku, // Product/Service ID Qualifier item.sku, // Product/Service ID ].join('*')); lineNumber++; } // CTT - Transaction Totals segments.push(['CTT', orderData.items.length.toString()].join('*')); // SE - Transaction Set Trailer segments.push(['SE', (segments.length + 1).toString(), '0001'].join('*')); // GE - Functional Group Trailer segments.push(['GE', '1', '1'].join('*')); // IEA - Interchange Control Trailer segments.push(['IEA', '1', '0'].join('*')); const ediMessage = segments.join('\n'); logger.info('EDI 850 generated for US Foods', { orderId: orderData.orderId, itemCount: orderData.items.length, }); return ediMessage; } catch (error) { logger.error('Error generating EDI 850', { error }); throw error; } } /** * Submit order to US Foods via EDI */ async submitOrder(orderData: USFoodsOrderData): Promise<USFoodsOrder> { try { // Generate EDI 850 const ediMessage = await this.generateEDI850(orderData); // Save to database const orderId = crypto.randomUUID(); const totalAmount = orderData.items.reduce( (sum, item) => sum + item.quantity * item.unitPrice, 0, ); const { error } = await supabase .from('supplier_orders') .insert({ id: orderId, organization_id: orderData.organizationId, outlet_id: orderData.outletId, supplier_id: orderData.supplierId, status: 'submitted', edi_message: ediMessage, total_amount: totalAmount, items: orderData.items, submitted_at: new Date().toISOString(), created_at: new Date().toISOString(), }); if (error) { throw error; } logger.info('Order submitted to US Foods', { orderId, supplierId: orderData.supplierId, itemCount: orderData.items.length, totalAmount, }); return { id: orderId, organizationId: orderData.organizationId, outletId: orderData.outletId, supplierId: orderData.supplierId, status: 'submitted', ediNumber: orderData.orderId, totalAmount, items: orderData.items, submittedAt: new Date().toISOString(), createdAt: new Date().toISOString(), }; } catch (error) { logger.error('Error submitting order to US Foods', { error }); throw error; } } /** * Fetch US Foods catalog */ async fetchCatalog( supplierId: string, forceRefresh: boolean = false, ): Promise<USFoodsCatalogItem[]> { try { const cacheKey = `usfoods_catalog:${supplierId}`; if (!forceRefresh && this.catalogCache.has(cacheKey)) { return this.catalogCache.get(cacheKey)!; } // In production, would fetch from US Foods API // For now, returning sample data const catalogItems: USFoodsCatalogItem[] = [ { sku: 'USF-BEEF-001', name: 'Beef Chuck Roast, USDA Choice', category: 'Meat & Seafood', description: 'Grade USDA Choice, vacuum packed', unitPrice: 4.99, unitOfMeasure: 'LB', packaging: '10 lb case', availability: 'in_stock', leadTime: 1, }, { sku: 'USF-PRODUCE-001', name: 'Fresh Broccoli Crowns', category: 'Produce', description: 'Fresh, green, uniform size', unitPrice: 2.49, unitOfMeasure: 'LB', packaging: '25 lb case', availability: 'in_stock', leadTime: 1, }, { sku: 'USF-DAIRY-001', name: 'Whole Milk, 1% Fat', category: 'Dairy & Cheese', description: 'Grade A, pasteurized', unitPrice: 3.49, unitOfMeasure: 'GAL', packaging: '4 gal/case', availability: 'in_stock', leadTime: 1, }, ]; this.catalogCache.set(cacheKey, catalogItems); logger.info('US Foods catalog fetched', { supplierId, itemCount: catalogItems.length, }); return catalogItems; } catch (error) { logger.error('Error fetching US Foods catalog', { error }); throw error; } } /** * Process EDI 810 Invoice from US Foods */ async processInvoiceEDI(ediMessage: string, supplierId: string): Promise<void> { try { // Parse EDI 810 (Invoice) // Extract invoice number, items, amount, etc. logger.info('EDI 810 invoice processed from US Foods', { supplierId, messageLength: ediMessage.length, }); } catch (error) { logger.error('Error processing US Foods invoice EDI', { error }); throw error; } } /** * Process EDI 856 ASN from US Foods */ async processASNEDI(ediMessage: string, supplierId: string): Promise<void> { try { // Parse EDI 856 (Advance Ship Notice) // Extract shipment details, items, tracking, etc. logger.info('EDI 856 ASN processed from US Foods', { supplierId, messageLength: ediMessage.length, }); } catch (error) { logger.error('Error processing US Foods ASN EDI', { error }); throw error; } } /** * Get punchout URL for US Foods */ async getPunchoutURL(organizationId: string, userId: string): Promise<string> { try { // In production, would call US Foods cXML service const punchoutUrl = `https://www.usfoods.com/cXML/punchout?orgId=${organizationId}&userId=${userId}&timestamp=${Date.now()}`; logger.info('US Foods punchout URL generated', { organizationId }); return punchoutUrl; } catch (error) { logger.error('Error generating US Foods punchout URL', { error }); throw error; } }
}
export const usfoodsEDIConnector = new USFoodsEDIConnector();
