/**
 * Base interface for POS integrations (Toast, Square, TouchBistro, MICROS, Revel, etc.).
 */

export interface POSConfig {
  apiEndpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  locationId?: string;
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

export interface POSSalesData {
  transactionId: string;
  date: string;
  time: string;
  mealPeriod?: string;
  revenue: number;
  guestCount: number;
  itemCount: number;
  tableNumber?: string;
  serverName?: string;
  raw?: Record<string, unknown>;
}

export type WebhookCallback = (payload: unknown) => Promise<void>;

export interface POSIntegration {
  authenticate(config: POSConfig): Promise<AuthToken>;
  fetchSalesData(dateRange: DateRange, outletId?: string): Promise<POSSalesData[]>;
  subscribeToWebhooks?(callback: WebhookCallback): Promise<void>;
}
