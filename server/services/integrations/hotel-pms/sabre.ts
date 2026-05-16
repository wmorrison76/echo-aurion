/** Sabre Hospitality integration stub. */
import type { HotelPMSIntegration, PMSConfig, AuthToken, DateRange, HotelReservation, GuestSpending, WebhookCallback } from "./base";

export class SabreIntegration implements HotelPMSIntegration {
  async authenticate(_config: PMSConfig): Promise<AuthToken> {
    return { accessToken: "sabre-stub" };
  }
  async fetchReservations(_dateRange: DateRange): Promise<HotelReservation[]> {
    return [];
  }
  async fetchGuestSpending?.(_reservationId: string): Promise<GuestSpending[]> {
    return [];
  }
  async subscribeToWebhooks?.(_callback: WebhookCallback): Promise<void> {}
}
