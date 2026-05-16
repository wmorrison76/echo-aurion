import { supabase } from "@server/lib/supabase";
export type CurrencyCode =
  | "USD"
  | "EUR"
  | "GBP"
  | "JPY"
  | "CAD"
  | "AUD"
  | "CHF"
  | "CNY"
  | "INR"
  | "MXN"
  | "BRL"
  | "ZAR";
export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  decimalPlaces: number;
  isActive: boolean;
}
export interface ExchangeRate {
  id?: string;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: number;
  timestamp: Date;
  source: string;
}
export interface CurrencyConversion {
  from: { amount: number; currency: CurrencyCode };
  to: { amount: number; currency: CurrencyCode };
  rate: number;
  timestamp: Date;
}
export interface OutletCurrencyConfig {
  outletId: string;
  baseCurrency: CurrencyCode;
  supportedCurrencies: CurrencyCode[];
  displayFormat: "symbol" | "code" | "name";
  autoConvert: boolean;
  roundingMode: "round" | "ceil" | "floor";
  createdAt: Date;
  updatedAt: Date;
}
const SUPPORTED_CURRENCIES: Record<CurrencyCode, Currency> = {
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    locale: "en-US",
    decimalPlaces: 2,
    isActive: true,
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    locale: "de-DE",
    decimalPlaces: 2,
    isActive: true,
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    locale: "en-GB",
    decimalPlaces: 2,
    isActive: true,
  },
  JPY: {
    code: "JPY",
    symbol: "¥",
    name: "Japanese Yen",
    locale: "ja-JP",
    decimalPlaces: 0,
    isActive: true,
  },
  CAD: {
    code: "CAD",
    symbol: "C$",
    name: "Canadian Dollar",
    locale: "en-CA",
    decimalPlaces: 2,
    isActive: true,
  },
  AUD: {
    code: "AUD",
    symbol: "A$",
    name: "Australian Dollar",
    locale: "en-AU",
    decimalPlaces: 2,
    isActive: true,
  },
  CHF: {
    code: "CHF",
    symbol: "CHF",
    name: "Swiss Franc",
    locale: "de-CH",
    decimalPlaces: 2,
    isActive: true,
  },
  CNY: {
    code: "CNY",
    symbol: "¥",
    name: "Chinese Yuan",
    locale: "zh-CN",
    decimalPlaces: 2,
    isActive: true,
  },
  INR: {
    code: "INR",
    symbol: "₹",
    name: "Indian Rupee",
    locale: "en-IN",
    decimalPlaces: 2,
    isActive: true,
  },
  MXN: {
    code: "MXN",
    symbol: "$",
    name: "Mexican Peso",
    locale: "es-MX",
    decimalPlaces: 2,
    isActive: true,
  },
  BRL: {
    code: "BRL",
    symbol: "R$",
    name: "Brazilian Real",
    locale: "pt-BR",
    decimalPlaces: 2,
    isActive: true,
  },
  ZAR: {
    code: "ZAR",
    symbol: "R",
    name: "South African Rand",
    locale: "en-ZA",
    decimalPlaces: 2,
    isActive: true,
  },
};
export class CurrencyService {
  private exchangeRateCache: Map<string, { rate: number; timestamp: Date }> =
    new Map();
  private cacheExpiry: number = 3600000; // 1 hour in milliseconds getSupportedCurrencies(): Currency[] { return Object.values(SUPPORTED_CURRENCIES); } getCurrency(code: CurrencyCode): Currency | null { return SUPPORTED_CURRENCIES[code] || null; } async getExchangeRate(from: CurrencyCode, to: CurrencyCode): Promise<number> { if (from === to) return 1; const cacheKey = `${from}:${to}`; const cached = this.exchangeRateCache.get(cacheKey); if (cached && Date.now() - cached.timestamp.getTime() < this.cacheExpiry) { return cached.rate; } try { const { data, error } = await supabase .from("exchange_rates") .select("rate") .eq("from_currency", from) .eq("to_currency", to) .order("timestamp", { ascending: false }) .limit(1) .single(); if (error || !data) { throw new Error(`Exchange rate not found for ${from}/${to}`); } const rate = data.rate; this.exchangeRateCache.set(cacheKey, { rate, timestamp: new Date() }); return rate; } catch (error) { console.error("Failed to get exchange rate:", error); // Fallback to API if database fails return this.fetchExchangeRateFromApi(from, to); } } async convertCurrency( amount: number, from: CurrencyCode, to: CurrencyCode, ): Promise<CurrencyConversion> { const rate = await this.getExchangeRate(from, to); const convertedAmount = amount * rate; return { from: { amount, currency: from }, to: { amount: convertedAmount, currency: to }, rate, timestamp: new Date(), }; } async convertToBaseCurrency( amount: number, from: CurrencyCode, baseCurrency: CurrencyCode, ): Promise<number> { const conversion = await this.convertCurrency(amount, from, baseCurrency); return conversion.to.amount; } async convertFromBaseCurrency( amount: number, baseCurrency: CurrencyCode, to: CurrencyCode, ): Promise<number> { const conversion = await this.convertCurrency(amount, baseCurrency, to); return conversion.to.amount; } async updateExchangeRate( from: CurrencyCode, to: CurrencyCode, rate: number, source: string ="manual", ): Promise<void> { const { error } = await supabase.from("exchange_rates").insert({ from_currency: from, to_currency: to, rate, timestamp: new Date(), source, }); if (error) { console.error("Failed to update exchange rate:", error); throw error; } // Clear cache this.exchangeRateCache.delete(`${from}:${to}`); this.exchangeRateCache.delete(`${to}:${from}`); } async getOutletCurrencyConfig( outletId: string, ): Promise<OutletCurrencyConfig | null> { const { data, error } = await supabase .from("outlet_currency_config") .select("*") .eq("outlet_id", outletId) .single(); if (error || !data) return null; return { outletId: data.outlet_id, baseCurrency: data.base_currency, supportedCurrencies: data.supported_currencies, displayFormat: data.display_format, autoConvert: data.auto_convert, roundingMode: data.rounding_mode, createdAt: new Date(data.created_at), updatedAt: new Date(data.updated_at), }; } async setOutletCurrencyConfig(config: OutletCurrencyConfig): Promise<void> { const { error } = await supabase.from("outlet_currency_config").upsert({ outlet_id: config.outletId, base_currency: config.baseCurrency, supported_currencies: config.supportedCurrencies, display_format: config.displayFormat, auto_convert: config.autoConvert, rounding_mode: config.roundingMode, updated_at: new Date(), }); if (error) { console.error("Failed to set currency config:", error); throw error; } } formatCurrency( amount: number, currency: CurrencyCode, locale?: string, ): string { const curr = this.getCurrency(currency); if (!curr) return `${amount} ${currency}`; const fmt = new Intl.NumberFormat(locale || curr.locale, { style:"currency", currency, minimumFractionDigits: curr.decimalPlaces, maximumFractionDigits: curr.decimalPlaces, }); return fmt.format(amount); } roundAmount( amount: number, decimalPlaces: number = 2, mode:"round" |"ceil" |"floor" ="round", ): number { const factor = Math.pow(10, decimalPlaces); switch (mode) { case"ceil": return Math.ceil(amount * factor) / factor; case"floor": return Math.floor(amount * factor) / factor; case"round": default: return Math.round(amount * factor) / factor; } } private async fetchExchangeRateFromApi( from: CurrencyCode, to: CurrencyCode, ): Promise<number> { try { const apiKey = process.env.EXCHANGE_RATE_API_KEY; if (!apiKey) { throw new Error("Exchange rate API key not configured"); } const response = await fetch( `https://api.exchangerate-api.com/v4/latest/${from}`, { headers: { Authorization: `Bearer ${apiKey}` } }, ); if (!response.ok) { throw new Error("Failed to fetch exchange rate"); } const data = await response.json(); const rate = data.rates[to]; if (!rate) { throw new Error(`Rate not available for ${to}`); } return rate; } catch (error) { console.error("Exchange rate API failed:", error); throw error; } } isValidCurrency(code: string): code is CurrencyCode { return code in SUPPORTED_CURRENCIES; }
}
export const currencyService = new CurrencyService();
