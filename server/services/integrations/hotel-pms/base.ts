/**
 * Base interface for Hotel PMS integrations (OPERA, Mews, Cloudbeds, Protel, SynXis, Sabre, Amadeus).
 */

export interface PMSConfig {
  apiEndpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  config?: Record<string, unknown>;
}

export interface AuthToken {
  accessToken: string;
  expiresAt?: string;
}

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;
}

export interface HotelReservation {
  id: string;
  pmsReservationId: string;
  pmsType: string;
  guestName?: string;
  checkInDate: string;
  checkOutDate: string;
  roomCount: number;
  guestCount: number;
  roomType?: string;
  rateCode?: string;
  totalRevenue?: number;
  status: string;
  raw?: Record<string, unknown>;
}

export interface GuestSpending {
  reservationId: string;
  guestId?: string;
  date: string;
  outletName?: string;
  spendingCategory: string;
  amount: number;
  transactionCount: number;
}

export type WebhookCallback = (payload: unknown) => Promise<void>;

export interface HotelPMSIntegration {
  authenticate(config: PMSConfig): Promise<AuthToken>;
  fetchReservations(dateRange: DateRange): Promise<HotelReservation[]>;
  fetchGuestSpending?(reservationId: string): Promise<GuestSpending[]>;
  subscribeToWebhooks?(callback: WebhookCallback): Promise<void>;
}
