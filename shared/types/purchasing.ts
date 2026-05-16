/**
 * Purchasing domain types
 * Purchase orders, suppliers, receiving, invoices
 */
import {
  StandardEntity,
  Nameable,
  UUID,
  Money,
  ISODate,
  Taggable,
  Approvable,
  URL,
  Email,
  PhoneNumber
} from './base';

/**
 * Supplier/vendor
 */
export interface Supplier extends StandardEntity, Nameable, Taggable {
  // Contact
  contactName?: string;
  contactEmail?: Email;
  contactPhone?: PhoneNumber;
  website?: URL;

  // Address
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;

  // Business details
  taxId?: string;
  accountNumber?: string;

  // Categories
  supplierType: 'produce' | 'meat' | 'seafood' | 'dairy' | 'dry_goods' | 'beverages' | 'equipment' | 'other';
  categories?: string[];

  // Terms
  paymentTerms: string; // "Net 30", "COD", etc.
  leadTimeDays: number;
  minimumOrder?: Money;

  // Performance
  rating?: number; // 1-5
  isPreferred: boolean;
  isActive: boolean;

  // Documents
  w9Url?: URL;
  insuranceCertUrl?: URL;
}

/**
 * Purchase order
 */
export interface PurchaseOrder extends StandardEntity, Approvable {
  poNumber: string;
  supplierId: UUID;

  // Delivery
  requestedDeliveryDate: ISODate;
  actualDeliveryDate?: ISODate;
  deliveryLocationId?: UUID;

  // Financial
  subtotal: Money;
  taxAmount: Money;
  shippingCost: Money;
  totalAmount: Money;

  // Status
  status: 'draft' | 'submitted' | 'approved' | 'ordered' | 'partially_received' | 'received' | 'cancelled';

  // Ordering
  orderedBy: UUID;
  orderedAt?: ISODate;

  // Receiving
  receivedBy?: UUID;
  receivedAt?: ISODate;

  // Payment
  invoiceNumber?: string;
  invoiceAmount?: Money;
  invoiceUrl?: URL;
  isPaid: boolean;
  paidAt?: ISODate;

  // Notes
  supplierNotes?: string;
  internalNotes?: string;
}

/**
 * Purchase order line item
 */
export interface PurchaseOrderItem extends StandardEntity {
  purchaseOrderId: UUID;
  inventoryItemId?: UUID;

  // Item details
  itemName: string;
  itemSku?: string;
  description?: string;

  // Quantity
  quantityOrdered: number;
  quantityReceived: number;
  unit: string;

  // Pricing
  unitPrice: Money;
  totalPrice: Money;

  // Receiving
  receivedDate?: ISODate;

  // Quality
  acceptedQuantity?: number;
  rejectedQuantity?: number;
  rejectionReason?: string;
}

/**
 * Receiving record
 */
export interface ReceivingRecord extends StandardEntity {
  purchaseOrderId: UUID;
  supplierId: UUID;

  // Delivery details
  deliveryDate: ISODate;
  deliveryTime?: string;
  driverName?: string;
  invoiceNumber?: string;

  // Received by
  receivedBy: UUID;
  receivedAt: ISODate;

  // Quality check
  overallQuality: 'excellent' | 'good' | 'acceptable' | 'poor';
  qualityNotes?: string;

  // Temperature check (for food safety)
  temperatureChecked: boolean;
  temperatureLog?: {
    item: string;
    expectedTemp: number;
    actualTemp: number;
    passed: boolean;
  }[];

  // Discrepancies
  hasDiscrepancies: boolean;
  discrepancyNotes?: string;

  // Photos
  photoUrls?: URL[];
}

/**
 * Supplier invoice
 */
export interface SupplierInvoice extends StandardEntity {
  supplierId: UUID;
  purchaseOrderId?: UUID;

  // Invoice details
  invoiceNumber: string;
  invoiceDate: ISODate;
  dueDate: ISODate;

  // Amounts
  subtotal: Money;
  taxAmount: Money;
  shippingCost: Money;
  otherCharges: Money;
  totalAmount: Money;

  // Payment
  amountPaid: Money;
  amountDue: Money;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  paidDate?: ISODate;

  // Documents
  invoiceUrl?: URL;
}

/**
 * Supplier price list item
 */
export interface SupplierPriceList extends StandardEntity {
  supplierId: UUID;
  inventoryItemId?: UUID;

  // Item
  itemName: string;
  itemSku: string;
  description?: string;

  // Pricing
  unitPrice: Money;
  unit: string;
  packSize?: string; // "Case of 12"

  // Validity
  effectiveDate: ISODate;
  expirationDate?: ISODate;

  isActive: boolean;
}

/**
 * Supplier performance tracking
 */
export interface SupplierPerformance extends StandardEntity {
  supplierId: UUID;
  periodStart: ISODate;
  periodEnd: ISODate;

  // Metrics
  totalOrders: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  onTimePercentage: number;

  // Quality
  totalItems: number;
  acceptedItems: number;
  rejectedItems: number;
  qualityScore: number;

  // Financial
  totalSpend: Money;
  averageOrderValue: Money;

  // Overall rating
  overallRating: number; // 1-5
}

/**
 * Purchase requisition (request to purchase)
 */
export interface PurchaseRequisition extends StandardEntity, Approvable {
  requestedBy: UUID;
  department?: string;

  // Items needed
  items: {
    itemName: string;
    quantity: number;
    unit: string;
    estimatedCost: Money;
    justification?: string;
  }[];

  // Financial
  totalEstimatedCost: Money;
  budgetCode?: string;

  // Urgency
  priority: 'low' | 'medium' | 'high' | 'urgent';
  neededBy: ISODate;

  // Status
  status: 'pending' | 'approved' | 'rejected' | 'ordered' | 'fulfilled';

  // Converted to PO
  purchaseOrderId?: UUID;
  convertedAt?: ISODate;
}
