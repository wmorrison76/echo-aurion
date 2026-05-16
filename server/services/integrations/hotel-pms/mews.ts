/**
 * Mews PMS integration stub.
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

export class MewsIntegration implements HotelPMSIntegration {
  async authenticate(_config: PMSConfig): Promise<AuthToken> {
    return { accessToken: "mews-stub" };
  }

  async fetchReservations(_dateRange: DateRange): Promise<HotelReservation[]> {
    return [];
  }

  async fetchGuestSpending(_reservationId: string): Promise<GuestSpending[]> {
    return [];
  }

  async subscribeToWebhooks?.(_callback: WebhookCallback): Promise<void> {}
}
