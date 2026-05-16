export type GuardrailSeverity = "info" | "warning" | "critical";
export interface GuardrailContext {
  ledgerId: string;
  vendor: string;
  amount: number;
  currency: string;
  bankAccount?: string;
  country?: string;
  metadata?: Record<string, unknown>;
}
export interface GuardrailOutcome {
  id: string;
  name: string;
  severity: GuardrailSeverity;
  triggered: boolean;
  message?: string;
}
export interface GuardrailRule {
  id: string;
  name: string;
  severity: GuardrailSeverity;
  evaluate(context: GuardrailContext): { triggered: boolean; message?: string };
}
export const DEFAULT_RULES: GuardrailRule[] = [
  {
    id: "vendor-blacklist",
    name: "Vendor on EchoSentinel blacklist",
    severity: "critical",
    evaluate: (context) => {
      const blacklist =
        (context.metadata?.blacklist as string[] | undefined) ?? [];
      const triggered = blacklist.includes(context.vendor);
      return {
        triggered,
        message: triggered
          ? `${context.vendor} flagged as blacklisted vendor.`
          : undefined,
      };
    },
  },
  {
    id: "amount-threshold",
    name: "Payment exceeds policy threshold",
    severity: "warning",
    evaluate: (context) => {
      const threshold =
        (context.metadata?.threshold as number | undefined) ?? 100000;
      const triggered = context.amount >= threshold;
      return {
        triggered,
        message: triggered
          ? `Amount ${context.amount} exceeds threshold ${threshold}.`
          : undefined,
      };
    },
  },
  {
    id: "country-mismatch",
    name: "Bank country mismatch",
    severity: "warning",
    evaluate: (context) => {
      const allowed = (context.metadata?.allowedCountries as
        | string[]
        | undefined) ?? ["US", "CA"];
      const triggered = Boolean(
        context.country && !allowed.includes(context.country),
      );
      return {
        triggered,
        message: triggered
          ? `Bank country ${context.country} outside allowed countries.`
          : undefined,
      };
    },
  },
  {
    id: "rapid-amount-increase",
    name: "Rapid amount increase",
    severity: "info",
    evaluate: (context) => {
      const historicalAverage =
        (context.metadata?.historicalAverage as number | undefined) ??
        context.amount;
      const triggered = context.amount > historicalAverage * 1.5;
      return {
        triggered,
        message: triggered
          ? `Amount increased by ${(context.amount / historicalAverage).toFixed(2)}x vs average.`
          : undefined,
      };
    },
  },
];
export interface GuardrailEvaluationOptions {
  rules?: GuardrailRule[];
}
export interface GuardrailEvaluationResult {
  severity: GuardrailSeverity;
  outcomes: GuardrailOutcome[];
}
function compareSeverity(a: GuardrailSeverity, b: GuardrailSeverity) {
  const order: GuardrailSeverity[] = ["info", "warning", "critical"];
  return order[Math.max(order.indexOf(a), order.indexOf(b))];
}
export function evaluateGuardrails(
  context: GuardrailContext,
  options: GuardrailEvaluationOptions = {},
): GuardrailEvaluationResult {
  const rules = options.rules ?? DEFAULT_RULES;
  let severity: GuardrailSeverity = "info";
  const outcomes = rules.map<GuardrailOutcome>((rule) => {
    const result = rule.evaluate(context);
    if (result.triggered) {
      severity = compareSeverity(severity, rule.severity);
    }
    return {
      id: rule.id,
      name: rule.name,
      severity: rule.severity,
      triggered: result.triggered,
      message: result.message,
    };
  });
  return { severity, outcomes };
}
