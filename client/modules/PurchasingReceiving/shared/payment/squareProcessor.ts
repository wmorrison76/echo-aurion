import {
  PaymentProcessor,
  PaymentIntent,
  PaymentMethod_Interface,
  PaymentStatus,
  PaymentMethod,
  Currency,
  SquarePaymentConfig,
} from "../types/payment";
export class SquarePaymentProcessor implements PaymentProcessor {
  provider = "square" as const;
  private config: SquarePaymentConfig;
  private baseUrl = "https://connect.squareup.com";
  constructor(config: SquarePaymentConfig) {
    this.config = config;
  }
  async createPaymentIntent(
    amount: number,
    currency: Currency,
    method: PaymentMethod,
    metadata?: Record<string, any>,
  ): Promise<PaymentIntent> {
    try {
      const payload = {
        source_id: metadata?.source_id || "default",
        idempotency_key: `${Date.now()}-${Math.random()}`,
        amount_money: { amount: Math.round(amount * 100), currency },
        location_id: this.config.locationId,
        note: metadata?.description || "Payment for order",
        custom_id: metadata?.reference,
        autocomplete: true,
      };
      const response = await fetch(`${this.baseUrl}/v2/payments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json",
          "Square-Version": "2024-01-18",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Square API error: ${JSON.stringify(error)}`);
      }
      const payment = await response.json();
      return {
        id: payment.payment.id,
        amount,
        currency,
        status: this.mapSquareStatus(payment.payment.status),
        method,
        provider: "square",
        metadata,
        createdAt: new Date(payment.payment.created_at),
        updatedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to create Square payment: ${error}`);
    }
  }
  async confirmPayment(
    paymentIntentId: string,
    paymentMethodId: string,
    additionalData?: Record<string, any>,
  ): Promise<PaymentIntent> {
    try {
      const payload = {
        payment_method_id: paymentMethodId,
        verification_token: additionalData?.verification_token,
        idempotency_key: `${Date.now()}-${Math.random()}`,
      };
      const response = await fetch(
        `${this.baseUrl}/v2/payments/${paymentIntentId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            "Content-Type": "application/json",
            "Square-Version": "2024-01-18",
          },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error(`Square API error: ${response.statusText}`);
      }
      const payment = await response.json();
      return {
        id: payment.payment.id,
        amount: payment.payment.amount_money.amount / 100,
        currency: payment.payment.amount_money.currency as Currency,
        status: this.mapSquareStatus(payment.payment.status),
        method: "credit_card",
        provider: "square",
        createdAt: new Date(payment.payment.created_at),
        updatedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to confirm Square payment: ${error}`);
    }
  }
  async refundPayment(
    paymentIntentId: string,
    amount?: number,
  ): Promise<PaymentIntent> {
    try {
      const getPaymentResponse = await fetch(
        `${this.baseUrl}/v2/payments/${paymentIntentId}`,
        {
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            "Square-Version": "2024-01-18",
          },
        },
      );
      if (!getPaymentResponse.ok) {
        throw new Error("Failed to get payment details");
      }
      const paymentData = await getPaymentResponse.json();
      const payment = paymentData.payment;
      const payload: any = {
        idempotency_key: `${Date.now()}-${Math.random()}`,
        payment_id: paymentIntentId,
      };
      if (amount) {
        payload.amount_money = {
          amount: Math.round(amount * 100),
          currency: payment.amount_money.currency,
        };
      }
      const response = await fetch(`${this.baseUrl}/v2/refunds`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json",
          "Square-Version": "2024-01-18",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Square API error: ${response.statusText}`);
      }
      const refund = await response.json();
      return {
        id: paymentIntentId,
        amount:
          (refund.refund?.amount_money?.amount || payment.amount_money.amount) /
          100,
        currency: (refund.refund?.amount_money?.currency ||
          payment.amount_money.currency) as Currency,
        status: "refunded",
        method: "credit_card",
        provider: "square",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to refund Square payment: ${error}`);
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
        `${this.baseUrl}/v2/customers/${customerId}/cards`,
        {
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            "Square-Version": "2024-01-18",
          },
        },
      );
      if (!response.ok) {
        throw new Error(`Square API error: ${response.statusText}`);
      }
      const data = await response.json();
      return (data.cards || []).map((card: any) => ({
        id: card.id,
        provider: "square" as const,
        type: this.mapCardType(card.card_brand),
        last4: card.last_4,
        expiryMonth: parseInt(card.exp_month),
        expiryYear: parseInt(card.exp_year),
        brand: card.card_brand,
        isDefault: card.billing_address?.first_name === "Default",
        isExpired: parseInt(card.exp_year) < new Date().getFullYear(),
        createdAt: new Date(card.created_at),
        updatedAt: new Date(card.updated_at || card.created_at),
      }));
    } catch (error) {
      throw new Error(`Failed to list Square payment methods: ${error}`);
    }
  }
  async deletePaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v2/cards/${paymentMethodId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            "Square-Version": "2024-01-18",
          },
        },
      );
      return response.ok || response.status === 204;
    } catch (error) {
      console.error("Failed to delete Square payment method:", error);
      return false;
    }
  }
  async handleWebhook(event: Record<string, any>): Promise<void> {
    const eventType = event.type;
    switch (eventType) {
      case "payment.created":
        console.log("Payment created:", event.data.object.id);
        break;
      case "payment.updated":
        console.log("Payment updated:", event.data.object.id);
        break;
      case "refund.created":
        console.log("Refund created:", event.data.object.id);
        break;
      default:
        console.log("Unhandled Square event:", eventType);
    }
  }
  private mapCardType(brand: string): PaymentMethod {
    const mapping: Record<string, PaymentMethod> = {
      VISA: "credit_card",
      MASTERCARD: "credit_card",
      AMERICAN_EXPRESS: "credit_card",
      DISCOVER: "credit_card",
      DINERS: "credit_card",
    };
    return mapping[brand.toUpperCase()] || "credit_card";
  }
  private mapSquareStatus(status: string): PaymentStatus {
    const mapping: Record<string, PaymentStatus> = {
      PENDING: "pending",
      COMPLETED: "completed",
      CANCELED: "cancelled",
      FAILED: "failed",
      APPROVED: "processing",
    };
    return mapping[status] || "pending";
  }
}
