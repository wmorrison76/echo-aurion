/**
 * Money — fixed-precision currency primitive for EchoAurum (B1)
 *
 * The 409A reviewer's first finding on the codebase was that EchoAurum
 * stored every dollar amount as a JS `number` (IEEE-754 double) and
 * masked the resulting drift with a `Math.abs(debits - credits) < 0.01`
 * tolerance. That's not CPA-grade: a casino reconciling $500K of small
 * bets, or a multi-property operator summing thousands of transactions,
 * accumulates rounding errors big enough to break a trial balance.
 *
 * This module gives EchoAurum a real Money type backed by Decimal.js
 * for arbitrary-precision arithmetic. The wire format is a fixed-2
 * decimal string ("123.45"), branded so TypeScript stops you doing
 * accidental float math like `invoice.amount + payment.amount`. All
 * arithmetic and comparison goes through helpers that round-trip
 * through Decimal.js without ever touching `number`.
 *
 * Storage shape:
 *   wire / DB:    string  ("123.45")
 *   in code:      Money   (branded string)
 *   for math:     Decimal (private to this module)
 *
 * For display you can use `format(m)` (locale-aware) or `toNumber(m)`
 * if you really need a number for a chart axis or a percentage. Never
 * use `toNumber` for arithmetic — it defeats the whole point.
 *
 * Currency precision:
 *   Default precision is 2 decimal places (cents). For currencies that
 *   trade in 3 (e.g. JOD) or 4 (e.g. UYI) decimals, pass `precision`
 *   to `money()` and the helpers respect it. The branded type doesn't
 *   carry currency code — the surrounding type (e.g. LedgerInvoice)
 *   carries the currency separately, as in the existing finance.ts.
 *
 * For exchange rates use `Rate` (6-decimal precision) — separate brand,
 * separate helpers, so rates and amounts can never accidentally mix.
 */

import Decimal from "decimal.js";

// Configure once at module load. ROUND_HALF_EVEN ("banker's rounding")
// is the GAAP-recommended default for accounting; ROUND_HALF_UP is the
// alternative for jurisdictions that mandate it. Switch via env if
// regulatory needs differ later.
Decimal.set({
  precision: 40,                                 // internal precision for ops
  rounding:
    (process.env.MONEY_ROUNDING || "").toUpperCase() === "HALF_UP"
      ? Decimal.ROUND_HALF_UP
      : Decimal.ROUND_HALF_EVEN,
});

declare const __MoneyBrand: unique symbol;
declare const __RateBrand: unique symbol;

export type Money = string & { readonly [__MoneyBrand]: "Money" };
export type Rate  = string & { readonly [__RateBrand]: "Rate" };

const DEFAULT_MONEY_DECIMALS = 2;
const DEFAULT_RATE_DECIMALS  = 6;

// ─── Constructors ────────────────────────────────────────────────────

export function money(input: number | string | Decimal | Money, decimals = DEFAULT_MONEY_DECIMALS): Money {
  if (input == null) {
    throw new TypeError("money(): null/undefined input");
  }
  const d = input instanceof Decimal ? input : new Decimal(String(input));
  if (!d.isFinite()) {
    throw new TypeError(`money(): non-finite input ${String(input)}`);
  }
  return d.toFixed(decimals) as Money;
}

export function rate(input: number | string | Decimal | Rate, decimals = DEFAULT_RATE_DECIMALS): Rate {
  if (input == null) {
    throw new TypeError("rate(): null/undefined input");
  }
  const d = input instanceof Decimal ? input : new Decimal(String(input));
  if (!d.isFinite()) {
    throw new TypeError(`rate(): non-finite input ${String(input)}`);
  }
  return d.toFixed(decimals) as Rate;
}

export const ZERO = money(0);
export const ONE  = money(1);

// ─── Type guards ─────────────────────────────────────────────────────

const MONEY_RE = /^-?\d+(?:\.\d+)?$/;

export function isMoney(value: unknown): value is Money {
  return typeof value === "string" && MONEY_RE.test(value);
}

export function asMoney(value: unknown, decimals = DEFAULT_MONEY_DECIMALS): Money {
  if (isMoney(value)) return money(value, decimals);
  if (typeof value === "number" || typeof value === "string" || value instanceof Decimal) {
    return money(value as any, decimals);
  }
  throw new TypeError(`asMoney(): cannot coerce ${typeof value} to Money`);
}

// ─── Arithmetic ──────────────────────────────────────────────────────

function dec(m: Money | Rate): Decimal {
  return new Decimal(m);
}

export function add(a: Money, b: Money, decimals = DEFAULT_MONEY_DECIMALS): Money {
  return dec(a).plus(dec(b)).toFixed(decimals) as Money;
}

export function sub(a: Money, b: Money, decimals = DEFAULT_MONEY_DECIMALS): Money {
  return dec(a).minus(dec(b)).toFixed(decimals) as Money;
}

/**
 * Multiply Money by a unit-less scalar (qty, percentage, ratio).
 * NEVER use mul to multiply two Moneys — that produces a square-dollar
 * value which is meaningless. The type system lets it slip; the caller
 * needs to be explicit.
 */
