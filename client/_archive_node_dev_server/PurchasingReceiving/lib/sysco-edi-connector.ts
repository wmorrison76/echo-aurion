import { supabase } from "./supabase";
import { logger } from "./logger";
import crypto from "crypto";
export interface EDIMessage {
  id: string;
  organizationId: string;
  supplierId: string;
  messageType: "PO" | "INVOICE" | "ASN"; // 850, 810, 856 direction: 'outbound' | 'inbound'; poNumber?: string; invoiceNumber?: string; asnNumber?: string; content: string; status: 'pending' | 'sent' | 'received' | 'error'; errorMessage?: string; sentAt?: string; receivedAt?: string; createdAt: string;
}
export interface EDIPOHeader {
  poNumber: string;
  orderDate: string;
  shipToId: string;
  billToId: string;
  deliveryDate: string;
  items: EDIPOLine[];
}
export interface EDIPOLine {
  lineNumber: number;
  itemCode: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
}
export interface EDIInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  poNumber: string;
  vendorCode: string;
  totalAmount: number;
  dueDate: string;
  items: EDIInvoiceLine[];
}
export interface EDIInvoiceLine {
  lineNumber: number;
  poLineNumber: number;
  itemCode: string;
  invoicedQuantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
}
export interface EDIAdvanceShipmentNotice {
  asnNumber: string;
  shipDate: string;
  expectedDeliveryDate: string;
  poNumber: string;
  carrier: string;
  trackingNumber?: string;
  items: EDIASNLine[];
}
export interface EDIASNLine {
  lineNumber: number;
  poLineNumber: number;
  itemCode: string;
  shippedQuantity: number;
  unit: string;
} /** * Sysco EDI 850/810/856 Connector * Handles PO submission (850), invoice receipt (810), and ASN receipt (856) */
class SyscoEDIConnector {
  private ediQueue: EDIMessage[] = [];
  private poMappings: Map<string, { poNumber: string; poDate: string }> =
    new Map(); // Sysco EDI Gateway Configuration private readonly SYSCO_EDI_CONFIG = { senderCode: 'ECHO_OPS', // Will be assigned by Sysco receiverCode: 'SYSCO_HQ', // Sysco's EDI ID appSenderCode: 'ECHO', appReceiverCode: 'SYSCO', }; async generateEDI850(poData: EDIPOHeader, organizationId: string): Promise<EDIMessage> { try { const messageId = crypto.randomUUID(); const now = new Date(); // Format EDI 850 (PO) const edi850 = this.buildEDI850(poData, messageId, now); const ediMessage: EDIMessage = { id: messageId, organizationId, supplierId: 'sysco', messageType: 'PO', direction: 'outbound', poNumber: poData.poNumber, content: edi850, status: 'pending', createdAt: now.toISOString(), }; // Save to database await this.saveEDIMessage(ediMessage); // Queue for transmission this.ediQueue.push(ediMessage); logger.info('EDI 850 generated', { poNumber: poData.poNumber, messageId }); return ediMessage; } catch (error) { logger.error('Error generating EDI 850', error); throw error; } } private buildEDI850( poData: EDIPOHeader, messageId: string, timestamp: Date, ): string { const lines: string[] = []; // ISA: Interchange Control Header lines.push( `ISA*00* *00* *01*${this.SYSCO_EDI_CONFIG.senderCode.padEnd(15)}*01*${this.SYSCO_EDI_CONFIG.receiverCode.padEnd(15)}*${timestamp.toISOString().slice(0, 10).replace(/-/g, '')}*${timestamp.toISOString().slice(11, 13)}${timestamp.toISOString().slice(14, 16)}*^*00101*000000001*0*P*~`, ); // GS: Functional Group Header lines.push( `GS*PO*${this.SYSCO_EDI_CONFIG.appSenderCode}*${this.SYSCO_EDI_CONFIG.appReceiverCode}*${timestamp.toISOString().slice(0, 10).replace(/-/g, '')}*${timestamp.toISOString().slice(11, 13)}${timestamp.toISOString().slice(14, 16)}*1*X*004010~`, ); // ST: Transaction Set Header lines.push(`ST*850*001~`); // BEG: Beginning of Purchase Order lines.push( `BEG*00*SA*${poData.poNumber}*${timestamp.toISOString().slice(0, 10).replace(/-/g, '')}~`, ); // REF: Reference Information lines.push(`REF*CO*${poData.poNumber}~`); // Customer Order number // DTM: Date/Time Reference lines.push( `DTM*002*${poData.orderDate.replace(/-/g, '')}*102~`, // Order date ); lines.push( `DTM*010*${poData.deliveryDate.replace(/-/g, '')}*102~`, // Delivery date ); // N1: Name (Ship To / Bill To) lines.push(`N1*ST*${poData.shipToId}~`); // Ship to lines.push(`N1*BT*${poData.billToId}~`); // Bill to // PO1: Baseline Item Data poData.items.forEach((item) => { lines.push( `PO1*${item.lineNumber}*${item.quantity}*${item.unit}*${item.unitPrice}**VP*${item.itemCode}~`, ); }); // CTT: Message Summary lines.push(`CTT*${poData.items.length}~`); // SE: Transaction Set Trailer lines.push(`SE*${lines.length + 1}*001~`); // GE: Functional Group Trailer lines.push(`GE*1*1~`); // IEA: Interchange Control Trailer lines.push(`IEA*1*000000001~`); return lines.join('\n'); } async processEDI810( edi810Content: string, organizationId: string, ): Promise<EDIInvoice | null> { try { // Parse EDI 810 (Invoice) const invoice = this.parseEDI810(edi810Content); if (!invoice) { logger.warn('Failed to parse EDI 810', { organizationId }); return null; } // Look up PO const { data: po } = await supabase .from('purchase_orders') .select('id, total_amount') .eq('po_number', invoice.poNumber) .eq('organization_id', organizationId) .single(); if (!po) { logger.warn('PO not found for invoice', { organizationId, invoiceNumber: invoice.invoiceNumber, poNumber: invoice.poNumber, }); return invoice; } // Create invoice record const { error } = await supabase.from('invoices').insert({ id: crypto.randomUUID(), organization_id: organizationId, po_id: po.id, vendor_id: 'sysco', // Would need actual vendor ID mapping invoice_number: invoice.invoiceNumber, invoice_date: invoice.invoiceDate, due_date: invoice.dueDate, total_amount: invoice.totalAmount, status: 'received', // Auto-create from EDI created_at: new Date().toISOString(), }); if (error) { logger.error('Failed to create invoice from EDI', error); throw error; } logger.info('Invoice created from EDI 810', { invoiceNumber: invoice.invoiceNumber, poNumber: invoice.poNumber, }); return invoice; } catch (error) { logger.error('Error processing EDI 810', error); return null; } } private parseEDI810(content: string): EDIInvoice | null { try { const lines = content.split(/[\n~]/); const invoice: EDIInvoice = { invoiceNumber: '', invoiceDate: '', poNumber: '', vendorCode: '', totalAmount: 0, dueDate: '', items: [], }; let currentLineNumber = 0; for (const line of lines) { const segment = line.split('*'); if (segment[0] === 'BIN') { // Beginning Invoice invoice.invoiceNumber = segment[1] || ''; invoice.invoiceDate = this.parseEDIDate(segment[2] || ''); } else if (segment[0] === 'REF') { // Reference - PO Number if (segment[1] === 'PO') { invoice.poNumber = segment[2] || ''; } } else if (segment[0] === 'DTM') { // Date - Due Date if (segment[1] === '003') { invoice.dueDate = this.parseEDIDate(segment[2] || ''); } } else if (segment[0] === 'IT1') { // Invoice Line Item currentLineNumber++; const invoiceLine: EDIInvoiceLine = { lineNumber: currentLineNumber, poLineNumber: parseInt(segment[1] || '0'), itemCode: segment[3] || '', invoicedQuantity: parseFloat(segment[2] || '0'), unit: segment[4] || '', unitPrice: parseFloat(segment[5] || '0'), lineTotal: parseFloat(segment[2] || '0') * parseFloat(segment[5] || '0'), }; invoice.items.push(invoiceLine); invoice.totalAmount += invoiceLine.lineTotal; } } return invoice; } catch (error) { logger.error('Error parsing EDI 810', error); return null; } } async processEDI856( edi856Content: string, organizationId: string, ): Promise<EDIAdvanceShipmentNotice | null> { try { // Parse EDI 856 (ASN) const asn = this.parseEDI856(edi856Content); if (!asn) { logger.warn('Failed to parse EDI 856', { organizationId }); return null; } // Look up PO const { data: po } = await supabase .from('purchase_orders') .select('id, outlet_id') .eq('po_number', asn.poNumber) .eq('organization_id', organizationId) .single(); if (!po) { logger.warn('PO not found for ASN', { organizationId, asnNumber: asn.asnNumber, poNumber: asn.poNumber, }); return asn; } // Create receiving task const { error } = await supabase.from('receiving_schedules').insert({ id: crypto.randomUUID(), po_id: po.id, outlet_id: po.outlet_id, asn_number: asn.asnNumber, carrier: asn.carrier, tracking_number: asn.trackingNumber, expected_delivery_date: asn.expectedDeliveryDate, status: 'pending_receipt', created_at: new Date().toISOString(), }); if (error) { logger.error('Failed to create receiving task from ASN', error); throw error; } logger.info('ASN processed', { asnNumber: asn.asnNumber, poNumber: asn.poNumber, }); return asn; } catch (error) { logger.error('Error processing EDI 856', error); return null; } } private parseEDI856(content: string): EDIAdvanceShipmentNotice | null { try { const lines = content.split(/[\n~]/); const asn: EDIAdvanceShipmentNotice = { asnNumber: '', shipDate: '', expectedDeliveryDate: '', poNumber: '', carrier: '', items: [], }; let currentLineNumber = 0; for (const line of lines) { const segment = line.split('*'); if (segment[0] === 'BSN') { // Beginning Shipment Notice asn.asnNumber = segment[2] || ''; asn.shipDate = this.parseEDIDate(segment[3] || ''); } else if (segment[0] === 'REF') { // Reference - PO Number if (segment[1] === 'PO') { asn.poNumber = segment[2] || ''; } } else if (segment[0] === 'DTM') { // Date - Delivery Date if (segment[1] === '011') { asn.expectedDeliveryDate = this.parseEDIDate(segment[2] || ''); } } else if (segment[0] === 'TD1') { // Carrier info asn.carrier = segment[4] || ''; } else if (segment[0] === 'HL') { // Hierarchy - Item Detail // Continue processing items } else if (segment[0] === 'SN1') { // Item Detail currentLineNumber++; const asnLine: EDIASNLine = { lineNumber: currentLineNumber, poLineNumber: parseInt(segment[1] || '0'), itemCode: '', shippedQuantity: parseFloat(segment[2] || '0'), unit: segment[3] || '', }; asn.items.push(asnLine); } } return asn; } catch (error) { logger.error('Error parsing EDI 856', error); return null; } } private parseEDIDate(ediDate: string): string { // EDI dates are typically YYMMDD or YYYYMMDD if (ediDate.length === 6) { const year = parseInt(ediDate.slice(0, 2)); const fullYear = year > 50 ? 1900 + year : 2000 + year; return `${fullYear}-${ediDate.slice(2, 4)}-${ediDate.slice(4, 6)}`; } else if (ediDate.length === 8) { return `${ediDate.slice(0, 4)}-${ediDate.slice(4, 6)}-${ediDate.slice(6, 8)}`; } return new Date().toISOString().split('T')[0]; } private async saveEDIMessage(message: EDIMessage): Promise<void> { try { const { error } = await supabase.from('edi_messages').insert({ id: message.id, organization_id: message.organizationId, supplier_id: message.supplierId, message_type: message.messageType, direction: message.direction, po_number: message.poNumber, invoice_number: message.invoiceNumber, asn_number: message.asnNumber, content: message.content, status: message.status, error_message: message.errorMessage, sent_at: message.sentAt, received_at: message.receivedAt, created_at: message.createdAt, }); if (error) { logger.error('Failed to save EDI message', error); } } catch (error) { logger.error('Error saving EDI message', error); } } async transmitEDI850Messages(): Promise<number> { // This would connect to Sysco EDI gateway (TrueCommerce, Infoconn, etc.) // For now, just mark as sent let transmitted = 0; for (const message of this.ediQueue) { if (message.status === 'pending' && message.messageType === 'PO') { // In production: connect to EDI gateway API message.status = 'sent'; message.sentAt = new Date().toISOString(); transmitted++; // Update database await supabase .from('edi_messages') .update({ status: 'sent', sent_at: message.sentAt }) .eq('id', message.id); } } if (transmitted > 0) { logger.info('EDI 850 messages transmitted', { count: transmitted }); } return transmitted; }
}
export const syscoEDIConnector = new SyscoEDIConnector();
