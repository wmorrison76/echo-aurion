/**
 * Canonical Group / Booking (multi-day, multi-event umbrella)
 * This is the spine for CRM/Event Sales.
 */

export type GroupBooking = {
  groupId: string; // internal UID
  groupName: string; // display name (e.g., "Crockett Bridal Shower")
  masterAccount?: string; // Catering / Sales account
  bookingOwner?: string; // salesperson
  serviceManager?: string;

  startDate?: string; // ISO date
  endDate?: string; // ISO date

  notes?: string;

  createdAt: string;
  updatedAt: string;
};
