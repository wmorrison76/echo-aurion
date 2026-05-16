import {
  PaymentProcessor,
  PaymentIntent,
  PaymentMethod_Interface,
  PaymentStatus,
  PaymentMethod,
  Currency,
  PayPalPaymentConfig,
} from "../types/payment";
export class PayPalPaymentProcessor implements PaymentProcessor {
  provider = "paypal" as const;
  private config: PayPalPaymentConfig;
  private baseUrl =
    this.config.mode === "sandbox"
      ? "https://api-m.sandbox.paypal.com"
      : "https://api-m.paypal.com";
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  constructor(config: PayPalPaymentConfig) {
    this.config = config;
  }
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.tokenExpiry > now) {
      return this.accessToken;
    }
    try {
      const auth = Buffer.from(
        `${this.config.clientId}:${this.config.clientSecret}`,
      ).toString("base64");
      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });
      if (!response.ok) {
        throw new Error(`PayPal API error: ${response.statusText}`);
      }
      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = now + data.expires_in * 1000;
      return this.accessToken;
    } catch (error) {
      throw new Error(`Failed to get PayPal access token: ${error}`);
    }
  }
  async createPaymentIntent(
    amount: number,
    currency: Currency,
    method: PaymentMethod,
    metadata?: Record<string, any>,
  ): Promise<PaymentIntent> {
    try {
      const token = await this.getAccessToken();
      const payload = {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: currency, value: amount.toFixed(2) },
            description: metadata?.description || "Payment for order",
            custom_id: metadata?.reference || undefined,
          },
        ],
        payment_source: { [this.mapPaymentMethod(method)]: {} },
      };
      const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": `${Date.now()}-${Math.random()}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`PayPal API error: ${JSON.stringify(error)}`);
      }
      const order = await response.json();
      return {
        id: order.id,
        amount,
        currency,
        status: this.mapPayPalStatus(order.status),
        method,
        provider: "paypal",
        metadata,
        createdAt: new Date(order.create_time),
        updatedAt: new Date(order.update_time || order.create_time),
      };
    } catch (error) {
      throw new Error(`Failed to create PayPal order: ${error}`);
    }
  }
  async confirmPayment(
    paymentIntentId: string,
    paymentMethodId: string,
    additionalData?: Record<string, any>,
  ): Promise<PaymentIntent> {
    try {
      const token = await this.getAccessToken();
      const payload = {
        payment_source: { paypal: additionalData?.paypal_data || {} },
      };
      const response = await fetch(
        `${this.baseUrl}/v2/checkout/orders/${paymentIntentId}/confirm-payment-source`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error(`PayPal API error: ${response.statusText}`);
      }
      const order = await response.json();
      return {
        id: order.id,
        amount: parseFloat(order.purchase_units[0].amount.value),
        currency: order.purchase_units[0].amount.currency_code as Currency,
        status: this.mapPayPalStatus(order.status),
        method: "digital_wallet",
        provider: "paypal",
        createdAt: new Date(order.create_time),
        updatedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to confirm PayPal payment: ${error}`);
    }
  }
  async refundPayment(
    paymentIntentId: string,
    amount?: number,
  ): Promise<PaymentIntent> {
    try {
      const token = await this.getAccessToken();
      const getOrderResponse = await fetch(
        `${this.baseUrl}/v2/checkout/orders/${paymentIntentId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const order = await getOrderResponse.json();
      const captureId = order.purchase_units[0].payments.captures[0]?.id;
      if (!captureId) {
        throw new Error("No capture found for this order");
      }
      const refundPayload: any = {};
      if (amount) {
        refundPayload.amount = amount.toFixed(2);
      }
      const response = await fetch(
        `${this.baseUrl}/v2/payments/captures/${captureId}/refund`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(refundPayload),
        },
      );
      if (!response.ok) {
        throw new Error(`PayPal API error: ${response.statusText}`);
      }
      const refund = await response.json();
      return {
        id: paymentIntentId,
        amount: parseFloat(
          refund.amount?.value || order.purchase_units[0].amount.value,
        ),
        currency: (refund.amount?.currency_code ||
          order.purchase_units[0].amount.currency_code) as Currency,
        status: "refunded",
        method: "digital_wallet",
        provider: "paypal",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to refund PayPal payment: ${error}`);
    }
  }
  async validatePaymentMethod(
    method: PaymentMethod_Interface,
  ): Promise<boolean> {
    return method.provider === "paypal" && !method.isExpired;
  }
  async listPaymentMethods(
    customerId: string,
  ): Promise<PaymentMethod_Interface[]> {
    try {
      const token = await this.getAccessToken();
      const response = await fetch(
        `${this.baseUrl}/v1/vault/payment-tokens?customer_id=${customerId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) {
        throw new Error(`PayPal API error: ${response.statusText}`);
      }
      const data = await response.json();
      return (data.payment_tokens || []).map((token: any) => ({
        id: token.id,
        provider: "paypal" as const,
        type: "digital_wallet" as const,
        isDefault: false,
        isExpired: false,
        createdAt: new Date(token.create_time),
        updatedAt: new Date(token.update_time || token.create_time),
      }));
    } catch (error) {
      throw new Error(`Failed to list PayPal payment methods: ${error}`);
    }
  }
  async deletePaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const response = await fetch(
        `${this.baseUrl}/v1/vault/payment-tokens/${paymentMethodId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
      return response.ok || response.status === 204;
    } catch (error) {
      console.error("Failed to delete PayPal payment method:", error);
      return false;
    }
  }
  async handleWebhook(event: Record<string, any>): Promise<void> {
    const eventType = event.event_type;
    switch (eventType) {
      case "CHECKOUT.ORDER.COMPLETED":
        console.log("Order completed:", event.resource.id);
        break;
      case "PAYMENT.CAPTURE.COMPLETED":
        console.log("Payment captured:", event.resource.id);
        break;
      case "PAYMENT.CAPTURE.REFUNDED":
        console.log("Payment refunded:", event.resource.id);
        break;
      default:
        console.log("Unhandled PayPal event:", eventType);
    }
  }
  private mapPaymentMethod(method: PaymentMethod): string {
    const mapping: Record<PaymentMethod, string> = {
      credit_card: "card",
      debit_card: "card",
      bank_transfer: "venmo",
      digital_wallet: "paypal",
      ach: "bank_transfer",
      check: "card",
    };
    return mapping[method] || "paypal";
  }
  private mapPayPalStatus(paypalStatus: string): PaymentStatus {
    const mapping: Record<string, PaymentStatus> = {
      CREATED: "pending",
      SAVED: "pending",
      APPROVED: "processing",
      VOIDED: "cancelled",
      COMPLETED: "completed",
      PAYER_ACTION_REQUIRED: "processing",
    };
    return mapping[paypalStatus] || "pending";
  }
}
