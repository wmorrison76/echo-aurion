/**
 * OPERA Cloud/PMS integration stub.
 * Implements HotelPMSIntegration; fill with OPERA API details.
 */

import type {
  HotelPMSIntegration,
  PMSConfig,
  AuthToken,
  DateRange,
  HotelReservation,
  GuestSpending,
  WebhookCallback,
} from "./base";

export class OperaIntegration implements HotelPMSIntegration {
  async authenticate(_config: PMSConfig): Promise<AuthToken> {
    return { accessToken: "opera-stub" };
  }

  async fetchReservations(_dateRange: DateRange): Promise<HotelReservation[]> {
    return [];
  }

  async fetchGuestSpending(_reservationId: string): Promise<GuestSpending[]> {
    return [];
  }

  async subscribeToWebhooks?.(_callback: WebhookCallback): Promise<void> {
    // Stub: register OPERA webhooks when available
  }
}
