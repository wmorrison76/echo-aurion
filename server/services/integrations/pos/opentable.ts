/** OpenTable integration stub. */
import type { POSIntegration, POSConfig, AuthToken, DateRange, POSSalesData, WebhookCallback } from "./base";

export class OpenTableIntegration implements POSIntegration {
  async authenticate(_config: POSConfig): Promise<AuthToken> {
    return { accessToken: "opentable-stub" };
  }
  async fetchSalesData(_dateRange: DateRange, _outletId?: string): Promise<POSSalesData[]> {
    return [];
  }
  async subscribeToWebhooks?.(_callback: WebhookCallback): Promise<void> {}
}
