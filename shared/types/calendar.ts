/**
 * Calendar domain types
 * Events, availability, room bookings, conflict detection
 */
import {
  StandardEntity,
  Nameable,
  UUID,
  ISODate,
  Schedulable,
  URL
} from './base';

/**
 * Calendar event (generic)
 */
export interface CalendarEvent extends StandardEntity, Nameable, Schedulable {
  // Event details
  eventType: 'beo' | 'meeting' | 'task' | 'reminder' | 'personal' | 'blocked';
  allDay: boolean;

  // Location
  locationId?: UUID;
  roomId?: UUID;
  virtualMeetingUrl?: URL;

  // Recurrence
  isRecurring: boolean;
  recurrenceRule?: string; // RRULE format
  recurrenceEndDate?: ISODate;
  parentEventId?: UUID; // For recurring instances

  // Participants
  organizerId: UUID;
  attendeeIds?: UUID[];
  requiredAttendeeIds?: UUID[];
  optionalAttendeeIds?: UUID[];

  // Reminder
  reminderMinutesBefore?: number;

  // Color/Display
  color?: string;
  displayOrder?: number;

  // Status
  status: 'tentative' | 'confirmed' | 'cancelled';

  // Related entities
  relatedToType?: 'beo' | 'task' | 'prospect';
  relatedToId?: UUID;

  // Visibility
  isPublic: boolean;
  isPrivate: boolean;
}

/**
 * Room availability block
 */
export interface RoomAvailability extends StandardEntity, Schedulable {
  roomId: UUID;

  // Availability
  isAvailable: boolean;
  blockReason?: string; // "maintenance", "cleaning", "private_event"

  // Blocking
  blockedBy?: UUID;
  isAllDayBlock: boolean;

  // Recurrence
  isRecurring: boolean;
  recurrenceRule?: string;
}

/**
 * Resource (equipment, vehicle, etc.)
 */
export interface Resource extends StandardEntity, Nameable {
  resourceType: 'equipment' | 'vehicle' | 'room' | 'other';

  // Bookability
  isBookable: boolean;
  requiresApproval: boolean;

  // Capacity
  capacity?: number;

  // Status
  status: 'available' | 'in_use' | 'maintenance' | 'retired';
  isActive: boolean;
}

/**
 * Resource booking
 */
export interface ResourceBooking extends StandardEntity, Schedulable {
  resourceId: UUID;
  eventId?: UUID;

  // Booked by
  bookedBy: UUID;
  bookedFor?: UUID; // Different person using it

  // Purpose
  purpose: string;
  notes?: string;

  // Status
  status: 'pending' | 'approved' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

  // Approval
  approvedBy?: UUID;
  approvedAt?: ISODate;

  // Check-in/out
  checkedOut: boolean;
  checkedOutAt?: ISODate;
  checkedIn: boolean;
  checkedInAt?: ISODate;
}

/**
 * Conflict detection result
 */
export interface ConflictDetection extends StandardEntity {
  checkType: 'room' | 'resource' | 'staff' | 'double_booking';

  // Conflicting items
  conflicts: {
    conflictType: string;
    conflictingEventId: UUID;
    conflictingEventName: string;
    conflictStart: ISODate;
    conflictEnd: ISODate;
    severity: 'hard' | 'soft' | 'warning';
    description: string;
  }[];

  // Resolution
  hasConflicts: boolean;
  canBeOverridden: boolean;

  // Check details
  checkedAt: ISODate;
  checkedBy: UUID;
}

/**
 * Calendar view configuration
 */
export interface CalendarView extends StandardEntity, Nameable {
  userId: UUID;

  // View type
  viewType: 'day' | 'week' | 'month' | 'agenda' | 'timeline';
  defaultView: boolean;

  // Filters
  showEventTypes?: string[];
  showLocationIds?: UUID[];
  showRoomIds?: UUID[];
  hidePrivateEvents: boolean;

  // Display
  timeFormat: '12h' | '24h';
  startHour?: number;
  endHour?: number;
  firstDayOfWeek: 0 | 1; // 0 = Sunday, 1 = Monday

  // Colors
  colorScheme?: Record<string, string>;
}

/**
 * Calendar subscription (iCal feed)
 */
export interface CalendarSubscription extends StandardEntity {
  userId?: UUID;

  // Feed details
  feedUrl: URL;
  feedName: string;

  // Sync
  lastSyncedAt?: ISODate;
  syncFrequencyMinutes: number;
  autoSync: boolean;

  // Status
  isActive: boolean;
  syncErrors?: string;
}

/**
 * Event attendance
 */
export interface EventAttendance extends StandardEntity {
  eventId: UUID;
  attendeeId: UUID;

  // RSVP
  rsvpStatus: 'pending' | 'accepted' | 'declined' | 'tentative' | 'no_response';
  rsvpDate?: ISODate;

  // Actual attendance
  attended?: boolean;
  checkInTime?: ISODate;
  checkOutTime?: ISODate;

  // Notes
  attendeeNotes?: string;
}

/**
 * Blackout date
 */
export interface BlackoutDate extends StandardEntity, Schedulable {
  locationId?: UUID;
  roomId?: UUID;

  // Reason
  reason: 'holiday' | 'maintenance' | 'special_event' | 'other';
  description: string;

  // Impact
  affectsAllLocations: boolean;
  affectsAllRooms: boolean;

  // Recurrence
  isRecurring: boolean;
  recurrenceRule?: string;

  isActive: boolean;
}
