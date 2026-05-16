/**
 * Toast POS integration stub.
 */

import type {
  POSIntegration,
  POSConfig,
  AuthToken,
  DateRange,
  POSSalesData,
  WebhookCallback,
} from "./base";

export class ToastIntegration implements POSIntegration {
  async authenticate(_config: POSConfig): Promise<AuthToken> {
    return { accessToken: "toast-stub" };
  }

  async fetchSalesData(_dateRange: DateRange, _outletId?: string): Promise<POSSalesData[]> {
    return [];
  }

  async subscribeToWebhooks?.(_callback: WebhookCallback): Promise<void> {}
}
