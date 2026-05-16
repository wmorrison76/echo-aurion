import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2, ShieldCheck } from "lucide-react";

import { PanelFrame } from "@/components/panels/PanelFrame";
import { useEchoActions } from "@/hooks/use-echo-actions";
import { useAudit } from "@/hooks/use-audit";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

type InvoiceStub = {
  id: string;
  vendor: string;
  due: string;
  amount: number;
  state: "Pending" | "Coding" | "Flagged";
};

const invoiceQueue: InvoiceStub[] = [
  {
    id: "INV-2034",
    vendor: "Pacifica Seafood Co.",
    due: "2025-06-17",
    amount: 1824.4,
    state: "Pending",
  },
  {
    id: "INV-2035",
    vendor: "Harvest Specialty Produce",
    due: "2025-06-18",
    amount: 948.0,
    state: "Flagged",
  },
  {
    id: "INV-2036",
    vendor: "Coastal linens",
    due: "2025-06-19",
    amount: 412.45,
    state: "Coding",
  },
];

const priorities = ["High", "Medium", "Low"] as const;

type Priority = (typeof priorities)[number];

export function InvoiceTriagePanel() {
  const echo = useEchoActions();
  const audit = useAudit();
  const { toast } = useToast();

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceStub>(invoiceQueue[0]);
  const [assignTo, setAssignTo] = useState("cpa@echo");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [notes, setNotes] = useState("Match seafood variance to dock weights");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<NonNullable<typeof echo.triageInvoice>>>>();

  const queue = useMemo(() => invoiceQueue, []);

  const handleTriage = async () => {
    if (!echo.triageInvoice) {
      toast({
        title: "Invoice triage unavailable",
        description: "Echo actions are offline. Try again shortly.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const outcome = await echo.triageInvoice({
        invoiceId: selectedInvoice.id,
        assignTo,
        priority,
        notes,
      });
      setResult(outcome);
      toast({
        title: "Invoice routed",
        description: `${selectedInvoice.id} sent to ${outcome.owner}.`,
      });
      await audit.log({
        action: "PANEL_ACTION",
        entity: "Invoice",
        entityId: selectedInvoice.id,
        data: { panel: "InvoiceTriage", priority, notes },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Could not triage invoice",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PanelFrame
      panelId="InvoiceTriage"
      title="Invoice triage"
      subtitle="Classify, assign, and escalate vendor invoices"
      areas={["finance", "global"]}
      toolbar={
        <button
          type="button"
          onClick={() => setAssignTo("recon@echo")}
          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 transition hover:border-slate-400 hover:bg-slate-100 dark:border-[#c8a97e]/25 dark:text-[#c8a97e]/80 dark:hover:border-[#c8a97e]/50 dark:hover:bg-[#c8a97e]-500/10"
        >
          Reassign
        </button>
      }
    >
      <div className="grid gap-3 lg:grid-cols-[1.1fr_1.5fr]">
        <aside className="space-y-2">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-slate-500 dark:text-[#c8a97e]/60">
            <span>Queue</span>
            <span>{queue.length} open</span>
          </div>
          <div className="space-y-2">
            {queue.map((invoice) => (
              <button
                key={invoice.id}
                type="button"
                onClick={() => setSelectedInvoice(invoice)}
                className={cn(
                  "w-full rounded-2xl border px-3 py-2 text-left transition",
                  invoice.id === selectedInvoice.id
                    ? "border-[#c8a97e]/60 bg-[#c8a97e]/08 text-[#c8a97e]/80 shadow-lg shadow-[#c8a97e]-500/10"
                    : "border-slate-200 bg-white/60 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-[#c8a97e]/80/80",
                )}
              >
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.28em]">
                  <span>{invoice.id}</span>
                  <span>{invoice.state}</span>
                </div>
                <div className="mt-1 text-sm font-medium text-slate-700 dark:text-white/80">
                  {invoice.vendor}
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-[#c8a97e]/60">
                  <span>Due {invoice.due}</span>
                  <span>{formatter.format(invoice.amount)}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex flex-col gap-3">
          <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-sm dark:border-[#c8a97e]/15 dark:bg-slate-900/60">
            <header className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-[#c8a97e]/80">
                Action details
              </h3>
              <div className="flex items-center gap-1 text-[11px] uppercase tracking-[0.28em] text-slate-400 dark:text-[#c8a97e]/70">
                <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                {selectedInvoice.id}
              </div>
            </header>
            <div className="mt-3 grid gap-2 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-[#c8a97e]/80">
                  Assign to
                </span>
                <input
                  value={assignTo}
                  onChange={(event) => setAssignTo(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white/90 px-3 py-1.5 text-sm text-slate-700 focus:border-slate-500 focus:outline-none dark:border-[#c8a97e]/25 dark:bg-slate-950/70 dark:text-[#c8a97e]/80"
                  placeholder="team@echo"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-[#c8a97e]/80">
                  Priority
                </span>
                <div className="flex gap-1.5">
                  {priorities.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPriority(value)}
                      className={cn(
                        "flex-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.32em] transition",
                        value === priority
                          ? "border-[#c8a97e]/60 bg-[#c8a97e]/08 text-[#c8a97e]/80"
                          : "border-slate-300 bg-white/80 text-slate-500 hover:border-slate-400 dark:border-[#c8a97e]/25 dark:bg-slate-950/70 dark:text-[#c8a97e]/60",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-[#c8a97e]/80">
                  Notes for CPA desk
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm leading-relaxed text-slate-700 focus:border-slate-500 focus:outline-none dark:border-[#c8a97e]/25 dark:bg-slate-950/70 dark:text-[#c8a97e]/80"
                />
              </label>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#c8a97e]/80">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Activity audited automatically
              </div>
              <button
                type="button"
                onClick={handleTriage}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-full border border-[#c8a97e]/60 bg-[#c8a97e]/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-white/80 transition hover:bg-[#c8a97e]/25 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                )}
                Run triage
              </button>
            </div>
          </div>

          {result ? (
            <div className="rounded-2xl border border-[#c8a97e]/25 bg-[#c8a97e]/08 p-3 text-sm text-white/80 shadow-lg shadow-[#c8a97e]-500/10">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em]">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                Outcome
              </div>
              <ul className="mt-2 space-y-1">
                <li>
                  Routed to: <span className="font-semibold">{result.owner}</span>
                </li>
                <li>Disposition: {result.status}</li>
                {result.nextStep ? <li>Next step: {result.nextStep}</li> : null}
                {result.warnings?.length ? (
                  <li>
                    Warnings:
                    <ul className="ml-4 list-disc space-y-0.5">
                      {result.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </PanelFrame>
  );
}

export default InvoiceTriagePanel;
