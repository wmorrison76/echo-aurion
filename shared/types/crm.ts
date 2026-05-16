/**
 * CRM (Customer Relationship Management) domain types
 * Prospects, leads, clients, bookings, communications
 */
import {
  StandardEntity,
  Nameable,
  UUID,
  Money,
  ISODate,
  Email,
  PhoneNumber,
  Taggable,
  URL
} from './base';

/**
 * Prospect/Lead
 */
export interface Prospect extends StandardEntity, Nameable, Taggable {
  // Contact
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: Email;
  phone?: PhoneNumber;

  // Source
  leadSource: 'website' | 'referral' | 'cold_call' | 'event' | 'social_media' | 'walk_in' | 'other';
  referredBy?: string;

  // Status
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

  // Assignment
  assignedTo?: UUID;
  assignedAt?: ISODate;

  // Event interest
  eventType?: string;
  eventDate?: ISODate;
  estimatedGuests?: number;
  estimatedBudget?: Money;

  // Qualification
  qualifiedAt?: ISODate;
  disqualifiedAt?: ISODate;
  disqualificationReason?: string;

  // Conversion
  convertedToClientId?: UUID;
  convertedAt?: ISODate;

  // Notes
  notes?: string;

  // Next action
  nextActionDate?: ISODate;
  nextActionType?: string;
}

/**
 * Client (converted prospect)
 */
export interface Client extends StandardEntity, Nameable, Taggable {
  // Contact
  firstName: string;
  lastName: string;
  companyName?: string;
  email: Email;
  phone: PhoneNumber;
  alternatePhone?: PhoneNumber;

  // Address
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;

  // Client type
  clientType: 'individual' | 'corporate' | 'nonprofit' | 'government';

  // Relationship
  accountManager?: UUID;
  firstEventDate?: ISODate;
  lastEventDate?: ISODate;
  totalEvents: number;

  // Value
  lifetimeValue: Money;
  averageEventValue: Money;

  // Preferences
  preferredContactMethod?: 'email' | 'phone' | 'text';
  dietaryRestrictions?: string[];
  specialRequests?: string;

  // Status
  status: 'active' | 'inactive' | 'vip' | 'blacklisted';

  // Documents
  contractUrl?: URL;
}

/**
 * Communication/Activity log
 */
export interface Activity extends StandardEntity {
  relatedToType: 'prospect' | 'client' | 'beo';
  relatedToId: UUID;

  // Activity details
  activityType: 'call' | 'email' | 'meeting' | 'task' | 'note' | 'proposal' | 'follow_up';
  subject: string;
  description?: string;

  // Participants
  performedBy: UUID;
  attendees?: UUID[];

  // Outcome
  outcome?: 'successful' | 'no_answer' | 'voicemail' | 'scheduled' | 'cancelled';

  // Follow-up
  requiresFollowUp: boolean;
  followUpDate?: ISODate;
  followUpTask?: string;

  // Duration (for calls/meetings)
  durationMinutes?: number;

  // Attachments
  attachmentUrls?: URL[];
}

/**
 * Proposal/Quote
 */
export interface Proposal extends StandardEntity {
  prospectId?: UUID;
  clientId?: UUID;

  // Proposal details
  proposalNumber: string;
  proposalDate: ISODate;
  expirationDate: ISODate;

  // Event details
  eventType: string;
  eventDate?: ISODate;
  guests: number;

  // Financial
  subtotal: Money;
  taxAmount: Money;
  serviceFee: Money;
  totalAmount: Money;
  depositAmount: Money;

  // Line items
  items: {
    description: string;
    quantity: number;
    unitPrice: Money;
    totalPrice: Money;
  }[];

  // Status
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';
  sentAt?: ISODate;
  viewedAt?: ISODate;
  acceptedAt?: ISODate;
  declinedAt?: ISODate;
  declineReason?: string;

  // Documents
  proposalUrl?: URL;

  // Conversion
  convertedToBeoId?: UUID;
  convertedAt?: ISODate;
}

/**
 * Email campaign
 */
export interface EmailCampaign extends StandardEntity, Nameable {
  // Campaign
  campaignType: 'newsletter' | 'promotional' | 'event' | 'follow_up' | 'announcement';
  subject: string;
  emailBody: string;

  // Targeting
  targetAudience: 'all_clients' | 'prospects' | 'vip' | 'custom';
  segmentIds?: UUID[];

  // Scheduling
  scheduledSendDate?: ISODate;
  sentAt?: ISODate;

  // Status
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';

  // Metrics
  recipientCount?: number;
  openedCount?: number;
  clickedCount?: number;
  unsubscribedCount?: number;
  openRate?: number;
  clickRate?: number;
}

/**
 * Client segment (for targeting)
 */
export interface ClientSegment extends StandardEntity, Nameable {
  // Criteria
  criteria: {
    field: string;
    operator: string;
    value: any;
  }[];

  // Members
  clientIds?: UUID[];
  prospectIds?: UUID[];
  memberCount: number;

  // Usage
  lastUsedAt?: ISODate;
  campaignsUsed: number;
}

/**
 * Review/Testimonial
 */
export interface Review extends StandardEntity {
  clientId: UUID;
  beoId?: UUID;

  // Review
  rating: number; // 1-5
  title?: string;
  reviewText: string;

  // Publish
  isPublished: boolean;
  publishedAt?: ISODate;

  // Response
  responseText?: string;
  respondedBy?: UUID;
  respondedAt?: ISODate;

  // Source
  source: 'internal' | 'google' | 'yelp' | 'facebook' | 'other';
  sourceUrl?: URL;
}

/**
 * Referral tracking
 */
export interface Referral extends StandardEntity {
  referrerId: UUID; // Client who referred
  referredProspectId?: UUID;
  referredClientId?: UUID;

  // Status
  status: 'pending' | 'contacted' | 'converted' | 'lost';
  convertedAt?: ISODate;

  // Reward
  rewardType?: 'discount' | 'credit' | 'gift' | 'cash';
  rewardAmount?: Money;
  rewardIssued: boolean;
  rewardIssuedAt?: ISODate;
}
