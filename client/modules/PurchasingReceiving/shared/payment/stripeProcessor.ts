import {
  PaymentProcessor,
  PaymentIntent,
  PaymentMethod_Interface,
  PaymentStatus,
  PaymentMethod,
  Currency,
  StripePaymentConfig,
} from "../types/payment";
export class StripePaymentProcessor implements PaymentProcessor {
  provider = "stripe" as const;
  private config: StripePaymentConfig;
  private baseUrl = "https://api.stripe.com/v1";
  constructor(config: StripePaymentConfig) {
    this.config = config;
  }
  async createPaymentIntent(
    amount: number,
    currency: Currency,
    method: PaymentMethod,
    metadata?: Record<string, any>,
  ): Promise<PaymentIntent> {
    try {
      const formData = new URLSearchParams();
      formData.append("amount", Math.round(amount * 100).toString());
      formData.append("currency", currency.toLowerCase());
      formData.append("payment_method_types[]", this.mapPaymentMethod(method));
      formData.append("confirmation_method", "manual");
      if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
          formData.append(`metadata[${key}]`, String(value));
        });
      }
      const response = await fetch(`${this.baseUrl}/payment_intents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Stripe API error: ${response.statusText}`);
      }
      const intent = await response.json();
      return {
        id: intent.id,
        amount,
        currency,
        status: this.mapStripeStatus(intent.status),
        method,
        provider: "stripe",
        metadata,
        createdAt: new Date(intent.created * 1000),
        updatedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to create payment intent: ${error}`);
    }
  }
  async confirmPayment(
    paymentIntentId: string,
    paymentMethodId: string,
    additionalData?: Record<string, any>,
  ): Promise<PaymentIntent> {
    try {
      const formData = new URLSearchParams();
      formData.append("payment_method", paymentMethodId);
      if (additionalData?.return_url) {
        formData.append("return_url", additionalData.return_url);
      }
      const response = await fetch(
        `${this.baseUrl}/payment_intents/${paymentIntentId}/confirm`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData,
        },
      );
      if (!response.ok) {
        throw new Error(`Stripe API error: ${response.statusText}`);
      }
      const intent = await response.json();
      return {
        id: intent.id,
        amount: intent.amount / 100,
        currency: intent.currency.toUpperCase() as Currency,
        status: this.mapStripeStatus(intent.status),
        method: this.mapPaymentMethodBack(intent.payment_method_types[0]),
        provider: "stripe",
        createdAt: new Date(intent.created * 1000),
        updatedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to confirm payment: ${error}`);
    }
  }
  async refundPayment(
    paymentIntentId: string,
    amount?: number,
  ): Promise<PaymentIntent> {
    try {
      const formData = new URLSearchParams();
      formData.append("payment_intent", paymentIntentId);
      if (amount) {
        formData.append("amount", Math.round(amount * 100).toString());
      }
      const response = await fetch(`${this.baseUrl}/refunds`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Stripe API error: ${response.statusText}`);
      }
      const refund = await response.json();
      return {
        id: paymentIntentId,
        amount: refund.amount / 100,
        currency: refund.currency.toUpperCase() as Currency,
        status: "refunded",
        method: "credit_card",
        provider: "stripe",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to refund payment: ${error}`);
    }
  }
  async validatePaymentMethod(
    method: PaymentMethod_Interface,
  ): Promise<boolean> {
    if (!method.last4 || !method.expiryMonth || !method.expiryYear) {
      return false;
    }
    const now = new Date();
    const expiryDate = new Date(method.expiryYear, method.expiryMonth - 1, 1);
    return expiryDate > now;
  }
  async listPaymentMethods(
    customerId: string,
  ): Promise<PaymentMethod_Interface[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/customers/${customerId}/payment_methods`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${this.config.apiKey}` },
        },
      );
      if (!response.ok) {
        throw new Error(`Stripe API error: ${response.statusText}`);
      }
      const data = await response.json();
      return data.data.map((method: any) => ({
        id: method.id,
        provider: "stripe" as const,
        type: this.mapPaymentMethodBack(method.type),
        last4: method.card?.last4 || method.us_bank_account?.last4,
        expiryMonth: method.card?.exp_month,
        expiryYear: method.card?.exp_year,
        brand: method.card?.brand || method.us_bank_account?.bank_name,
        isDefault: false,
        isExpired:
          method.card && method.card.exp_year < new Date().getFullYear(),
        createdAt: new Date(method.created * 1000),
        updatedAt: new Date(),
      }));
    } catch (error) {
      throw new Error(`Failed to list payment methods: ${error}`);
    }
  }
  async deletePaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/payment_methods/${paymentMethodId}/detach`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${this.config.apiKey}` },
        },
      );
      return response.ok;
    } catch (error) {
      console.error("Failed to delete payment method:", error);
      return false;
    }
  }
  async handleWebhook(event: Record<string, any>): Promise<void> {
    const eventType = event.type;
    switch (eventType) {
      case "payment_intent.succeeded":
        console.log("Payment succeeded:", event.data.object.id);
        break;
      case "payment_intent.payment_failed":
        console.log("Payment failed:", event.data.object.id);
        break;
      case "charge.refunded":
        console.log("Charge refunded:", event.data.object.id);
        break;
      default:
        console.log("Unhandled event type:", eventType);
    }
  }
  private mapPaymentMethod(method: PaymentMethod): string {
    const mapping: Record<PaymentMethod, string> = {
      credit_card: "card",
      debit_card: "card",
      bank_transfer: "us_bank_account",
      digital_wallet: "klarna",
      ach: "us_bank_account",
      check: "card",
    };
    return mapping[method] || "card";
  }
  private mapPaymentMethodBack(stripeMethod: string): PaymentMethod {
    const mapping: Record<string, PaymentMethod> = {
      card: "credit_card",
      us_bank_account: "bank_transfer",
      klarna: "digital_wallet",
    };
    return mapping[stripeMethod] || "credit_card";
  }
  private mapStripeStatus(stripeStatus: string): PaymentStatus {
    const mapping: Record<string, PaymentStatus> = {
      requires_payment_method: "pending",
      requires_confirmation: "pending",
      requires_action: "processing",
      processing: "processing",
      requires_capture: "processing",
      succeeded: "completed",
      canceled: "cancelled",
    };
    return mapping[stripeStatus] || "pending";
  }
}
