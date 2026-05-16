# Multi-Currency Support System

Comprehensive guide for implementing and managing multi-currency support across Echo Ops.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Supported Currencies](#supported-currencies)
3. [Configuration](#configuration)
4. [Exchange Rates](#exchange-rates)
5. [Currency Conversion](#currency-conversion)
6. [Pricing Strategy](#pricing-strategy)
7. [API Integration](#api-integration)
8. [Frontend Implementation](#frontend-implementation)
9. [Reporting & Analytics](#reporting--analytics)
10. [Best Practices](#best-practices)

## 🎯 Overview

The multi-currency system provides:

- **12+ supported currencies**: USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, MXN, BRL, ZAR
- **Real-time exchange rates**: Automatic fetching from external APIs
- **Per-outlet configuration**: Each outlet can have its own base currency
- **Currency conversion**: Automatic conversion between currencies
- **Localized formatting**: Display currencies according to locale
- **Pricing flexibility**: Store and retrieve prices in different currencies
- **Audit trail**: Complete history of all conversions
- **Rounding control**: Configurable rounding methods

## 💱 Supported Currencies

| Code | Symbol | Name               | Decimal Places | Locale |
| ---- | ------ | ------------------ | -------------- | ------ |
| USD  | $      | US Dollar          | 2              | en-US  |
| EUR  | €      | Euro               | 2              | de-DE  |
| GBP  | £      | British Pound      | 2              | en-GB  |
| JPY  | ¥      | Japanese Yen       | 0              | ja-JP  |
| CAD  | C$     | Canadian Dollar    | 2              | en-CA  |
| AUD  | A$     | Australian Dollar  | 2              | en-AU  |
| CHF  | CHF    | Swiss Franc        | 2              | de-CH  |
| CNY  | ¥      | Chinese Yuan       | 2              | zh-CN  |
| INR  | ₹      | Indian Rupee       | 2              | en-IN  |
| MXN  | $      | Mexican Peso       | 2              | es-MX  |
| BRL  | R$     | Brazilian Real     | 2              | pt-BR  |
| ZAR  | R      | South African Rand | 2              | en-ZA  |

## ⚙️ Configuration

### Set Up Outlet Currency Configuration

```typescript
import { currencyService } from "@shared/currency/currencyService";

async function configureOutletCurrency(
  outletId: string,
  baseCurrency: "USD" | "EUR" | "GBP",
  supportedCurrencies: string[],
) {
  await currencyService.setOutletCurrencyConfig({
    outletId,
    baseCurrency,
    supportedCurrencies: supportedCurrencies as any,
    displayFormat: "symbol",
    autoConvert: true,
    roundingMode: "round",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

// Example usage
await configureOutletCurrency("outlet-123", "EUR", ["EUR", "USD", "GBP"]);
```

### Environment Variables

```env
# Exchange Rate Configuration
EXCHANGE_RATE_API_KEY=your-api-key
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4
EXCHANGE_RATE_UPDATE_INTERVAL=3600000  # 1 hour in milliseconds

# Default Settings
DEFAULT_BASE_CURRENCY=USD
DEFAULT_DECIMAL_PLACES=2
DEFAULT_ROUNDING_MODE=round
```

## 💹 Exchange Rates

### Get Current Exchange Rate

```typescript
const rate = await currencyService.getExchangeRate("USD", "EUR");
console.log(`1 USD = ${rate} EUR`);
```

### Convert Amount

```typescript
const conversion = await currencyService.convertCurrency(100, "USD", "EUR");
console.log(`100 USD = ${conversion.to.amount} EUR`);
console.log(`Exchange rate: ${conversion.rate}`);
```

### Update Exchange Rate Manually

```typescript
await currencyService.updateExchangeRate("USD", "EUR", 0.92, "manual");
```

### Auto-Update Exchange Rates

```typescript
// Scheduled job (runs every hour)
import cron from "node-cron";

cron.schedule("0 * * * *", async () => {
  try {
    const pairs = [
      ["USD", "EUR"],
      ["USD", "GBP"],
      ["USD", "JPY"],
      // ... more pairs
    ];

    for (const [from, to] of pairs) {
      const rate = await fetchExchangeRateFromAPI(from, to);
      await currencyService.updateExchangeRate(from, to, rate, "api");
    }

    console.log("Exchange rates updated");
  } catch (error) {
    console.error("Failed to update exchange rates:", error);
  }
});

async function fetchExchangeRateFromAPI(from: string, to: string) {
  const response = await fetch(
    `https://api.exchangerate-api.com/v4/latest/${from}`,
    {
      headers: { Authorization: `Bearer ${process.env.EXCHANGE_RATE_API_KEY}` },
    },
  );
  const data = await response.json();
  return data.rates[to];
}
```

## 🔄 Currency Conversion

### Convert to Base Currency

```typescript
async function recordPaymentInBaseCurrency(
  outletId: string,
  amount: number,
  paymentCurrency: string,
) {
  const config = await currencyService.getOutletCurrencyConfig(outletId);
  if (!config) throw new Error("Outlet not configured");

  const baseAmount = await currencyService.convertToBaseCurrency(
    amount,
    paymentCurrency as any,
    config.baseCurrency,
  );

  return baseAmount;
}
```

### Convert from Base Currency

```typescript
async function displayPriceInCustomerCurrency(
  outletId: string,
  baseAmount: number,
  customerCurrency: string,
) {
  const config = await currencyService.getOutletCurrencyConfig(outletId);
  if (!config) throw new Error("Outlet not configured");

  const displayAmount = await currencyService.convertFromBaseCurrency(
    baseAmount,
    config.baseCurrency,
    customerCurrency as any,
  );

  return displayAmount;
}
```

### Multi-Currency Transaction

```typescript
async function recordMultiCurrencyTransaction(
  outletId: string,
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  referenceId: string,
) {
  const conversion = await currencyService.convertCurrency(
    amount,
    fromCurrency as any,
    toCurrency as any,
  );

  // Log the conversion
  const { data } = await supabase.from("currency_conversion_logs").insert({
    outlet_id: outletId,
    from_amount: conversion.from.amount,
    from_currency: conversion.from.currency,
    to_amount: conversion.to.amount,
    to_currency: conversion.to.currency,
    rate: conversion.rate,
    reference_type: "transaction",
    reference_id: referenceId,
  });

  return conversion;
}
```

## 💰 Pricing Strategy

### Dynamic Pricing by Currency

```typescript
async function getPriceForCurrency(
  productId: string,
  outletId: string,
  currency: string,
) {
  // Check if specific price exists for this currency/outlet
  const { data: specificPrice } = await supabase
    .from("product_pricing_by_currency")
    .select("price")
    .eq("product_id", productId)
    .eq("outlet_id", outletId)
    .eq("currency", currency)
    .single();

  if (specificPrice) {
    return specificPrice.price;
  }

  // Fall back to conversion from base price
  const { data: basePrice } = await supabase
    .from("products")
    .select("price")
    .eq("id", productId)
    .single();

  if (!basePrice) throw new Error("Product not found");

  const config = await currencyService.getOutletCurrencyConfig(outletId);
  if (!config) throw new Error("Outlet not configured");

  return currencyService.convertFromBaseCurrency(
    basePrice.price,
    config.baseCurrency,
    currency as any,
  );
}
```

### Vendor Pricing by Currency

```typescript
async function getVendorPrice(
  vendorId: string,
  productId: string,
  outletId: string,
  currency: string,
) {
  const { data } = await supabase
    .from("vendor_pricing_by_currency")
    .select("price, minimum_order")
    .eq("vendor_id", vendorId)
    .eq("product_id", productId)
    .eq("outlet_id", outletId)
    .eq("currency", currency)
    .single();

  if (data) {
    return {
      price: data.price,
      minimumOrder: data.minimum_order,
      currency,
    };
  }

  throw new Error("Vendor pricing not found for specified currency");
}
```

### Set Custom Pricing

```typescript
async function setCustomPricing(
  productId: string,
  outletId: string,
  currency: string,
  price: number,
  cost?: number,
) {
  const { error } = await supabase.from("product_pricing_by_currency").upsert({
    product_id: productId,
    outlet_id: outletId,
    currency,
    price,
    cost,
    updated_at: new Date(),
  });

  if (error) throw error;
}
```

## 🔌 API Integration

### Create Payment with Multiple Currencies

```typescript
async function createPaymentWithConversion(
  outletId: string,
  amount: number,
  paymentCurrency: string,
  referenceId: string,
) {
  const config = await currencyService.getOutletCurrencyConfig(outletId);
  if (!config) throw new Error("Outlet not configured");

  // Convert to base currency for storage
  const conversion = await currencyService.convertCurrency(
    amount,
    paymentCurrency as any,
    config.baseCurrency,
  );

  // Record payment with both original and converted amounts
  const { data, error } = await supabase.from("payment_transactions").insert({
    outlet_id: outletId,
    amount: conversion.to.amount,
    currency: config.baseCurrency,
    original_amount: amount,
    original_currency: paymentCurrency,
    converted_rate: conversion.rate,
    status: "completed",
    reference: referenceId,
  });

  if (error) throw error;
  return data;
}
```

### Report in Different Currency

```typescript
async function getRevenueInCurrency(
  outletId: string,
  targetCurrency: string,
  startDate: Date,
  endDate: Date,
) {
  const { data: transactions } = await supabase
    .from("payment_transactions")
    .select("amount, currency")
    .eq("outlet_id", outletId)
    .gte("created_at", startDate)
    .lt("created_at", endDate);

  if (!transactions) return 0;

  let totalInTarget = 0;

  for (const transaction of transactions) {
    const converted = await currencyService.convertCurrency(
      transaction.amount,
      transaction.currency as any,
      targetCurrency as any,
    );
    totalInTarget += converted.to.amount;
  }

  return totalInTarget;
}
```

## 🖥️ Frontend Implementation

### Display Currency

```typescript
function formatPrice(
  amount: number,
  currency: string,
  locale?: string
): string {
  return currencyService.formatCurrency(amount, currency as any, locale);
}

// Usage
<Text>{formatPrice(99.99, 'USD', 'en-US')}</Text>
// Output: $99.99

<Text>{formatPrice(99.99, 'EUR', 'de-DE')}</Text>
// Output: 99,99 €
```

### Currency Selector Component

```typescript
function CurrencySelector() {
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const currencies = currencyService.getSupportedCurrencies();

  return (
    <select value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)}>
      {currencies.map((currency) => (
        <option key={currency.code} value={currency.code}>
          {currency.symbol} {currency.code} - {currency.name}
        </option>
      ))}
    </select>
  );
}
```

### Real-Time Conversion Display

```typescript
function CurrencyConverter() {
  const [amount, setAmount] = useState(100);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [rate, setRate] = useState(0);

  useEffect(() => {
    const convert = async () => {
      const conversion = await currencyService.convertCurrency(
        amount,
        fromCurrency as any,
        toCurrency as any
      );
      setConvertedAmount(conversion.to.amount);
      setRate(conversion.rate);
    };

    convert();
  }, [amount, fromCurrency, toCurrency]);

  return (
    <div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
      />
      <select value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)}>
        {currencyService.getSupportedCurrencies().map((c) => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </select>
      <span>=</span>
      <input type="number" value={convertedAmount} readOnly />
      <select value={toCurrency} onChange={(e) => setToCurrency(e.target.value)}>
        {currencyService.getSupportedCurrencies().map((c) => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </select>
      <p>Rate: 1 {fromCurrency} = {rate} {toCurrency}</p>
    </div>
  );
}
```

## 📊 Reporting & Analytics

### Currency Distribution Report

```typescript
async function getCurrencyDistributionReport(
  outletId: string,
  startDate: Date,
  endDate: Date,
) {
  const { data: transactions } = await supabase
    .from("payment_transactions")
    .select("currency, amount")
    .eq("outlet_id", outletId)
    .gte("created_at", startDate)
    .lt("created_at", endDate);

  const distribution: Record<string, number> = {};

  transactions?.forEach((t) => {
    if (!distribution[t.currency]) {
      distribution[t.currency] = 0;
    }
    distribution[t.currency] += t.amount;
  });

  return distribution;
}
```

### Exchange Rate Volatility

```typescript
async function getExchangeRateVolatility(currency: string, days: number = 30) {
  const { data: history } = await supabase
    .from("currency_exchange_history")
    .select("*")
    .eq("currency", currency)
    .gte("date", new Date(Date.now() - days * 24 * 60 * 60 * 1000))
    .order("date", { ascending: true });

  if (!history || history.length === 0) return null;

  const rates = history.map((h) => h.closing_rate || h.high_rate || 0);
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  const variance =
    rates.reduce((sum, rate) => sum + Math.pow(rate - avg, 2), 0) /
    rates.length;
  const volatility = Math.sqrt(variance);

  return {
    average: avg,
    volatility,
    min: Math.min(...rates),
    max: Math.max(...rates),
    range: Math.max(...rates) - Math.min(...rates),
  };
}
```

## 🔒 Best Practices

1. **Store in Base Currency**: Always store amounts in the outlet's base currency
2. **Cache Exchange Rates**: Use caching to reduce API calls
3. **Log Conversions**: Keep audit trail of all conversions
4. **Rounding Strategy**: Define rounding rules clearly
5. **Validate Currencies**: Verify currency codes before conversion
6. **Error Handling**: Handle missing exchange rates gracefully
7. **Timezone Awareness**: Consider timezones when updating rates
8. **Testing**: Test edge cases and unusual exchange rates
9. **Documentation**: Document all currency conventions
10. **Monitoring**: Track conversion errors and API failures

## 🚀 Deployment Checklist

- [ ] Set exchange rate API credentials
- [ ] Configure all supported currencies
- [ ] Set default rounding mode
- [ ] Run database migrations
- [ ] Set up exchange rate update job
- [ ] Configure currency display format
- [ ] Test currency conversion
- [ ] Set up exchange rate monitoring
- [ ] Configure fallback rates
- [ ] Document currency handling for staff

---

**Version**: 1.0.0  
**Last Updated**: 2024
