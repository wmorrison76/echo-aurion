import React, { useState, useEffect, useCallback } from "react";
import { FileText, TrendingUp, Users, DollarSign, AlertCircle, CheckCircle2, Clock } from "lucide-react";

const BACKEND = window.location.origin;

interface EventRevenue {
  food: number;
  beverage: number;
  rental: number;
  av: number;
  service_charge: number;
  other: number;
  total: number;
}

interface EventSpend {
  food: number;
  beverage: number;
  labor: number;
  rental: number;
  overhead: number;
  total: number;
}

interface EventItem {
  id: string;
  beo_number: string;
  name: string;
  event_type: string;
  stage: string;
  client_name: string;
  event_date: string;
  venue: string;
  guest_count: number;
  guaranteed_count: number;
  revenue: EventRevenue;
  actual_spend: EventSpend;
  profit_margin: number;
  deposits: Array<{ amount: number; method: string; date: string }>;
  beo_notes: string;
  setup_style: string;
  table_count: number;
  staff_count: number;
}

interface ReportSummary {
  definite_count: number;
  pending_count: number;
  total_definite_revenue: number;
  total_definite_spend: number;
  total_pending_revenue: number;
  total_definite_guests: number;
  total_pending_guests: number;
  overall_margin: number;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    prospect: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-300",
    inquiry: "bg-orange-500/20 text-orange-600 dark:text-orange-300",
    tentative: "bg-amber-500/20 text-amber-600 dark:text-amber-300",
    contract_signed: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300",
    deposit_received: "bg-green-500/20 text-green-600 dark:text-green-300",
    menu_selected: "bg-blue-500/20 text-blue-600 dark:text-blue-300",
    beo_issued: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-300",
    closed: "bg-slate-500/20 text-slate-600 dark:text-slate-300",
  };
  const cls = colors[stage] || "bg-slate-500/20 text-slate-600 dark:text-slate-300";
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${cls}`} data-testid={`stage-badge-${stage}`}>
      {stage.replace(/_/g, " ")}
    </span>
  );
}

function EventRow({ event, expanded, onToggle }: { event: EventItem; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer hover:bg-[var(--sidebar-accent)] transition-colors border-b border-[var(--border)]"
        data-testid={`event-row-${event.id}`}
      >
        <td className="px-3 py-2 font-mono text-xs text-[var(--muted-foreground)]">{event.beo_number}</td>
        <td className="px-3 py-2 font-medium text-sm text-[var(--foreground)]">{event.name}</td>
        <td className="px-3 py-2 text-xs">{event.event_date || "TBD"}</td>
        <td className="px-3 py-2"><StageBadge stage={event.stage} /></td>
        <td className="px-3 py-2 text-sm font-medium text-[var(--foreground)]">{formatCurrency(event.revenue.total)}</td>
        <td className="px-3 py-2 text-sm text-[var(--muted-foreground)]">{formatCurrency(event.actual_spend.total)}</td>
        <td className="px-3 py-2 text-sm">
          <span className={event.profit_margin > 50 ? "text-emerald-500 dark:text-emerald-400" : event.profit_margin > 20 ? "text-yellow-500 dark:text-yellow-400" : "text-red-500 dark:text-red-400"}>
            {event.profit_margin}%
          </span>
        </td>
        <td className="px-3 py-2 text-sm text-center">{event.guest_count}</td>
      </tr>
      {expanded && (
        <tr className="bg-[var(--sidebar-accent)]">
          <td colSpan={8} className="px-4 py-3">
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="font-semibold text-[var(--foreground)] mb-1">Revenue Breakdown</p>
                <p>Food: {formatCurrency(event.revenue.food)}</p>
                <p>Beverage: {formatCurrency(event.revenue.beverage)}</p>
                <p>Rental: {formatCurrency(event.revenue.rental)}</p>
                <p>A/V: {formatCurrency(event.revenue.av)}</p>
                <p>Service Charge: {formatCurrency(event.revenue.service_charge)}</p>
              </div>
              <div>
                <p className="font-semibold text-[var(--foreground)] mb-1">Actual Spend</p>
                <p>Food Cost: {formatCurrency(event.actual_spend.food)}</p>
                <p>Beverage Cost: {formatCurrency(event.actual_spend.beverage)}</p>
                <p>Labor: {formatCurrency(event.actual_spend.labor)}</p>
                <p>Rental: {formatCurrency(event.actual_spend.rental)}</p>
                <p>Overhead: {formatCurrency(event.actual_spend.overhead)}</p>
              </div>
              <div>
                <p className="font-semibold text-[var(--foreground)] mb-1">Details</p>
                <p>Client: {event.client_name || "N/A"}</p>
                <p>Venue: {event.venue || "N/A"}</p>
                <p>Setup: {event.setup_style || "N/A"} ({event.table_count} tables)</p>
                <p>Staff: {event.staff_count || "N/A"}</p>
                {event.beo_notes && <p className="mt-1 italic">Notes: {event.beo_notes}</p>}
                {event.deposits.length > 0 && (
                  <p className="mt-1">Deposits: {event.deposits.map(d => formatCurrency(d.amount)).join(", ")}</p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function EchoEventsReport() {
  const [definite, setDefinite] = useState<EventItem[]>([]);
  const [pending, setPending] = useState<EventItem[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"definite" | "pending">("definite");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BACKEND}/api/echo-events/report`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDefinite(data.definite || []);
      setPending(data.pending || []);
      setSummary(data.summary || null);
    } catch (err: any) {
      setError(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReport(); }, [loadReport]);

  const events = tab === "definite" ? definite : pending;

  return (
    <div className="flex flex-col h-full bg-[var(--background)] text-[var(--foreground)]" data-testid="echo-events-report">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-[var(--primary)]" />
          <h2 className="text-base font-semibold">EchoEvents Definite & Pending</h2>
        </div>
        <button
          onClick={loadReport}
          className="px-3 py-1 text-xs rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition"
          data-testid="refresh-report-btn"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-3 px-4 py-3">
          <div className="rounded-lg border border-[var(--border)] p-3 bg-[var(--card)]" data-testid="summary-definite-revenue">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
              <CheckCircle2 size={12} /> Definite Revenue
            </div>
            <p className="text-lg font-bold text-emerald-500">{formatCurrency(summary.total_definite_revenue)}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">{summary.definite_count} events / {summary.total_definite_guests} guests</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-3 bg-[var(--card)]" data-testid="summary-definite-spend">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
              <DollarSign size={12} /> Actual Spend
            </div>
            <p className="text-lg font-bold text-orange-500 dark:text-orange-400">{formatCurrency(summary.total_definite_spend)}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">Margin: {summary.overall_margin}%</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-3 bg-[var(--card)]" data-testid="summary-pending-revenue">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
              <Clock size={12} /> Pending Revenue
            </div>
            <p className="text-lg font-bold text-yellow-500 dark:text-yellow-400">{formatCurrency(summary.total_pending_revenue)}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">{summary.pending_count} events / {summary.total_pending_guests} guests</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-3 bg-[var(--card)]" data-testid="summary-total-guests">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
              <Users size={12} /> Total Pipeline
            </div>
            <p className="text-lg font-bold">{summary.definite_count + summary.pending_count}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">{summary.total_definite_guests + summary.total_pending_guests} total guests</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-1">
        <button
          onClick={() => setTab("definite")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
            tab === "definite"
              ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
              : "bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
          data-testid="tab-definite"
        >
          Definite ({definite.length})
        </button>
        <button
          onClick={() => setTab("pending")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
            tab === "pending"
              ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
              : "bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
          data-testid="tab-pending"
        >
          Pending ({pending.length})
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-4 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 py-8 justify-center text-red-500 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        ) : events.length === 0 ? (
          <p className="text-center py-12 text-[var(--muted-foreground)] text-sm">No {tab} events found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] border-b border-[var(--border)]">
                <th className="px-3 py-2">BEO #</th>
                <th className="px-3 py-2">Event Name</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2">Revenue</th>
                <th className="px-3 py-2">Spend</th>
                <th className="px-3 py-2">Margin</th>
                <th className="px-3 py-2 text-center">Guests</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <EventRow
                  key={ev.id}
                  event={ev}
                  expanded={expandedId === ev.id}
                  onToggle={() => setExpandedId(expandedId === ev.id ? null : ev.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
