export type PaymentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "refunded"
  | "cancelled";
export type PaymentMethod =
  | "credit_card"
  | "debit_card"
  | "bank_transfer"
  | "digital_wallet"
  | "ach"
  | "check";
export type PaymentProvider = "stripe" | "paypal" | "square" | "manual";
export type Currency = "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "JPY";
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  method: PaymentMethod;
  provider: PaymentProvider;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
export interface PaymentMethod_Interface {
  id: string;
  provider: PaymentProvider;
  type: PaymentMethod;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  brand?: string;
  isDefault: boolean;
  isExpired: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface PaymentProcessor {
  provider: PaymentProvider;
  createPaymentIntent(
    amount: number,
    currency: Currency,
    method: PaymentMethod,
    metadata?: Record<string, any>,
  ): Promise<PaymentIntent>;
  confirmPayment(
    paymentIntentId: string,
    paymentMethodId: string,
    additionalData?: Record<string, any>,
  ): Promise<PaymentIntent>;
  refundPayment(
    paymentIntentId: string,
    amount?: number,
  ): Promise<PaymentIntent>;
  validatePaymentMethod(method: PaymentMethod_Interface): Promise<boolean>;
  listPaymentMethods(customerId: string): Promise<PaymentMethod_Interface[]>;
  deletePaymentMethod(paymentMethodId: string): Promise<boolean>;
  handleWebhook(event: Record<string, any>): Promise<void>;
}
export interface StripePaymentConfig {
  apiKey: string;
  webhookSecret: string;
  apiVersion?: string;
}
export interface PayPalPaymentConfig {
  clientId: string;
  clientSecret: string;
  mode: "sandbox" | "live";
  webhookId: string;
}
export interface SquarePaymentConfig {
  applicationId: string;
  accessToken: string;
  locationId: string;
  webhookSignatureKey: string;
}
export interface PaymentTransaction {
  id: string;
  outletId: string;
  vendorId?: string;
  customerId?: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  method: PaymentMethod;
  provider: PaymentProvider;
  paymentIntentId: string;
  reference?: string;
  description?: string;
  metadata?: Record<string, any>;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
export interface RefundRequest {
  transactionId: string;
  amount?: number;
  reason?: string;
  metadata?: Record<string, any>;
}
export interface RefundTransaction {
  id: string;
  transactionId: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  reason?: string;
  processedAt?: Date;
  createdAt: Date;
}
export interface PaymentWebhookEvent {
  id: string;
  type: string;
  provider: PaymentProvider;
  timestamp: Date;
  data: Record<string, any>;
  processed: boolean;
  processedAt?: Date;
}
export interface PaymentConfig {
  providers: {
    stripe?: StripePaymentConfig;
    paypal?: PayPalPaymentConfig;
    square?: SquarePaymentConfig;
  };
  defaultCurrency: Currency;
  supportedCurrencies: Currency[];
  supportedMethods: PaymentMethod[];
}
