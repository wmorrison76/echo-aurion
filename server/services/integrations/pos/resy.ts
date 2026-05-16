/** Resy integration stub. */
import type { POSIntegration, POSConfig, AuthToken, DateRange, POSSalesData, WebhookCallback } from "./base";

export class ResyIntegration implements POSIntegration {
  async authenticate(_config: POSConfig): Promise<AuthToken> {
    return { accessToken: "resy-stub" };
  }
  async fetchSalesData(_dateRange: DateRange, _outletId?: string): Promise<POSSalesData[]> {
    return [];
  }
  async subscribeToWebhooks?.(_callback: WebhookCallback): Promise<void> {}
}
