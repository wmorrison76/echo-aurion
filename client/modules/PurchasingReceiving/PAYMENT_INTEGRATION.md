# Advanced Payment Processing System

Comprehensive guide for Echo Ops payment processing with support for multiple payment providers.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Supported Providers](#supported-providers)
3. [Configuration](#configuration)
4. [Payment Methods](#payment-methods)
5. [Integration Examples](#integration-examples)
6. [Webhook Handling](#webhook-handling)
7. [API Reference](#api-reference)
8. [Security](#security)
9. [Testing](#testing)

## 🎯 Overview

The Echo Ops payment system provides:

- **Multi-provider support**: Stripe, PayPal, Square
- **Multiple payment methods**: Credit cards, bank transfers, digital wallets
- **Flexible currency support**: USD, EUR, GBP, CAD, AUD, JPY
- **Robust transaction tracking**: Full history and audit logs
- **Refund management**: Partial or full refunds with tracking
- **Webhook handling**: Real-time event notifications
- **Security compliance**: PCI-DSS, encryption, tokenization

## 💳 Supported Providers

### Stripe

- **Website**: https://stripe.com
- **Best for**: Global payments, high transaction volume
- **Supported methods**: Credit/debit cards, bank transfers, digital wallets
- **Documentation**: https://stripe.com/docs

### PayPal

- **Website**: https://www.paypal.com
- **Best for**: Established payment solution, international reach
- **Supported methods**: PayPal accounts, credit/debit cards, bank transfers
- **Documentation**: https://developer.paypal.com

### Square

- **Website**: https://squareup.com
- **Best for**: POS integration, in-person payments
- **Supported methods**: Credit/debit cards, gift cards
- **Documentation**: https://developer.squareup.com

## ⚙️ Configuration

### Environment Variables

```env
# Stripe Configuration
STRIPE_API_KEY=sk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx
STRIPE_API_VERSION=2024-01-18

# PayPal Configuration
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_MODE=live
PAYPAL_WEBHOOK_ID=xxx

# Square Configuration
SQUARE_APPLICATION_ID=xxx
SQUARE_ACCESS_TOKEN=xxx
SQUARE_LOCATION_ID=xxx
SQUARE_WEBHOOK_SIGNATURE_KEY=xxx

# Default Configuration
DEFAULT_CURRENCY=USD
SUPPORTED_CURRENCIES=USD,EUR,GBP,CAD,AUD,JPY
SUPPORTED_PAYMENT_METHODS=credit_card,debit_card,bank_transfer,digital_wallet,ach
```

### Initialize Payment Service

```typescript
import { PaymentService } from "@payment/paymentService";

const paymentConfig = {
  providers: {
    stripe: {
      apiKey: process.env.STRIPE_API_KEY!,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID!,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
      mode: (process.env.PAYPAL_MODE || "sandbox") as "sandbox" | "live",
      webhookId: process.env.PAYPAL_WEBHOOK_ID!,
    },
    square: {
      applicationId: process.env.SQUARE_APPLICATION_ID!,
      accessToken: process.env.SQUARE_ACCESS_TOKEN!,
      locationId: process.env.SQUARE_LOCATION_ID!,
      webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY!,
    },
  },
  defaultCurrency: "USD" as Currency,
  supportedCurrencies: ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"] as Currency[],
  supportedMethods: [
    "credit_card",
    "debit_card",
    "bank_transfer",
    "digital_wallet",
    "ach",
  ] as PaymentMethod[],
};

export const paymentService = new PaymentService(paymentConfig);
```

## 💰 Payment Methods

### Credit/Debit Card

```typescript
const intent = await paymentService.createPaymentIntent(
  100.0,
  "USD",
  "credit_card",
  "stripe",
  {
    description: "Order #12345",
    reference: "order-12345",
  },
);
```

### Bank Transfer (ACH)

```typescript
const intent = await paymentService.createPaymentIntent(
  500.0,
  "USD",
  "bank_transfer",
  "stripe",
  {
    description: "Vendor payment",
  },
);
```

### Digital Wallet (PayPal)

```typescript
const intent = await paymentService.createPaymentIntent(
  250.0,
  "USD",
  "digital_wallet",
  "paypal",
  {
    description: "Quick checkout",
  },
);
```

## 🔗 Integration Examples

### Create Payment Intent

```typescript
import { paymentService } from "@services/paymentService";

async function createPayment(
  outletId: string,
  amount: number,
  vendorId?: string,
) {
  try {
    const intent = await paymentService.createPaymentIntent(
      amount,
      "USD",
      "credit_card",
      "stripe",
      {
        description: `Payment for outlet ${outletId}`,
        reference: `order-${Date.now()}`,
        outletId,
        vendorId,
      },
    );

    // Save to database
    await supabase.from("payment_transactions").insert({
      outlet_id: outletId,
      vendor_id: vendorId,
      amount,
      currency: "USD",
      status: "pending",
      method: "credit_card",
      provider: "stripe",
      payment_intent_id: intent.id,
      metadata: { reference: intent.metadata?.reference },
    });

    return intent;
  } catch (error) {
    console.error("Payment creation failed:", error);
    throw error;
  }
}
```

### Confirm Payment

```typescript
async function confirmPayment(
  paymentIntentId: string,
  paymentMethodId: string,
) {
  try {
    const confirmation = await paymentService.confirmPayment(
      paymentIntentId,
      paymentMethodId,
      "stripe",
      {
        return_url: "https://example.com/payment-success",
      },
    );

    // Update transaction status
    await supabase
      .from("payment_transactions")
      .update({
        status: confirmation.status,
        updated_at: new Date(),
      })
      .eq("payment_intent_id", paymentIntentId);

    return confirmation;
  } catch (error) {
    console.error("Payment confirmation failed:", error);
    throw error;
  }
}
```

### Process Refund

```typescript
async function refundPayment(
  paymentIntentId: string,
  amount?: number,
  reason?: string,
) {
  try {
    const refund = await paymentService.refundPayment(
      paymentIntentId,
      "stripe",
      amount,
    );

    // Create refund record
    const { data: transaction } = await supabase
      .from("payment_transactions")
      .select("id")
      .eq("payment_intent_id", paymentIntentId)
      .single();

    if (transaction) {
      await supabase.from("refunds").insert({
        transaction_id: transaction.id,
        amount: amount || 0,
        currency: "USD",
        reason,
      });
    }

    return refund;
  } catch (error) {
    console.error("Refund failed:", error);
    throw error;
  }
}
```

### List Payment Methods

```typescript
async function getPaymentMethods(customerId: string) {
  try {
    const methods = await paymentService.listPaymentMethods(
      customerId,
      "stripe",
    );

    return methods
      .filter((m) => !m.isExpired)
      .map((m) => ({
        id: m.id,
        type: m.type,
        brand: m.brand,
        last4: m.last4,
        expiry: `${m.expiryMonth}/${m.expiryYear}`,
        isDefault: m.isDefault,
      }));
  } catch (error) {
    console.error("Failed to get payment methods:", error);
    throw error;
  }
}
```

## 🪝 Webhook Handling

### Stripe Webhooks

```typescript
import express from "express";
import { paymentService } from "@services/paymentService";

const router = express.Router();

router.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;

    try {
      // Verify webhook signature (implementation depends on your framework)
      const event = req.body;

      // Handle webhook event
      await paymentService.handleWebhook("stripe", event);

      // Store webhook event
      await supabase.from("payment_webhook_events").insert({
        type: event.type,
        provider: "stripe",
        timestamp: new Date(),
        data: event.data,
        processed: true,
        processed_at: new Date(),
      });

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).send(`Webhook Error: ${error}`);
    }
  },
);
```

### PayPal Webhooks

```typescript
router.post("/webhooks/paypal", express.json(), async (req, res) => {
  try {
    const event = req.body;

    await paymentService.handleWebhook("paypal", event);

    await supabase.from("payment_webhook_events").insert({
      type: event.event_type,
      provider: "paypal",
      timestamp: new Date(event.create_time),
      data: event,
      processed: true,
      processed_at: new Date(),
    });

    res.json({ status: "received" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(400).json({ error: error.message });
  }
});
```

### Square Webhooks

```typescript
router.post("/webhooks/square", express.json(), async (req, res) => {
  try {
    const event = req.body;

    await paymentService.handleWebhook("square", event);

    await supabase.from("payment_webhook_events").insert({
      type: event.type,
      provider: "square",
      timestamp: new Date(event.created_at),
      data: event.data,
      processed: true,
      processed_at: new Date(),
    });

    res.json({ status: "success" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(400).json({ error: error.message });
  }
});
```

## 🔌 API Reference

### PaymentService

```typescript
interface PaymentService {
  // Create payment intent
  createPaymentIntent(
    amount: number,
    currency: Currency,
    method: PaymentMethod,
    provider?: PaymentProvider,
    metadata?: Record<string, any>,
  ): Promise<PaymentIntent>;

  // Confirm payment
  confirmPayment(
    paymentIntentId: string,
    paymentMethodId: string,
    provider?: PaymentProvider,
    additionalData?: Record<string, any>,
  ): Promise<PaymentIntent>;

  // Refund payment
  refundPayment(
    paymentIntentId: string,
    provider?: PaymentProvider,
    amount?: number,
  ): Promise<PaymentIntent>;

  // Get available providers
  getAvailableProviders(): PaymentProvider[];

  // Get available payment methods
  getAvailableMethods(): PaymentMethod[];

  // Check currency support
  isCurrencySupported(currency: Currency): boolean;

  // Set default provider
  setDefaultProvider(provider: PaymentProvider): void;
}
```

## 🔒 Security

### Best Practices

1. **Never store card data**: Always use tokenization
2. **Use webhooks**: Don't rely on redirects for confirmation
3. **Verify signatures**: Validate all webhook signatures
4. **Use HTTPS**: All API calls must use HTTPS
5. **Encrypt metadata**: Sensitive data should be encrypted
6. **Implement 3D Secure**: Required for high-risk transactions
7. **Regular testing**: Test payment flows regularly

### Tokenization

```typescript
// Always tokenize payment methods
async function tokenizeCard(cardData: {
  number: string;
  exp_month: number;
  exp_year: number;
  cvc: string;
}) {
  // Use provider's tokenization API
  // Never send raw card data to your server
  const token = await stripe.createToken("card", cardData);
  return token.id;
}
```

### Data Encryption

```typescript
import crypto from "crypto";

function encryptPaymentMetadata(metadata: Record<string, any>): string {
  const cipher = crypto.createCipher("aes192", process.env.ENCRYPTION_KEY!);
  let encrypted = cipher.update(JSON.stringify(metadata), "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

function decryptPaymentMetadata(encrypted: string): Record<string, any> {
  const decipher = crypto.createDecipher("aes192", process.env.ENCRYPTION_KEY!);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
}
```

## 🧪 Testing

### Unit Tests

```typescript
import { describe, it, expect, beforeEach } from "@jest/globals";
import { PaymentService } from "@payment/paymentService";

describe("PaymentService", () => {
  let service: PaymentService;

  beforeEach(() => {
    service = new PaymentService({
      providers: {
        stripe: {
          apiKey: "sk_test_xxx",
          webhookSecret: "whsec_test_xxx",
        },
      },
      defaultCurrency: "USD",
      supportedCurrencies: ["USD"],
      supportedMethods: ["credit_card"],
    });
  });

  it("should create payment intent", async () => {
    const intent = await service.createPaymentIntent(
      100,
      "USD",
      "credit_card",
      "stripe",
    );
    expect(intent.id).toBeTruthy();
    expect(intent.amount).toBe(100);
    expect(intent.status).toBe("pending");
  });

  it("should validate supported currencies", () => {
    expect(service.isCurrencySupported("USD")).toBe(true);
    expect(service.isCurrencySupported("GBP")).toBe(false);
  });
});
```

### Integration Tests

```typescript
describe("Payment Integration", () => {
  it("should process full payment flow", async () => {
    // Create intent
    const intent = await paymentService.createPaymentIntent(
      100,
      "USD",
      "credit_card",
      "stripe",
    );

    // Confirm payment
    const confirmation = await paymentService.confirmPayment(
      intent.id,
      "pm_card_visa",
    );
    expect(confirmation.status).toBe("completed");

    // Create refund
    const refund = await paymentService.refundPayment(intent.id);
    expect(refund.status).toBe("refunded");
  });
});
```

## 📊 Payment Reporting

### Get Payment Statistics

```sql
SELECT * FROM get_payment_stats(
  p_outlet_id := '550e8400-e29b-41d4-a716-446655440000',
  p_start_date := '2024-01-01',
  p_end_date := '2024-01-31'
);
```

### Transaction Analysis

```typescript
async function getPaymentAnalytics(outletId: string) {
  const { data, error } = await supabase.rpc("get_payment_stats", {
    p_outlet_id: outletId,
    p_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    p_end_date: new Date(),
  });

  if (error) throw error;

  return {
    totalTransactions: data.total_transactions,
    totalAmount: data.total_amount,
    completedAmount: data.completed_amount,
    failedCount: data.failed_count,
    refundedAmount: data.refunded_amount,
    averageTransactionAmount: data.avg_transaction_amount,
  };
}
```

## 🚀 Deployment Checklist

- [ ] Set all environment variables correctly
- [ ] Configure webhook endpoints with providers
- [ ] Test payment flows in sandbox mode
- [ ] Enable 3D Secure for high-risk transactions
- [ ] Set up payment reconciliation process
- [ ] Configure failed payment notifications
- [ ] Set up payment processing logs
- [ ] Test refund workflows
- [ ] Configure PCI compliance
- [ ] Set up fraud detection rules
- [ ] Document payment procedures for staff
- [ ] Configure payment retry logic

## 📞 Support

For payment-related issues:

- Stripe: support@stripe.com
- PayPal: developer.paypal.com/support
- Square: support.squareup.com

---

**Version**: 1.0.0  
**Last Updated**: 2024
