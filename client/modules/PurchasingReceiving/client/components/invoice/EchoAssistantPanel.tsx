import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEventHandler,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Sparkles, Activity, Compass, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { id as createId } from "@/lib/store";
import type {
  InvoiceLineItemRaw,
  ScannedInvoice,
  StandardizedLineItem,
} from "@shared/api";
type Message = {
  id: string;
  role: "user" | "echo";
  content: string;
  planPreview?: string[];
  auditNote?: string;
  timestamp: string;
};
type EchoAssistantPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scan: ScannedInvoice | null;
  outletName: string;
};
type RiskSignal = {
  id: string;
  severity: "info" | "warning" | "critical";
  label: string;
  note: string;
  action: string;
};
type InvoiceInsights = {
  vendorName: string;
  invoiceNumber: string;
  lineCount: number;
  totalCost: number | null;
  avgCost: number | null;
  avgConfidence: number | null;
  invoiceDate: string | null;
  outletName: string;
  topCostLine: { name: string; cost: number } | null;
};
const formatCurrency = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: value >= 1000 ? 0 : 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
};
const computeInsights = (
  scan: ScannedInvoice | null,
  outletName: string,
): InvoiceInsights | null => {
  if (!scan) {
    return null;
  }
  const standardized = Array.isArray(scan.result.standardized)
    ? scan.result.standardized
    : [];
  const rawItems = Array.isArray(scan.result.rawItems)
    ? scan.result.rawItems
    : [];
  const totalCostSource = standardized.length ? standardized : rawItems;
  const totalCost = totalCostSource.reduce<number | null>((sum, item) => {
    const cost =
      (item as StandardizedLineItem).totalCost ??
      (item as InvoiceLineItemRaw).totalCost;
    if (cost == null) return sum;
    return (sum ?? 0) + cost;
  }, null);
  const avgCost =
    totalCost && standardized.length ? totalCost / standardized.length : null;
  const avgConfidence = rawItems.length
    ? rawItems.reduce((acc, item) => acc + (item.confidence ?? 0), 0) /
      rawItems.length
    : null;
  const topCostLine = standardized.length
    ? standardized.reduce<{ name: string; cost: number } | null>(
        (best, item) => {
          if (item.totalCost == null) return best;
          if (!best || item.totalCost > best.cost) {
            return { name: item.productName, cost: item.totalCost };
          }
          return best;
        },
        null,
      )
    : rawItems.reduce<{ name: string; cost: number } | null>((best, item) => {
        if (item.totalCost == null) return best;
        if (!best || item.totalCost > best.cost) {
          return {
            name: item.productName || item.rawText || "Line",
            cost: item.totalCost,
          };
        }
        return best;
      }, null);
  return {
    vendorName: scan.vendorName || scan.result.vendor || "Unnamed Vendor",
    invoiceNumber:
      scan.result.invoiceNumber || scan.result.meta.filename || "—",
    lineCount: standardized.length || rawItems.length,
    totalCost,
    avgCost,
    avgConfidence,
    invoiceDate: scan.result.date || null,
    outletName: outletName || scan.vendorCodeMatch?.outletName || "—",
    topCostLine,
  };
};
const deriveRiskSignals = (insights: InvoiceInsights | null): RiskSignal[] => {
  if (!insights) {
    return [];
  }
  const signals: RiskSignal[] = [];
  const pushSignal = (signal: RiskSignal) => {
    if (!signals.some((entry) => entry.id === signal.id)) {
      signals.push(signal);
    }
  };
  if (!insights.outletName || insights.outletName === "—") {
    pushSignal({
      id: "outlet",
      severity: "warning",
      label: "Outlet unassigned",
      note: "Posting will fail until an outlet is confirmed.",
      action: "Lock the correct outlet and sync vendor code mapping",
    });
  }
  if (insights.avgConfidence != null) {
    const confidencePct = Math.round(insights.avgConfidence * 100);
    if (insights.avgConfidence < 0.55) {
      pushSignal({
        id: "confidence-critical",
        severity: "critical",
        label: "OCR confidence low",
        note: `${confidencePct}% average signal strength. Manual validation required.`,
        action: "Audit scanned lines and retrain anchors for weak fields",
      });
    } else if (insights.avgConfidence < 0.75) {
      pushSignal({
        id: "confidence-warning",
        severity: "warning",
        label: "OCR confidence drifting",
        note: `${confidencePct}% average confidence.`,
        action: "Spot-check high value lines before approval",
      });
    }
  }
  if (insights.totalCost != null) {
    if (insights.totalCost > 30000) {
      pushSignal({
        id: "spend-critical",
        severity: "critical",
        label: "High spend invoice",
        note: `${formatCurrency(insights.totalCost)} exceeds enterprise threshold.`,
        action: "Escalate to finance oversight before posting",
      });
    } else if (insights.totalCost > 15000) {
      pushSignal({
        id: "spend-warning",
        severity: "warning",
        label: "Large spend",
        note: `${formatCurrency(insights.totalCost)} in play.`,
        action: "Compare against prior 4 receipts for variance spikes",
      });
    }
  }
  if (insights.lineCount <= 3) {
    pushSignal({
      id: "thin-coverage",
      severity: "info",
      label: "Sparse coverage",
      note: `${insights.lineCount} lines detected — risk of missing products.`,
      action: "Verify packing slip to ensure no items were dropped",
    });
  } else if (insights.lineCount >= 80) {
    pushSignal({
      id: "dense-coverage",
      severity: "warning",
      label: "Heavy line load",
      note: `${insights.lineCount} lines captured. Training drift likely.`,
      action: "Group items by vendor category to isolate variance",
    });
  }
  if (
    insights.totalCost &&
    insights.topCostLine &&
    insights.topCostLine.cost / insights.totalCost > 0.45
  ) {
    const share = Math.round(
      (insights.topCostLine.cost / insights.totalCost) * 100,
    );
    pushSignal({
      id: "dominant-line",
      severity: "warning",
      label: "Single line concentration",
      note: `${insights.topCostLine.name} carries ${share}% of spend.`,
      action: "Validate quantity and contract price on the dominant line",
    });
  }
  if (insights.invoiceDate) {
    const now = new Date();
    const invoiceDate = new Date(insights.invoiceDate);
    if (!Number.isNaN(invoiceDate.valueOf())) {
      const diffDays = Math.floor(
        (now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays > 10) {
        pushSignal({
          id: "stale-date",
          severity: "info",
          label: "Older document",
          note: `Captured ${diffDays} days ago.`,
          action: "Confirm no duplicate exists before approval",
        });
      }
    }
  }
  return signals;
};
const buildStrategicPlan = (
  insights: InvoiceInsights | null,
  userPrompt: string | null,
  riskSignals: RiskSignal[],
): string[] => {
  const steps: string[] = [];
  const vendorLabel = insights?.vendorName ?? "this vendor";
  const invoiceLabel = insights?.invoiceNumber ?? "invoice";
  const outletLabel =
    insights?.outletName && insights.outletName !== "—"
      ? insights.outletName
      : "target outlet";
  const totalCostText = insights?.totalCost
    ? formatCurrency(insights.totalCost)
    : "recent totals";
  const topLine = insights?.topCostLine;
  const dedupe = (entry: string) => {
    if (!entry) return;
    if (!steps.includes(entry)) {
      steps.push(entry);
    }
  };
  if (userPrompt && userPrompt.length) {
    dedupe(
      `Clarify intent behind: “${userPrompt}�� to ensure guidance chases the correct objective.`,
    );
  }
  if (riskSignals.length) {
    const severityRank: Record<RiskSignal["severity"], number> = {
      critical: 0,
      warning: 1,
      info: 2,
    };
    riskSignals
      .slice()
      .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
      .forEach((signal) => {
        dedupe(`${signal.action} (${signal.note})`);
      });
  }
  dedupe(
    `Validate ${invoiceLabel} for ${vendorLabel} against historical anomalies and current receiving notes.`,
  );
  dedupe(
    `Interview ${outletLabel} stocking data to confirm the document reflects actual counts.`,
  );
  if (topLine) {
    dedupe(
      `Stress-test ${topLine.name} pricing (${formatCurrency(topLine.cost)}) against supplier trendlines.`,
    );
  }
  dedupe(
    `Forecast near-term spend impact using ${totalCostText} blended with the last 4 invoices.`,
  );
  dedupe(
    `Cross-check HACCP controls linked to this delivery window and flag any missing verifications.`,
  );
  dedupe(
    `Simulate inventory posture 10 days forward to neutralize overstock or shortages.`,
  );
  dedupe(
    `Align GL classifications with current cost center strategy to avoid mismatched ledger postings.`,
  );
  dedupe(
    `Benchmark labor + prep effort implied by this invoice against batch production targets.`,
  );
  dedupe(
    `Update vendor negotiation dossier with any variance or surcharge intelligence.`,
  );
  dedupe(
    `Prepare an adaptive briefing for leadership with decision options ranked by ROI.`,
  );
  return steps.slice(0, 10);
};
const craftAuditNote = (
  insights: InvoiceInsights | null,
  plan: string[],
  riskSignals: RiskSignal[],
): string => {
  if (!insights) {
    return "No active invoice context. Staying in exploratory mode until a document is selected.";
  }
  const coverage = insights.lineCount;
  const costText = insights.totalCost
    ? formatCurrency(insights.totalCost)
    : "unknown spend";
  const confidence =
    insights.avgConfidence != null
      ? `${Math.round(insights.avgConfidence * 100)}% OCR confidence`
      : "confidence pending";
  const riskText = riskSignals.length
    ? `${riskSignals.length} risk${riskSignals.length === 1 ? "" : "s"} indexed`
    : "no acute risks";
  return `Coverage check: ${coverage} lines captured at ${costText}. Sensor read: ${confidence}. Risk watch: ${riskText}. Plan horizon reset to ${plan.length} moves.`;
};
const inquisitiveFollowUps = [
  "Any specific cost pressure you want me to chase first?",
  "Should I bias the model toward freshness risk or labor swing this week?",
  "Do we have new menu rotations that change how this invoice should be framed?",
  "Is there an outlet you’re worried about stocking-wise so I can weight decisions that way?",
];
const pickFollowUp = (seed: string) => {
  if (!seed) {
    return inquisitiveFollowUps[0];
  }
  const hash = Array.from(seed).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0,
  );
  return inquisitiveFollowUps[hash % inquisitiveFollowUps.length];
};
const riskTone: Record<RiskSignal["severity"], string> = {
  critical: "border-rose-500/70 bg-rose-500/15",
  warning: "border-amber-500/60 bg-amber-500/15",
  info: "border-sky-500/50 bg-sky-500/10",
};
const RISK_LEDGER_STORAGE_KEY = "echo:risk-ledger:v1";
type RiskLedgerStore = Record<string, string[]>;
const EMPTY_RISK_LIST: string[] = Object.freeze([]) as string[];
const loadRiskLedgerStore = (): RiskLedgerStore => {
  if (typeof window === "undefined") {
    return {};
  }
  const raw = window.sessionStorage.getItem(RISK_LEDGER_STORAGE_KEY);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    const result: RiskLedgerStore = {};
    Object.entries(parsed as Record<string, unknown>).forEach(
      ([key, value]) => {
        if (Array.isArray(value)) {
          result[key] = value.filter(
            (entry): entry is string => typeof entry === "string",
          );
        }
      },
    );
    return result;
  } catch {
    return {};
  }
};
const persistRiskLedgerStore = (store: RiskLedgerStore) => {
  if (typeof window === "undefined") {
    return;
  }
  if (!Object.keys(store).length) {
    window.sessionStorage.removeItem(RISK_LEDGER_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(RISK_LEDGER_STORAGE_KEY, JSON.stringify(store));
};
const arraysEqual = (left: string[], right: string[]) => {
  if (left === right) {
    return true;
  }
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
};
export function EchoAssistantPanel({
  open,
  onOpenChange,
  scan,
  outletName,
}: EchoAssistantPanelProps) {
  const insights = useMemo(
    () => computeInsights(scan, outletName),
    [scan, outletName],
  );
  const riskSignals = useMemo(() => deriveRiskSignals(insights), [insights]);
  const invoiceLedgerKey = insights
    ? `${insights.vendorName}|${insights.invoiceNumber}`
    : null;
  const [riskLedgerStore, setRiskLedgerStore] = useState<RiskLedgerStore>(() =>
    loadRiskLedgerStore(),
  );
  const dismissedRiskIds = useMemo(() => {
    if (!invoiceLedgerKey) {
      return EMPTY_RISK_LIST;
    }
    return riskLedgerStore[invoiceLedgerKey] ?? EMPTY_RISK_LIST;
  }, [invoiceLedgerKey, riskLedgerStore]);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const lastPromptRef = useRef<string | null>(null);
  const invoiceLedgerKeyRef = useRef<string | null>(null);
  const activeRiskSignals = useMemo(
    () => riskSignals.filter((signal) => !dismissedRiskIds.includes(signal.id)),
    [riskSignals, dismissedRiskIds],
  );
  const acknowledgedRiskSignals = useMemo(
    () => riskSignals.filter((signal) => dismissedRiskIds.includes(signal.id)),
    [riskSignals, dismissedRiskIds],
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [futurePlan, setFuturePlan] = useState<string[]>([]);
  const [thinking, setThinking] = useState(false);
  const [showPlanDeck, setShowPlanDeck] = useState(false);
  const activeRiskSignalsRef = useRef<RiskSignal[]>(activeRiskSignals);
  const responseTimer = useRef<number | null>(null);
  const portalTarget = typeof document !== "undefined" ? document.body : null;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const updateDismissedRiskIds = useCallback(
    (value: ((prev: string[]) => string[]) | string[]) => {
      if (!invoiceLedgerKey) {
        return;
      }
      setRiskLedgerStore((prevStore) => {
        const previous = prevStore[invoiceLedgerKey] ?? EMPTY_RISK_LIST;
        const next =
          typeof value === "function"
            ? (value as (snapshot: string[]) => string[])(previous)
            : value;
        if (arraysEqual(previous, next)) {
          return prevStore;
        }
        const nextStore: RiskLedgerStore = { ...prevStore };
        if (next.length) {
          nextStore[invoiceLedgerKey] = next;
        } else {
          delete nextStore[invoiceLedgerKey];
        }
        return nextStore;
      });
    },
    [invoiceLedgerKey],
  );
  useEffect(() => {
    lastPromptRef.current = lastPrompt;
  }, [lastPrompt]);
  useEffect(() => {
    activeRiskSignalsRef.current = activeRiskSignals;
  }, [activeRiskSignals]);
  useEffect(() => {
    persistRiskLedgerStore(riskLedgerStore);
  }, [riskLedgerStore]);
  useEffect(() => {
    if (!invoiceLedgerKey) {
      return;
    }
    const validIds = new Set(riskSignals.map((signal) => signal.id));
    updateDismissedRiskIds((prev) => {
      if (!prev.length) {
        return prev;
      }
      const sanitized = prev.filter((id) => validIds.has(id));
      return arraysEqual(prev, sanitized) ? prev : sanitized;
    });
  }, [invoiceLedgerKey, riskSignals, updateDismissedRiskIds]);
  useEffect(() => {
    if (invoiceLedgerKeyRef.current !== invoiceLedgerKey) {
      invoiceLedgerKeyRef.current = invoiceLedgerKey;
      setLastPrompt(null);
      lastPromptRef.current = null;
    }
  }, [invoiceLedgerKey]);
  useEffect(() => {
    if (!open) {
      return;
    }
    setShowPlanDeck(false);
    setLastPrompt(null);
    lastPromptRef.current = null;
    const ledger = activeRiskSignalsRef.current;
    const basePlan = buildStrategicPlan(insights, null, ledger);
    setFuturePlan(basePlan);
    const auditNote = craftAuditNote(insights, basePlan, ledger);
    const focusRisk = ledger[0] ?? null;
    const totalRiskCount = riskSignals.length;
    const acknowledgedCount = Math.max(totalRiskCount - ledger.length, 0);
    const riskSummary = totalRiskCount
      ? ` Risk recap: ${ledger.length} active / ${acknowledgedCount} contained.`
      : " Risk recap: ledger empty.";
    const calibrationStatus = ledger.length
      ? " Calibration live until these alerts settle."
      : acknowledgedCount
        ? " Calibration settled; all alerts contained."
        : " Calibration nominal.";
    const riskLine = focusRisk
      ? ` Primary watch: ${focusRisk.label} — ${focusRisk.note}.`
      : ledger.length
        ? " Primary watch rotating across contained alerts."
        : " Risk ledger clear.";
    const introContent = insights
      ? `I’m synced on ${insights.vendorName} — ${insights.lineCount} lines captured and ${insights.totalCost ? formatCurrency(insights.totalCost) : "spend still forming"}. Ready to probe deeper.${riskLine}${riskSummary}${calibrationStatus}`
      : "Bring me an invoice or a question and I’ll start mapping the battlefield.";
    const intro: Message = {
      id: createId(),
      role: "echo",
      content: introContent,
      planPreview: basePlan.slice(0, 2),
      auditNote,
      timestamp: new Date().toISOString(),
    };
    setMessages([intro]);
  }, [
    open,
    insights?.invoiceNumber,
    insights?.lineCount,
    insights?.totalCost,
    insights?.vendorName,
    insights?.avgConfidence,
    insights?.outletName,
    riskSignals,
  ]);
  useEffect(() => {
    return () => {
      if (responseTimer.current) {
        window.clearTimeout(responseTimer.current);
        responseTimer.current = null;
      }
    };
  }, []);
  useEffect(() => {
    if (!open) {
      setShowPlanDeck(false);
    }
  }, [open]);
  useEffect(() => {
    if (!open || !portalTarget) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange, portalTarget]);
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const focusTarget = containerRef.current.querySelector<HTMLElement>(
      "textarea,button,[href],[tabindex]:not([tabindex='-1'])",
    );
    (focusTarget ?? containerRef.current).focus({ preventScroll: true });
  }, [open]);
  const handleSubmit = () => {
    const trimmed = draft.trim();
    if (!trimmed || thinking) {
      return;
    }
    const userMessage: Message = {
      id: createId(),
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setThinking(true);
    setLastPrompt(trimmed);
    lastPromptRef.current = trimmed;
    if (responseTimer.current) {
      window.clearTimeout(responseTimer.current);
      responseTimer.current = null;
    }
    responseTimer.current = window.setTimeout(() => {
      const ledger = activeRiskSignalsRef.current;
      const recalculatedPlan = buildStrategicPlan(insights, trimmed, ledger);
      setShowPlanDeck(false);
      setFuturePlan(recalculatedPlan);
      const visiblePlan = recalculatedPlan.slice(0, 2);
      const hiddenCount = Math.max(
        recalculatedPlan.length - visiblePlan.length,
        0,
      );
      const followUp = pickFollowUp(trimmed);
      const auditNote = craftAuditNote(insights, recalculatedPlan, ledger);
      const riskSummary = ledger.length
        ? `Risk ledger: ${ledger
            .slice(0, 3)
            .map((signal) => signal.label)
            .join(",")}${ledger.length > 3 ? "…" : ""}.`
        : "Risk ledger clear.";
      const responseContent = insights
        ? `Pulling the thread: ${insights.vendorName} looks ${insights.totalCost ? `like ${formatCurrency(insights.totalCost)} in play` : "steady for now"}. Next moves are on deck. I’ll re-score the other ${hiddenCount} positions after we execute these. ${riskSummary}`
        : `Logged the question. Once an invoice is in focus I’ll anchor the plan to hard data. ${riskSummary}`;
      const echoMessage: Message = {
        id: createId(),
        role: "echo",
        content: `${responseContent}\n\n${followUp}`,
        planPreview: visiblePlan,
        auditNote,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, echoMessage]);
      setThinking(false);
      responseTimer.current = null;
    }, 320);
  };
  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };
  const contextBadges = useMemo(() => {
    if (!insights) {
      return null;
    }
    const badges: { label: string; icon: ReactNode }[] = [];
    badges.push({
      label: `${insights.lineCount} lines`,
      icon: <Activity className="h-3.5 w-3.5" />,
    });
    if (insights.totalCost != null) {
      badges.push({
        label: formatCurrency(insights.totalCost),
        icon: <Sparkles className="h-3.5 w-3.5" />,
      });
    }
    if (insights.outletName && insights.outletName !== "—") {
      badges.push({
        label: insights.outletName,
        icon: <Compass className="h-3.5 w-3.5" />,
      });
    }
    return badges;
  }, [insights]);
  const hiddenMoves = Math.max(futurePlan.length - 2, 0);
  const recomputePlanAfterRiskLedgerChange = useCallback(
    (nextActive: RiskSignal[], narrative: string) => {
      const plan = buildStrategicPlan(
        insights,
        lastPromptRef.current,
        nextActive,
      );
      activeRiskSignalsRef.current = nextActive;
      setFuturePlan(plan);
      setShowPlanDeck(false);
      const auditNote = craftAuditNote(insights, plan, nextActive);
      const riskSummary = nextActive.length
        ? `Risk ledger: ${nextActive
            .slice(0, 3)
            .map((signal) => signal.label)
            .join(",")}${nextActive.length > 3 ? "…" : ""}.`
        : "Risk ledger clear.";
      const acknowledgedCount = Math.max(
        riskSignals.length - nextActive.length,
        0,
      );
      const recapLine = riskSignals.length
        ? `Risk recap: ${nextActive.length} active / ${acknowledgedCount} contained.`
        : "Risk recap: ledger empty.";
      const calibrationLine = nextActive.length
        ? "Calibration engaged until outstanding alerts resolve."
        : "Calibration settled; all alerts contained.";
      const hiddenCount = Math.max(plan.length - 2, 0);
      const concealmentLine = hiddenCount
        ? `Holding ${hiddenCount} concealed move${hiddenCount === 1 ? "" : "s"}.`
        : "All moves surfaced.";
      const horizonLine = `Horizon tracking ${plan.length} move${plan.length === 1 ? "" : "s"}.`;
      const segments = [
        narrative,
        horizonLine,
        riskSummary,
        recapLine,
        calibrationLine,
        concealmentLine,
      ].filter(Boolean);
      const responseContent = segments.join("");
      const echoMessage: Message = {
        id: createId(),
        role: "echo",
        content: responseContent,
        planPreview: plan.slice(0, 2),
        auditNote,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, echoMessage]);
    },
    [insights, riskSignals],
  );
  const acknowledgeRisk = useCallback(
    (signal: RiskSignal) => {
      if (
        !invoiceLedgerKey ||
        invoiceLedgerKeyRef.current !== invoiceLedgerKey
      ) {
        return;
      }
      let updated = false;
      let nextActive: RiskSignal[] = [];
      updateDismissedRiskIds((prev) => {
        if (prev.includes(signal.id)) {
          return prev;
        }
        const next = [...prev, signal.id];
        nextActive = riskSignals.filter((entry) => !next.includes(entry.id));
        updated = true;
        return next;
      });
      if (updated) {
        recomputePlanAfterRiskLedgerChange(
          nextActive,
          `Marked ${signal.label} as contained.`,
        );
      }
    },
    [
      invoiceLedgerKey,
      recomputePlanAfterRiskLedgerChange,
      riskSignals,
      updateDismissedRiskIds,
    ],
  );
  const acknowledgeAllRisks = useCallback(() => {
    if (!invoiceLedgerKey || invoiceLedgerKeyRef.current !== invoiceLedgerKey) {
      return;
    }
    let updated = false;
    let nextActive: RiskSignal[] = [];
    updateDismissedRiskIds((prev) => {
      const currentActive = riskSignals.filter(
        (entry) => !prev.includes(entry.id),
      );
      if (!currentActive.length) {
        return prev;
      }
      const nextSet = new Set(prev);
      currentActive.forEach((entry) => nextSet.add(entry.id));
      const next = Array.from(nextSet);
      nextActive = riskSignals.filter((entry) => !next.includes(entry.id));
      updated = true;
      return next;
    });
    if (updated) {
      recomputePlanAfterRiskLedgerChange(
        nextActive,
        "Cleared active ledger items.",
      );
    }
  }, [
    invoiceLedgerKey,
    recomputePlanAfterRiskLedgerChange,
    riskSignals,
    updateDismissedRiskIds,
  ]);
  const restoreRisk = useCallback(
    (signal: RiskSignal) => {
      if (
        !invoiceLedgerKey ||
        invoiceLedgerKeyRef.current !== invoiceLedgerKey
      ) {
        return;
      }
      let updated = false;
      let nextActive: RiskSignal[] = [];
      updateDismissedRiskIds((prev) => {
        if (!prev.includes(signal.id)) {
          return prev;
        }
        const next = prev.filter((id) => id !== signal.id);
        nextActive = riskSignals.filter((entry) => !next.includes(entry.id));
        updated = true;
        return next;
      });
      if (updated) {
        recomputePlanAfterRiskLedgerChange(
          nextActive,
          `Returned ${signal.label} to active watch.`,
        );
      }
    },
    [
      invoiceLedgerKey,
      recomputePlanAfterRiskLedgerChange,
      riskSignals,
      updateDismissedRiskIds,
    ],
  );
  const restoreAllRisks = useCallback(() => {
    if (!invoiceLedgerKey || invoiceLedgerKeyRef.current !== invoiceLedgerKey) {
      return;
    }
    let updated = false;
    updateDismissedRiskIds((prev) => {
      if (!prev.length) {
        return prev;
      }
      updated = true;
      return [];
    });
    if (updated) {
      recomputePlanAfterRiskLedgerChange(
        riskSignals,
        "Restored all ledger signals to watch.",
      );
    }
  }, [
    invoiceLedgerKey,
    recomputePlanAfterRiskLedgerChange,
    riskSignals,
    updateDismissedRiskIds,
  ]);
  const riskStatusBadges = useMemo(() => {
    const total = riskSignals.length;
    const contained = Math.max(total - activeRiskSignals.length, 0);
    if (!insights || !total) {
      return [
        {
          label: "Ledger clear",
          tone: "border-sky-700/60 bg-sky-900/40 text-sky-200",
          action:
            hiddenMoves > 0 && !showPlanDeck
              ? () => setShowPlanDeck(true)
              : undefined,
        },
      ];
    }
    const list: { label: string; tone: string; action?: () => void }[] = [];
    if (activeRiskSignals.length) {
      list.push({
        label: `${activeRiskSignals.length} active`,
        tone: "border-amber-500/60 bg-amber-500/15 text-amber-200",
        action: activeRiskSignals.length ? acknowledgeAllRisks : undefined,
      });
    }
    if (contained) {
      list.push({
        label: `${contained} contained`,
        tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
        action: contained ? restoreAllRisks : undefined,
      });
    }
    return list.length
      ? list
      : [
          {
            label: "Ledger clear",
            tone: "border-sky-700/60 bg-sky-900/40 text-sky-200",
            action:
              hiddenMoves > 0 && !showPlanDeck
                ? () => setShowPlanDeck(true)
                : undefined,
          },
        ];
  }, [
    acknowledgeAllRisks,
    activeRiskSignals.length,
    hiddenMoves,
    insights,
    restoreAllRisks,
    riskSignals.length,
    showPlanDeck,
  ]);
  if (!open || !portalTarget) {
    return null;
  }
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-end justify-end px-4 pb-6 sm:pb-8">
      {" "}
      <div
        ref={containerRef}
        tabIndex={-1}
        className="pointer-events-auto flex h-[min(82vh,680px)] w-[min(420px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-sky-800/60 bg-card shadow-[0_25px_80px_rgba(8,17,35,0.65)] backdrop-blur"
      >
        {" "}
        <div className="border-b border-sky-900/40 bg-card px-4 py-3">
          {" "}
          <div className="flex items-start justify-between gap-3">
            {" "}
            <div className="space-y-1">
              {" "}
              <div className="flex items-center gap-2 text-lg font-semibold text-sky-100">
                {" "}
                <Sparkles className="h-5 w-5 text-sky-400" /> Echo • Inquisitive
                Mode{" "}
              </div>{" "}
              <p className="text-sm text-slate-300">
                {" "}
                Tactical assistant mapping ten moves ahead, revealing only the
                next two while recalculating after each exchange.{" "}
              </p>{" "}
            </div>{" "}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 text-slate-300 transition hover:text-slate-100"
            >
              {" "}
              <X className="h-4 w-4" />{" "}
              <span className="sr-only">Close Echo</span>{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
        <div className="flex flex-1 flex-col gap-4 overflow-hidden px-4 py-4">
          {" "}
          {insights ? (
            <div className="space-y-3 rounded-xl border border-sky-800/50 bg-sky-900/10 p-3 text-xs text-slate-200">
              {" "}
              <div className="font-semibold text-sky-200">
                Current focus
              </div>{" "}
              <div className="flex flex-wrap items-center gap-2">
                {" "}
                <Badge
                  variant="secondary"
                  className="bg-sky-900/60 text-sky-200"
                >
                  {" "}
                  {insights.vendorName}{" "}
                </Badge>{" "}
                {contextBadges?.map((badge) => (
                  <Badge
                    key={badge.label}
                    variant="outline"
                    className="flex items-center gap-1 border-sky-700/60 text-sky-200"
                  >
                    {" "}
                    {badge.icon} <span>{badge.label}</span>{" "}
                  </Badge>
                ))}{" "}
              </div>{" "}
              <div className="flex flex-wrap items-center gap-2">
                {" "}
                {riskStatusBadges.map((badge) => (
                  <Badge
                    key={badge.label}
                    role={badge.action ? "button" : undefined}
                    tabIndex={badge.action ? 0 : undefined}
                    onClick={badge.action}
                    onKeyDown={
                      badge.action
                        ? (event) => {
                            if (event.key === "Enter" || event.key === "") {
                              event.preventDefault();
                              badge.action?.();
                            }
                          }
                        : undefined
                    }
                    variant="outline"
                    className={cn(
                      "border px-2 py-1 text-[11px] uppercase tracking-wide",
                      badge.tone,
                      badge.action
                        ? "cursor-pointer hover:border-sky-300/80"
                        : "",
                    )}
                  >
                    {" "}
                    {badge.label}{" "}
                  </Badge>
                ))}{" "}
              </div>{" "}
              {insights.topCostLine ? (
                <div className="text-slate-300">
                  {" "}
                  Highest cost line: {insights.topCostLine.name} (
                  {formatCurrency(insights.topCostLine.cost)}).{" "}
                </div>
              ) : null}{" "}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-surface p-3 text-sm text-slate-300">
              {" "}
              Select an invoice to give Echo concrete data.{" "}
            </div>
          )}{" "}
          {activeRiskSignals.length || acknowledgedRiskSignals.length ? (
            <div className="space-y-2 rounded-xl border border-slate-800/40 bg-surface p-3 text-xs text-slate-200">
              {" "}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                {" "}
                <span>Risk diagnostics</span>{" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <span>{activeRiskSignals.length} active</span>{" "}
                  <div className="flex items-center gap-1">
                    {" "}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px] text-slate-100 hover:text-slate-50"
                      onClick={acknowledgeAllRisks}
                      disabled={!activeRiskSignals.length}
                    >
                      {" "}
                      Acknowledge all{" "}
                    </Button>{" "}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px] text-sky-200 hover:text-sky-100"
                      onClick={restoreAllRisks}
                      disabled={!acknowledgedRiskSignals.length}
                    >
                      {" "}
                      Restore all{" "}
                    </Button>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              {activeRiskSignals.length ? (
                <div className="space-y-1.5">
                  {" "}
                  {activeRiskSignals.map((signal) => (
                    <div
                      key={signal.id}
                      className={cn(
                        "rounded-lg border px-2.5 py-2 text-xs leading-snug text-slate-100 shadow-sm",
                        riskTone[signal.severity],
                      )}
                    >
                      {" "}
                      <div className="flex items-start justify-between gap-3">
                        {" "}
                        <div>
                          {" "}
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-50">
                            {" "}
                            {signal.label}{" "}
                          </div>{" "}
                          <p className="mt-1 text-[11px] text-slate-100/90">
                            {signal.note}
                          </p>{" "}
                          <p className="mt-1 text-[11px] text-slate-100/75">
                            Next: {signal.action}
                          </p>{" "}
                        </div>{" "}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px] text-slate-100 hover:text-slate-50"
                          onClick={() => acknowledgeRisk(signal)}
                        >
                          {" "}
                          Acknowledge{" "}
                        </Button>{" "}
                      </div>{" "}
                    </div>
                  ))}{" "}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800/60 bg-surface px-2.5 py-2 text-[11px] text-slate-400">
                  {" "}
                  <span>No active alerts in the ledger.</span>{" "}
                  {acknowledgedRiskSignals.length > 0 &&
                  hiddenMoves > 0 &&
                  !showPlanDeck ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px] text-sky-200 hover:text-sky-100"
                      onClick={() => setShowPlanDeck(true)}
                    >
                      {" "}
                      Reveal plan{" "}
                    </Button>
                  ) : null}{" "}
                </div>
              )}{" "}
              {acknowledgedRiskSignals.length ? (
                <div className="mt-3 space-y-1.5">
                  {" "}
                  <div className="pt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    Acknowledged
                  </div>{" "}
                  {acknowledgedRiskSignals.map((signal) => (
                    <div
                      key={`ack-${signal.id}`}
                      className="rounded-lg border border-slate-800/50 bg-surface px-2.5 py-2 text-xs leading-snug text-slate-300"
                    >
                      {" "}
                      <div className="flex items-center justify-between gap-3">
                        {" "}
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                          {" "}
                          {signal.label}{" "}
                        </div>{" "}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px] text-sky-200 hover:text-sky-100"
                          onClick={() => restoreRisk(signal)}
                        >
                          {" "}
                          Restore{" "}
                        </Button>{" "}
                      </div>{" "}
                      <p className="mt-1 text-[11px] text-slate-400">
                        {signal.note}
                      </p>{" "}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Action logged: {signal.action}
                      </p>{" "}
                    </div>
                  ))}{" "}
                </div>
              ) : null}{" "}
            </div>
          ) : null}{" "}
          {futurePlan.length ? (
            <div className="rounded-xl border border-sky-800/40 bg-surface p-3 text-xs text-slate-200">
              {" "}
              <div className="flex items-center justify-between gap-3">
                {" "}
                <span className="font-semibold text-sky-200">
                  Strategic horizon
                </span>{" "}
                {futurePlan.length > 2 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-sky-200 hover:text-sky-100"
                    onClick={() => setShowPlanDeck((value) => !value)}
                  >
                    {" "}
                    {showPlanDeck ? "Hide full path" : "Reveal plan"}{" "}
                  </Button>
                ) : null}{" "}
              </div>{" "}
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                {" "}
                {(showPlanDeck ? futurePlan : futurePlan.slice(0, 2)).map(
                  (step, index) => (
                    <li key={`plan-${index}`}>{step}</li>
                  ),
                )}{" "}
              </ol>{" "}
              {hiddenMoves > 0 && !showPlanDeck ? (
                <div className="mt-2 text-[11px] text-slate-400">
                  {" "}
                  {hiddenMoves} moves concealed until recalibration. Toggle to
                  inspect full ladder.{" "}
                </div>
              ) : null}{" "}
            </div>
          ) : null}{" "}
          <Separator className="border-slate-800" />{" "}
          <div className="flex-1 overflow-hidden">
            {" "}
            <ScrollArea className="h-full rounded-xl border border-border bg-slate-800/20 px-3 py-3">
              {" "}
              <div className="space-y-3">
                {" "}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm leading-relaxed shadow-sm",
                      message.role === "echo"
                        ? "border-cyan-500/50 bg-cyan-950/40 text-cyan-50"
                        : "border-border bg-slate-800/30 text-slate-100",
                    )}
                  >
                    {" "}
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-300">
                      {" "}
                      <span>
                        {message.role === "echo" ? "Echo" : "You"}
                      </span>{" "}
                      <span>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>{" "}
                    </div>{" "}
                    <div className="mt-1 whitespace-pre-line text-sm">
                      {message.content}
                    </div>{" "}
                    {message.planPreview && message.planPreview.length ? (
                      <div className="mt-2 rounded-lg border border-dashed border-cyan-500/50 bg-cyan-950/30 p-2 text-xs text-cyan-100">
                        {" "}
                        <div className="font-semibold">Next two moves</div>{" "}
                        <ol className="mt-1 list-decimal space-y-1 pl-4">
                          {" "}
                          {message.planPreview.map((step, index) => (
                            <li key={`${message.id}-plan-${index}`}>{step}</li>
                          ))}{" "}
                        </ol>{" "}
                      </div>
                    ) : null}{" "}
                    {message.auditNote ? (
                      <div className="mt-2 rounded-md bg-amber-500/20 px-2.5 py-1.5 text-xs text-amber-100">
                        {" "}
                        <span className="font-semibold">Self-audit:</span>{" "}
                        {message.auditNote}{" "}
                      </div>
                    ) : null}{" "}
                  </div>
                ))}{" "}
                {thinking ? (
                  <div className="rounded-lg border border-dashed border-cyan-500/50 bg-cyan-950/40 px-3 py-2 text-sm text-cyan-100">
                    {" "}
                    Echo is recalculating the horizon…{" "}
                  </div>
                ) : null}{" "}
              </div>{" "}
            </ScrollArea>{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Echo what you’re sensing. Shift+Enter for newline."
              className="bg-slate-800/30 text-slate-100"
            />{" "}
            <div className="flex items-center justify-between text-xs text-slate-300">
              {" "}
              <span>
                Echo is sheltering {hiddenMoves} additional moves until the next
                recalibration.
              </span>{" "}
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!draft.trim() || thinking}
              >
                {" "}
                Send{" "}
              </Button>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>,
    portalTarget,
  );
}
