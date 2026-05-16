export type EchoAiSignalTrend = "up" | "down" | "stable";
export interface EchoAiSignal {
  label: string;
  value: string;
  trend: EchoAiSignalTrend;
  horizon: string;
}
export interface EchoAiRecommendation {
  title: string;
  description: string;
}
export interface EchoAiResponse {
  topic: string;
  headline: string;
  narrative: string;
  confidence: number;
  signals: EchoAiSignal[];
  recommendations: EchoAiRecommendation[];
  references: string[];
}
type Heuristic = {
  id: string;
  test: (text: string) => boolean;
  build: () => EchoAiResponse;
};
const heuristics: Heuristic[] = [
  {
    id: "cash-ladder",
    test: (text) => /cash|liquid|treasury/.test(text),
    build: () => ({
      topic: "cash-ladder",
      headline: "Cash ladder remains solvent across the 13-week horizon.",
      narrative:
        "OPERA revenue feeds and vendor run-rate show positive cash balance through week 11. Variance against EchoStratus Ai�� forecast sits inside ±1.4%, so no liquidity intervention is required today.",
      confidence: 0.92,
      signals: [
        {
          label: "Net Operating Cash",
          value: "+$214K",
          trend: "up",
          horizon: "W+2",
        },
        {
          label: "Vendor Exposure",
          value: "$86K",
          trend: "stable",
          horizon: "Current",
        },
        {
          label: "Daily Burn",
          value: "$27K",
          trend: "down",
          horizon: "Trailing 7",
        },
      ],
      recommendations: [
        {
          title: "Advance dynamic discounts",
          description:
            "Release a 1.5% early-pay discount for Tier-A vendors to capture $11K working-capital upside without breaching liquidity envelope.",
        },
        {
          title: "Promote cash ladder snapshot",
          description:
            "Publish updated ladder to Zelda so Argus can notarize the variance narrative for the CFO briefing.",
        },
      ],
      references: [
        "EchoLedger²: cash_account_1000",
        "EchoStratus Ai³ run 2024-11-05",
        "Phoenix snapshot 2024-11-04T23:00Z",
      ],
    }),
  },
  {
    id: "forecast-variance",
    test: (text) => /forecast|variance|adr|occupancy|demand/.test(text),
    build: () => ({
      topic: "forecast-variance",
      headline: "Forecast variance isolated to banquet occupancy swing.",
      narrative:
        "PredictHQ events in Miami increased banquet demand 6.3%, driving ADR uplift but also labor variance in F&B. Rooms forecast remains within ±0.8% tolerance.",
      confidence: 0.88,
      signals: [
        {
          label: "Banquet ADR",
          value: "+$18",
          trend: "up",
          horizon: "Event week",
        },
        {
          label: "Labor Variance",
          value: "+$12.6K",
          trend: "up",
          horizon: "This period",
        },
        {
          label: "Occupancy",
          value: "84%",
          trend: "stable",
          horizon: "Next 14",
        },
      ],
      recommendations: [
        {
          title: "Trigger Ai³ reslice",
          description:
            "Re-run EchoStratus Ai³ scenario with banquet staffing elasticity to reduce labor variance to < ±1.5%.",
        },
        {
          title: "Alert F&B controller",
          description:
            "Notify controller to monitor vendor cost creep across LUCCCA vendor exchange inbound invoices over the next 72 hours.",
        },
      ],
      references: [
        "PredictHQ event surge #PHQ-66214",
        "EchoStratus Ai³ scenario: SFO-BANQ-TILT",
        "StayNTouch feed 2024-11-05",
      ],
    }),
  },
  {
    id: "ap-automation",
    test: (text) =>
      /invoice|ap|payment|payroll|vendor|three[- ]?way/.test(text),
    build: () => ({
      topic: "ap-automation",
      headline:
        "Three-way match is clean; payments cleared for Tier-A vendors.",
      narrative:
        "Vendor exchange + Bill.com feeds show zero exceptions in today’s queue. Duplicate detection from EchoSentinel flagged two invoices already quarantined.",
      confidence: 0.9,
      signals: [
        {
          label: "Queued Invoices",
          value: "37",
          trend: "down",
          horizon: "Today",
        },
        {
          label: "Discount Capture",
          value: "72%",
          trend: "up",
          horizon: "Trailing 30",
        },
        {
          label: "Exception Rate",
          value: "0.4%",
          trend: "down",
          horizon: "Trailing 7",
        },
      ],
      recommendations: [
        {
          title: "Release ACH batch",
          description:
            "Approve the $186K ACH batch; Zelda already snapshotted supporting docs for Argus.",
        },
        {
          title: "Escalate duplicate audit",
          description:
            "Route the quarantined duplicates to EchoSentinel workflow for manual confirmation before next payment cycle.",
        },
      ],
      references: [
        "LUCCCA vendor exchange feed 2024-11-05",
        "Bill.com settlement batch #VC-1092",
        "EchoSentinel duplicate alert 2024-11-05T13:10Z",
      ],
    }),
  },
];
const fallbackResponse: EchoAiResponse = {
  topic: "general",
  headline: "EchoAi³ is ready—ask about cash, forecasts, or AP automation.",
  narrative:
    "I synthesise EchoLedger² journals, EchoStratus Ai³ scenarios, and EchoSentinel guardrails. Ask about cash runway, forecast variance, or invoice health to receive an actionable playbook.",
  confidence: 0.75,
  signals: [
    {
      label: "Ledger Consistency",
      value: "99.9%",
      trend: "stable",
      horizon: "Trailing 30",
    },
    {
      label: "Forecast Accuracy",
      value: "±1.8%",
      trend: "up",
      horizon: "Current period",
    },
  ],
  recommendations: [
    {
      title: "Inspect cash ladder",
      description:
        "Ask: 'What is our cash position over the next 13 weeks?' to surface liquidity actions instantly.",
    },
    {
      title: "Diagnose variance",
      description:
        "Try: 'Where are we off budget this week?' to trigger a variance narrative mapped to USALI.",
    },
  ],
  references: [
    "EchoLedger² journal synthesis",
    "EchoStratus Ai³ baseline scenario",
    "EchoSentinel guardrails",
  ],
};
function normalise(text: string) {
  return text.replace(/\s+/g, "").trim().toLowerCase();
}
export function generateEchoAiResponse(message: string): EchoAiResponse {
  const prepared = normalise(message);
  if (!prepared) {
    return fallbackResponse;
  }
  const heuristic = heuristics.find(({ test }) => test(prepared));
  if (heuristic) {
    return heuristic.build();
  }
  return fallbackResponse;
}