export function mul(m: Money, scalar: number | string | Decimal, decimals = DEFAULT_MONEY_DECIMALS): Money {
  return dec(m).times(new Decimal(String(scalar))).toFixed(decimals) as Money;
}

/** Divide Money by a unit-less scalar. */
export function div(m: Money, scalar: number | string | Decimal, decimals = DEFAULT_MONEY_DECIMALS): Money {
  const s = new Decimal(String(scalar));
  if (s.isZero()) throw new RangeError("div(): division by zero");
  return dec(m).dividedBy(s).toFixed(decimals) as Money;
}

/** Apply an exchange rate to a Money. Result is in the target currency. */
export function applyRate(m: Money, r: Rate, decimals = DEFAULT_MONEY_DECIMALS): Money {
  return dec(m).times(dec(r)).toFixed(decimals) as Money;
}

export function neg(m: Money, decimals = DEFAULT_MONEY_DECIMALS): Money {
  return dec(m).negated().toFixed(decimals) as Money;
}

export function abs(m: Money, decimals = DEFAULT_MONEY_DECIMALS): Money {
  return dec(m).abs().toFixed(decimals) as Money;
}

/** Sum a list of Moneys. Empty list → ZERO. */
export function sum(moneys: Money[], decimals = DEFAULT_MONEY_DECIMALS): Money {
  let acc = new Decimal(0);
  for (const m of moneys) acc = acc.plus(dec(m));
  return acc.toFixed(decimals) as Money;
}

// ─── Comparison ──────────────────────────────────────────────────────

export function eq(a: Money, b: Money): boolean { return dec(a).equals(dec(b)); }
export function gt(a: Money, b: Money): boolean { return dec(a).greaterThan(dec(b)); }
export function gte(a: Money, b: Money): boolean { return dec(a).greaterThanOrEqualTo(dec(b)); }
export function lt(a: Money, b: Money): boolean { return dec(a).lessThan(dec(b)); }
export function lte(a: Money, b: Money): boolean { return dec(a).lessThanOrEqualTo(dec(b)); }

export function isZero(m: Money): boolean     { return dec(m).isZero(); }
export function isPositive(m: Money): boolean { return dec(m).isPositive() && !dec(m).isZero(); }
export function isNegative(m: Money): boolean { return dec(m).isNegative(); }

/**
 * Are two Moneys exactly equal? This is the function aurumGuardians
 * should call instead of `Math.abs(d - c) < 0.01`. Strict equality —
 * no tolerance — because the Money type guarantees consistent
 * precision so any drift is real, not floating-point noise.
 */
export function balanced(debits: Money, credits: Money): boolean {
  return eq(debits, credits);
}

// ─── Conversion to/from primitives ───────────────────────────────────

/** For chart axes, percentages, log lines. NEVER for arithmetic. */
export function toNumber(m: Money | Rate): number {
  return Number(m);
}

/** For UI display. Locale-aware via Intl.NumberFormat. */
export function format(m: Money, locale = "en-US", currency = "USD"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(toNumber(m));
}

/** When you really need the underlying Decimal (e.g. for a one-off
 *  algorithm not yet expressed in Money helpers). Prefer the helpers. */
export function toDecimal(m: Money | Rate): Decimal { return new Decimal(m); }

// ─── JSON serialization helpers ──────────────────────────────────────

/**
 * Reviver factory for JSON.parse. Lets a service deserialize a payload
 * with a known set of money fields back into branded Money values
 * without a separate transform pass:
 *
 *   const parsed = JSON.parse(body, moneyReviver(["amount", "balanceDue"]));
 *
 * Field detection is by exact name match — pass the full set of fields
 * you expect to be Money. Non-money fields are passed through untouched.
 */
export function moneyReviver(moneyFields: string[]): (key: string, value: unknown) => unknown {
  const set = new Set(moneyFields);
  return (key, value) => {
    if (set.has(key) && value != null) {
      if (typeof value === "number" || typeof value === "string") return money(value);
    }
    return value;
  };
}

// ─── Compatibility shim for legacy `number`-typed callers ────────────

/**
 * Convert a legacy `number` field (from finance.ts before B3) into a
 * Money for use inside an engine that has been migrated. Helper exists
 * specifically so glPostingEngine (B2) can run on Money arithmetic
 * even when the surrounding types still expose `number`.
 *
 * Logs a structured warn the first N times per process so the
 * migration progress is visible in logs — flip to throw once B3 is in
 * place and the legacy types are gone.
 */
let legacyConversionsLogged = 0;
const LEGACY_LOG_LIMIT = 50;
export function fromLegacyNumber(n: number, context?: string): Money {
  if (legacyConversionsLogged < LEGACY_LOG_LIMIT) {
    legacyConversionsLogged += 1;
    // eslint-disable-next-line no-console
    console.warn(
      `[Money] legacy number → Money conversion #${legacyConversionsLogged}` +
      (context ? ` (${context})` : "") +
      ` — value=${n}. Plan to remove via B3.`,
    );
  }
  return money(n);
}
