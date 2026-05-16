
/**
 * BEO (Banquet Event Order) domain types
 * Event management, bookings, rooms, equipment, staff assignments
 */
import {
  StandardEntity,
  Nameable,
  UUID,
  Money,
  ISODate,
  Taggable,
  Schedulable,
  Assignable,
  Approvable,
  Publishable,
  URL,
  Percentage,
  PhoneNumber,
  Email
} from './base';

/**
 * Main event/BEO entity
 */
export interface BEO extends
  StandardEntity,
  Nameable,
  Schedulable,
  Taggable,
  Approvable {
  // Client information
  clientId: UUID;
  contactName: string;
  contactEmail: Email;
  contactPhone: PhoneNumber;

  // Event details
  eventType: 'wedding' | 'corporate' | 'social' | 'meeting' | 'conference' | 'other';
  eventDate: ISODate;
  setupTime: string; // "09:00"
  startTime: string; // "18:00"
  endTime: string; // "23:00"
  breakdownTime?: string;

  // Capacity
  guaranteedGuests: number;
  estimatedGuests: number;
  actualGuests?: number;

  // Rooms & spaces
  roomIds: UUID[];
  setupStyle?: string; // "banquet", "classroom", "theater", etc.

  // Menu & F&B
  menuId?: UUID;
  hasBar: boolean;
  barType?: 'open' | 'cash' | 'hosted';

  // Financials
  estimatedRevenue: Money;
  actualRevenue?: Money;
  depositAmount: Money;
  depositPaid: boolean;
  depositPaidDate?: ISODate;
  balanceDue: Money;
  balanceDueDate: ISODate;

  // Staff requirements
  serversNeeded: number;
  chefRequired: boolean;
  bartendersNeeded: number;

  // Status tracking
  status: 'inquiry' | 'tentative' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

  // Cancellation
  cancelledAt?: ISODate;
  cancelledBy?: UUID;
  cancellationReason?: string;
  cancellationFee?: Money;

  // Documents
  contractUrl?: URL;
  floorPlanUrl?: URL;

  // Notes
  specialRequests?: string;
  dietaryRestrictions?: string;
  internalNotes?: string;
}

/**
 * Event room/space booking
 */
export interface EventRoom extends StandardEntity, Schedulable {
  beoId: UUID;
  roomId: UUID;

  // Setup
  setupStyle: string;
  capacity: number;

  // Equipment needed
  equipmentIds?: UUID[];

  // Notes
  setupNotes?: string;
}

/**
 * Physical room/venue space
 */
export interface Room extends StandardEntity, Nameable {
  locationId: UUID;

  // Capacity
  maxCapacity: number;
  minCapacity?: number;

  // Dimensions
  squareFeet?: number;
  ceilingHeight?: number;

  // Features
  hasAV: boolean;
  hasKitchen: boolean;
  hasBar: boolean;
  hasDanceFloor: boolean;
  hasStage: boolean;

  // Pricing
  rentalRate: Money;
  rentalRateType: 'hourly' | 'daily' | 'flat';

  // Availability
  isActive: boolean;

  // Media
  photoUrls?: URL[];
  floorPlanUrl?: URL;
}

/**
 * Event equipment (tables, chairs, linens, AV)
 */
export interface Equipment extends StandardEntity, Nameable {
  category: 'tables' | 'chairs' | 'linens' | 'av' | 'lighting' | 'decor' | 'kitchen' | 'other';

  // Inventory
  totalQuantity: number;
  availableQuantity: number;

  // Pricing
  rentalPrice?: Money;
  replacementCost?: Money;

  // Specifications
  dimensions?: string;
  color?: string;
  material?: string;

  // Status
  condition: 'excellent' | 'good' | 'fair' | 'needs_repair' | 'retired';
  isActive: boolean;
}

/**
 * Equipment assignment to event
 */
export interface EventEquipment extends StandardEntity {
  beoId: UUID;
  equipmentId: UUID;
  roomId?: UUID;

  quantityNeeded: number;
  quantityAssigned: number;

  setupInstructions?: string;
}

/**
 * Event menu/package
 */
export interface EventMenu extends StandardEntity, Nameable, Publishable {
  menuType: 'plated' | 'buffet' | 'stations' | 'cocktail' | 'family_style';

  // Courses
  courses: {
    courseName: string;
    recipeIds: UUID[];
    options?: string[]; // "Choice of chicken or fish"
  }[];

  // Pricing
  pricePerPerson: Money;
  minimumGuests?: number;

  // Dietary
  vegetarianOption: boolean;
  veganOption: boolean;
  glutenFreeOption: boolean;

  // Availability
  seasonalStartDate?: ISODate;
  seasonalEndDate?: ISODate;
  isActive: boolean;
}

/**
 * Event staff assignment
 */
export interface EventStaff extends StandardEntity, Assignable {
  beoId: UUID;
  staffId: UUID;

  role: 'server' | 'bartender' | 'chef' | 'captain' | 'setup' | 'breakdown' | 'coordinator';

  // Timing
  startTime: string;
  endTime: string;
  hoursScheduled: number;
  hoursWorked?: number;

  // Compensation
  hourlyRate: Money;
  totalPay: Money;

  // Status
  confirmed: boolean;
  checkedIn: boolean;
  checkedInAt?: ISODate;
  checkedOut: boolean;
  checkedOutAt?: ISODate;
}

/**
 * Event timeline/run of show
 */
export interface EventTimeline extends StandardEntity {
  beoId: UUID;

  timelineItems: {
    time: string; // "18:30"
    activity: string;
    duration?: number; // minutes
    responsibleParty?: string;
    notes?: string;
  }[];
}

/**
 * Event invoice/billing
 */
export interface EventInvoice extends StandardEntity {
  beoId: UUID;
  invoiceNumber: string;

  // Amounts
  subtotal: Money;
  taxAmount: Money;
  serviceFee?: Money;
  gratuitySuggested?: Money;
  totalAmount: Money;

  // Payments
  amountPaid: Money;
  amountDue: Money;

  // Line items
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: Money;
    totalPrice: Money;
  }[];

  // Status
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  sentAt?: ISODate;
  dueDate: ISODate;
  paidAt?: ISODate;

  // Documents
  invoiceUrl?: URL;
}

/**
 * Event payment
 */
export interface EventPayment extends StandardEntity {
  beoId: UUID;
  invoiceId?: UUID;

  amount: Money;
  paymentMethod: 'cash' | 'check' | 'credit_card' | 'ach' | 'wire';

  // Details
  paymentDate: ISODate;
  referenceNumber?: string;

  // Processing
  processedBy: UUID;
  notes?: string;
}

/**
 * Event document/attachment
 */
export interface EventDocument extends StandardEntity {
  beoId: UUID;

  documentType: 'contract' | 'floor_plan' | 'menu' | 'invoice' | 'photo' | 'other';
  fileName: string;
  fileUrl: URL;
  fileSize?: number;

  uploadedBy: UUID;
  uploadedAt: ISODate;
}

/**
 * BEO template for quick event creation
 */
export interface BEOTemplate extends StandardEntity, Nameable {
  eventType: BEO['eventType'];

  // Default values
  defaultRoomIds?: UUID[];
  defaultMenuId?: UUID;
  defaultSetupStyle?: string;
  defaultStaffing?: {
    servers: number;
    bartenders: number;
  };

  // Pricing templates
  estimatedRevenueFormula?: string;

  isActive: boolean;
}
