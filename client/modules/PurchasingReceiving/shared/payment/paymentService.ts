import {
  PaymentProcessor,
  PaymentIntent,
  PaymentMethod_Interface,
  PaymentTransaction,
  RefundRequest,
  RefundTransaction,
  PaymentStatus,
  PaymentMethod,
  Currency,
  PaymentProvider,
  PaymentConfig,
} from "../types/payment";
import { StripePaymentProcessor } from "./stripeProcessor";
import { PayPalPaymentProcessor } from "./paypalProcessor";
import { SquarePaymentProcessor } from "./squareProcessor";
export class PaymentService {
  private processors: Map<PaymentProvider, PaymentProcessor> = new Map();
  private config: PaymentConfig;
  private defaultProvider: PaymentProvider = "stripe";
  constructor(config: PaymentConfig) {
    this.config = config;
    this.initializeProcessors();
  }
  private initializeProcessors(): void {
    if (this.config.providers.stripe) {
      this.processors.set(
        "stripe",
        new StripePaymentProcessor(this.config.providers.stripe),
      );
    }
    if (this.config.providers.paypal) {
      this.processors.set(
        "paypal",
        new PayPalPaymentProcessor(this.config.providers.paypal),
      );
    }
    if (this.config.providers.square) {
      this.processors.set(
        "square",
        new SquarePaymentProcessor(this.config.providers.square),
      );
    }
  }
  private getProcessor(provider: PaymentProvider): PaymentProcessor {
    const processor = this.processors.get(provider);
    if (!processor) {
      throw new Error(`Payment processor not configured: ${provider}`);
    }
    return processor;
  }
  async createPaymentIntent(
    amount: number,
    currency: Currency,
    method: PaymentMethod,
    provider?: PaymentProvider,
    metadata?: Record<string, any>,
  ): Promise<PaymentIntent> {
    const selectedProvider = provider || this.defaultProvider;
    const processor = this.getProcessor(selectedProvider);
    return processor.createPaymentIntent(amount, currency, method, metadata);
  }
  async confirmPayment(
    paymentIntentId: string,
    paymentMethodId: string,
    provider?: PaymentProvider,
    additionalData?: Record<string, any>,
  ): Promise<PaymentIntent> {
    const selectedProvider = provider || this.defaultProvider;
    const processor = this.getProcessor(selectedProvider);
    return processor.confirmPayment(
      paymentIntentId,
      paymentMethodId,
      additionalData,
    );
  }
  async refundPayment(
    paymentIntentId: string,
    provider?: PaymentProvider,
    amount?: number,
  ): Promise<PaymentIntent> {
    const selectedProvider = provider || this.defaultProvider;
    const processor = this.getProcessor(selectedProvider);
    return processor.refundPayment(paymentIntentId, amount);
  }
  async validatePaymentMethod(
    method: PaymentMethod_Interface,
  ): Promise<boolean> {
    const processor = this.getProcessor(method.provider);
    return processor.validatePaymentMethod(method);
  }
  async listPaymentMethods(
    customerId: string,
    provider?: PaymentProvider,
  ): Promise<PaymentMethod_Interface[]> {
    const selectedProvider = provider || this.defaultProvider;
    const processor = this.getProcessor(selectedProvider);
    return processor.listPaymentMethods(customerId);
  }
  async deletePaymentMethod(
    paymentMethodId: string,
    provider?: PaymentProvider,
  ): Promise<boolean> {
    const selectedProvider = provider || this.defaultProvider;
    const processor = this.getProcessor(selectedProvider);
    return processor.deletePaymentMethod(paymentMethodId);
  }
  async handleWebhook(
    provider: PaymentProvider,
    event: Record<string, any>,
  ): Promise<void> {
    const processor = this.getProcessor(provider);
    return processor.handleWebhook(event);
  }
  getAvailableProviders(): PaymentProvider[] {
    return Array.from(this.processors.keys());
  }
  getAvailableMethods(): PaymentMethod[] {
    return this.config.supportedMethods;
  }
  getAvailableCurrencies(): Currency[] {
    return this.config.supportedCurrencies;
  }
  setDefaultProvider(provider: PaymentProvider): void {
    if (!this.processors.has(provider)) {
      throw new Error(`Payment processor not configured: ${provider}`);
    }
    this.defaultProvider = provider;
  }
  getDefaultProvider(): PaymentProvider {
    return this.defaultProvider;
  }
  isCurrencySupported(currency: Currency): boolean {
    return this.config.supportedCurrencies.includes(currency);
  }
  isMethodSupported(method: PaymentMethod): boolean {
    return this.config.supportedMethods.includes(method);
  }
}
export class PaymentTransactionService {
  private transactions: Map<string, PaymentTransaction> = new Map();
  private refunds: Map<string, RefundTransaction> = new Map();
  async recordTransaction(transaction: PaymentTransaction): Promise<void> {
    this.transactions.set(transaction.id, transaction);
  }
  async getTransaction(
    transactionId: string,
  ): Promise<PaymentTransaction | null> {
    return this.transactions.get(transactionId) || null;
  }
  async updateTransactionStatus(
    transactionId: string,
    status: PaymentStatus,
    metadata?: Record<string, any>,
  ): Promise<PaymentTransaction | null> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return null;
    const updated = {
      ...transaction,
      status,
      updatedAt: new Date(),
      ...(status === "completed" && { completedAt: new Date() }),
      ...(metadata && { metadata: { ...transaction.metadata, ...metadata } }),
    };
    this.transactions.set(transactionId, updated);
    return updated;
  }
  async listTransactions(outletId: string): Promise<PaymentTransaction[]> {
    return Array.from(this.transactions.values()).filter(
      (t) => t.outletId === outletId,
    );
  }
  async recordRefund(refund: RefundTransaction): Promise<void> {
    this.refunds.set(refund.id, refund);
  }
  async getRefund(refundId: string): Promise<RefundTransaction | null> {
    return this.refunds.get(refundId) || null;
  }
  async listRefunds(transactionId: string): Promise<RefundTransaction[]> {
    return Array.from(this.refunds.values()).filter(
      (r) => r.transactionId === transactionId,
    );
  }
  async calculateRefundableAmount(transactionId: string): Promise<number> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return 0;
    const refunds = await this.listRefunds(transactionId);
    const refundedAmount = refunds.reduce((sum, r) => sum + r.amount, 0);
    return transaction.amount - refundedAmount;
  }
}
