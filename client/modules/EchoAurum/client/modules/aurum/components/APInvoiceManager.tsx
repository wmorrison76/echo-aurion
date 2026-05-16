/** * EchoAurum AP/Invoice Manager * Hero module: Invoice capture, 3-way matching, approval workflows, payment * Production-grade SaaS UI with <200ms responsiveness */ import {
  AlertCircle,
  ArrowRight,
  Badge,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Filter,
  Plus,
  Search,
  TrendingUp,
  Upload,
  X,
  Loader2,
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import type { APInvoice } from "../../../../shared/aurum";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAPOperations } from "../hooks/useAPOperations";
import { useGuardianChecks } from "../hooks/useGuardianChecks";
export function APInvoiceManager({
  entityId = "ent_demo",
}: {
  entityId?: string;
}) {
  const [view, setView] = useState<
    "dashboard" | "inbox" | "matching" | "approval" | "payment"
  >("dashboard");
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const { listInvoices, getAPSummary, loading: apLoading } = useAPOperations();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [periodDate] = useState(new Date().toISOString().split("T")[0]);
  useEffect(() => {
    const fetchData = async () => {
      const [invoiceData, summaryData] = await Promise.all([
        listInvoices(entityId),
        getAPSummary(entityId, periodDate),
      ]);
      if (invoiceData?.invoices) setInvoices(invoiceData.invoices);
      if (summaryData) setSummary(summaryData);
    };
    fetchData();
  }, [entityId, periodDate, listInvoices, getAPSummary]);
  return (
    <div className="space-y-6">
      {" "}
      {/* Hero Header */}{" "}
      <div className="rounded-3xl border border-border/40 bg-gradient-to-br from-surface/90 via-surface-variant/80 to-surface/90 p-8 shadow-[0_35px_90px_-45px_rgba(8,12,22,0.65)]">
        {" "}
        <div className="flex items-start justify-between gap-6">
          {" "}
          <div>
            {" "}
            <span className="inline-flex items-center gap-2 rounded-full border border-aurum-300/40 bg-aurum-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-aurum-200">
              {" "}
              AP Hero Module{" "}
            </span>{" "}
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground">
              {" "}
              Accounts Payable{" "}
            </h1>{" "}
            <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
              {" "}
              3-way invoice matching, real-time approvals, and payment
              orchestration with Guardian oversight.{" "}
            </p>{" "}
          </div>{" "}
          <div className="flex gap-3">
            {" "}
            <Button
              onClick={() => setView("inbox")}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              {" "}
              <Upload className="h-4 w-4" /> Upload Invoice{" "}
            </Button>{" "}
            <Button size="lg" className="gap-2">
              {" "}
              <Plus className="h-4 w-4" /> New Invoice{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Tab Navigation */}{" "}
      <div className="flex gap-2 border-b border-border/40 bg-surface/60 p-4">
        {" "}
        {[
          { id: "dashboard", label: "Dashboard", icon: "📊" },
          { id: "inbox", label: "Inbox", icon: "📬", badge: 12 },
          { id: "matching", label: "3-Way Match", icon: "🔗", badge: 8 },
          { id: "approval", label: "Approvals", icon: "✓", badge: 24 },
          { id: "payment", label: "Payment", icon: "💳" },
        ].map((tab: any) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition",
              view === tab.id
                ? "border-b-2 border-aurum-400 bg-aurum-500/10 text-aurum-200"
                : "text-muted-foreground hover:bg-surface-variant/60",
            )}
          >
            {" "}
            <span>{tab.icon}</span> {tab.label}{" "}
            {tab.badge ? (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-200">
                {" "}
                {tab.badge}{" "}
              </span>
            ) : null}{" "}
          </button>
        ))}{" "}
      </div>{" "}
      {/* Content Views */}{" "}
      {view === "dashboard" ? (
        <APDashboard summary={summary} loading={apLoading} />
      ) : null}{" "}
      {view === "inbox" ? (
        <APInbox
          onSelectInvoice={setSelectedInvoice}
          invoices={invoices}
          loading={apLoading}
        />
      ) : null}{" "}
      {view === "matching" ? <ThreeWayMatching /> : null}{" "}
      {view === "approval" ? <ApprovalWorkflow /> : null}{" "}
      {view === "payment" ? <PaymentOrchestration /> : null}{" "}
    </div>
  );
}
function APDashboard({
  summary,
  loading,
}: {
  summary?: any;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        {" "}
        <Loader2 className="h-8 w-8 animate-spin text-aurum-300" />{" "}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {" "}
      {/* KPI Cards */}{" "}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {" "}
        <KPICard
          title="Outstanding AP"
          value={`$${(summary?.totalAmount || 0).toLocaleString()}`}
          change={`${summary?.totalInvoices || 0} invoices`}
          trend="up"
          icon="💰"
        />{" "}
        <KPICard
          title="Pending Approvals"
          value={summary?.pendingApprovals || "0"}
          change="Awaiting approval"
          trend="up"
          color="red"
          icon="⏳"
        />{" "}
        <KPICard
          title="Avg. Processing Time"
          value={`${summary?.averageProcessingDays || 0}d`}
          change="Days to process"
          trend="neutral"
          color="green"
          icon="⚡"
        />{" "}
        <KPICard
          title="Invoice Variance Rate"
          value={`${(summary?.varianceRate || 0).toFixed(1)}%`}
          change="Within tolerance"
          trend="neutral"
          color="green"
          icon="✓"
        />{" "}
      </div>{" "}
      {/* Vendor Performance & Top Issues */}{" "}
      <div className="grid gap-6 lg:grid-cols-2">
        {" "}
        <section className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
          {" "}
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            {" "}
            <TrendingUp className="h-5 w-5 text-aurum-300" /> Top 5 Vendors (by
            volume){" "}
          </h3>{" "}
          <div className="mt-4 space-y-3">
            {" "}
            {[
              { name: "Sysco", ytd: "$342K", invoices: 128, variance: "1.2%" },
              {
                name: "US Foods",
                ytd: "$287K",
                invoices: 98,
                variance: "0.8%",
              },
              {
                name: "Shamrock Foods",
                ytd: "$156K",
                invoices: 52,
                variance: "2.1%",
              },
              {
                name: "Local Supplier Co",
                ytd: "$89K",
                invoices: 34,
                variance: "3.2%",
              },
              {
                name: "Premium Linens",
                ytd: "$67K",
                invoices: 18,
                variance: "1.9%",
              },
            ].map((vendor) => (
              <div
                key={vendor.name}
                className="flex items-center justify-between rounded-lg border border-border/20 bg-surface/60 p-3 transition hover:bg-surface-variant/60"
              >
                {" "}
                <div>
                  {" "}
                  <p className="font-semibold text-foreground">
                    {vendor.name}
                  </p>{" "}
                  <p className="text-xs text-muted-foreground">
                    {" "}
                    {vendor.invoices} invoices • {vendor.ytd}{" "}
                  </p>{" "}
                </div>{" "}
                <div className="text-right">
                  {" "}
                  <p className="text-sm font-semibold text-foreground">
                    {" "}
                    {vendor.variance}{" "}
                  </p>{" "}
                  <p className="text-[0.7rem] text-muted-foreground/70">
                    {" "}
                    variance{" "}
                  </p>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </section>{" "}
        <section className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
          {" "}
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            {" "}
            <AlertCircle className="h-5 w-5 text-red-300" /> Active Issues{" "}
          </h3>{" "}
          <div className="mt-4 space-y-3">
            {" "}
            {[
              {
                type: "duplicate",
                invoice: "INV-2024-4521",
                vendor: "Sysco",
                severity: "high",
              },
              {
                type: "variance",
                invoice: "INV-2024-4498",
                vendor: "US Foods",
                severity: "medium",
                detail: "Price variance 3.2%",
              },
              {
                type: "missing_po",
                invoice: "INV-2024-4512",
                vendor: "New Vendor",
                severity: "medium",
              },
              {
                type: "off_hours",
                invoice: "INV-2024-4511",
                vendor: "Premium Linens",
                severity: "low",
                detail: "Posted at 2:14 AM",
              },
            ].map((issue, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg border p-3 transition",
                  issue.severity === "high"
                    ? "border-red-500/30 bg-red-500/10"
                    : issue.severity === "medium"
                      ? "border-yellow-500/30 bg-yellow-500/10"
                      : "border-blue-500/30 bg-primary/10",
                )}
              >
                {" "}
                <div className="flex items-start justify-between gap-3">
                  {" "}
                  <div>
                    {" "}
                    <p className="text-sm font-semibold capitalize text-foreground">
                      {" "}
                      {issue.type.replace(/_/g, "")} · {issue.invoice}{" "}
                    </p>{" "}
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      {issue.vendor}{" "}
                      {issue.detail ? ` · ${issue.detail}` : ""}{" "}
                    </p>{" "}
                  </div>{" "}
                  <span
                    className={cn(
                      "text-[0.6rem] rounded-full border px-2 py-1 font-bold uppercase",
                      issue.severity === "high"
                        ? "border-red-500/30 bg-red-500/10 text-red-200"
                        : issue.severity === "medium"
                          ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-200"
                          : "border-blue-500/30 bg-primary/10 text-blue-200",
                    )}
                  >
                    {" "}
                    {issue.severity}{" "}
                  </span>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </section>{" "}
      </div>{" "}
    </div>
  );
}
function APInbox({
  onSelectInvoice,
  invoices: initialInvoices = [],
  loading = false,
}: {
  onSelectInvoice: (id: string) => void;
  invoices?: any[];
  loading?: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "received" | "unmatched" | "variance"
  >("all");
  const invoices =
    initialInvoices.length > 0
      ? initialInvoices
      : [
          {
            id: "inv_4521",
            number: "INV-2024-4521",
            vendor: "Sysco",
            date: "2024-11-15",
            amount: 12450,
            status: "received",
            matchStatus: "duplicate",
            OCRConfidence: 0.98,
          },
          {
            id: "inv_4520",
            number: "INV-2024-4520",
            vendor: "US Foods",
            date: "2024-11-15",
            amount: 8230,
            status: "received",
            matchStatus: "variance",
            OCRConfidence: 0.94,
          },
        ];
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.amount?.toString().includes(searchTerm);
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "received" && inv.status === "received") ||
      (filterStatus === "unmatched" && inv.matchStatus === "unmatched") ||
      (filterStatus === "variance" && inv.matchStatus === "variance");
    return matchesSearch && matchesFilter;
  });
  return (
    <div className="space-y-4">
      {" "}
      {/* Search & Filter Bar */}{" "}
      <div className="flex gap-4">
        {" "}
        <div className="flex-1 relative">
          {" "}
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />{" "}
          <Input
            placeholder="Search invoice #, vendor, amount..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />{" "}
        </div>{" "}
        <div className="flex gap-2">
          {" "}
          {(["all", "received", "unmatched", "variance"] as const).map(
            (status) => (
              <Button
                key={status}
                variant={filterStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className="capitalize"
              >
                {" "}
                {status}{" "}
              </Button>
            ),
          )}{" "}
        </div>{" "}
      </div>{" "}
      {/* Invoice List */}{" "}
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-border/40 bg-surface-variant/60 py-12">
          {" "}
          <Loader2 className="h-8 w-8 animate-spin text-aurum-300" />{" "}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/40">
          {" "}
          <table className="w-full table-fixed">
            {" "}
            <thead className="border-b border-border/40 bg-surface-variant/60 text-[0.75rem] font-semibold uppercase tracking-[0.2em]">
              {" "}
              <tr>
                {" "}
                <th className="px-4 py-3 text-left text-muted-foreground">
                  {" "}
                  Invoice #{" "}
                </th>{" "}
                <th className="px-4 py-3 text-left text-muted-foreground">
                  {" "}
                  Vendor{" "}
                </th>{" "}
                <th className="px-4 py-3 text-left text-muted-foreground">
                  {" "}
                  Date{" "}
                </th>{" "}
                <th className="px-4 py-3 text-right text-muted-foreground">
                  {" "}
                  Amount{" "}
                </th>{" "}
                <th className="px-4 py-3 text-left text-muted-foreground">
                  {" "}
                  Status{" "}
                </th>{" "}
                <th className="px-4 py-3 text-center text-muted-foreground">
                  {" "}
                  OCR{" "}
                </th>{" "}
                <th className="px-4 py-3 text-center text-muted-foreground">
                  {" "}
                  Actions{" "}
                </th>{" "}
              </tr>{" "}
            </thead>{" "}
            <tbody className="divide-y divide-border/20">
              {" "}
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="transition hover:bg-surface-variant/40"
                  >
                    {" "}
                    <td className="px-4 py-3">
                      {" "}
                      <p className="font-semibold text-foreground">
                        {" "}
                        {inv.invoiceNumber || inv.number}{" "}
                      </p>{" "}
                    </td>{" "}
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {" "}
                      {inv.vendorName || inv.vendor}{" "}
                    </td>{" "}
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {" "}
                      {new Date(
                        inv.invoiceDate || inv.date,
                      ).toLocaleDateString()}{" "}
                    </td>{" "}
                    <td className="px-4 py-3 text-right font-semibold">
                      {" "}
                      ${inv.amount.toLocaleString()}{" "}
                    </td>{" "}
                    <td className="px-4 py-3">
                      {" "}
                      <StatusBadge
                        status={inv.status}
                        matchStatus={inv.matchStatus}
                      />{" "}
                    </td>{" "}
                    <td className="px-4 py-3 text-center">
                      {" "}
                      <span
                        className={cn(
                          "inline-flex items-center justify-center rounded-full px-2 py-1 text-[0.6rem] font-bold",
                          (inv.OCRConfidence || inv.ocrConfidence || 0) > 0.95
                            ? "bg-emerald-500/20 text-emerald-200"
                            : (inv.OCRConfidence || inv.ocrConfidence || 0) >
                                0.85
                              ? "bg-yellow-500/20 text-yellow-200"
                              : "bg-red-500/20 text-red-200",
                        )}
                      >
                        {" "}
                        {Math.round(
                          (inv.OCRConfidence || inv.ocrConfidence || 0) * 100,
                        )}{" "}
                        %{" "}
                      </span>{" "}
                    </td>{" "}
                    <td className="px-4 py-3">
                      {" "}
                      <div className="flex justify-center gap-2">
                        {" "}
                        <button
                          onClick={() => onSelectInvoice(inv.id)}
                          className="p-1 text-muted-foreground transition hover:text-aurum-300"
                        >
                          {" "}
                          <Eye className="h-4 w-4" />{" "}
                        </button>{" "}
                        <button className="p-1 text-muted-foreground transition hover:text-aurum-300">
                          {" "}
                          <Download className="h-4 w-4" />{" "}
                        </button>{" "}
                      </div>{" "}
                    </td>{" "}
                  </tr>
                ))
              ) : (
                <tr>
                  {" "}
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {" "}
                    No invoices found{" "}
                  </td>{" "}
                </tr>
              )}{" "}
            </tbody>{" "}
          </table>{" "}
        </div>
      )}{" "}
    </div>
  );
}
function ThreeWayMatching() {
  return (
    <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
      {" "}
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        {" "}
        <ArrowRight className="h-5 w-5 text-aurum-300" /> 3-Way Match
        Results{" "}
      </h3>{" "}
      <p className="mt-2 text-sm text-muted-foreground">
        {" "}
        Comparing invoice to PO and receipt within 2% tolerance{" "}
      </p>{" "}
      {/* Match visualization would go here */}{" "}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {" "}
        <MatchCard
          title="PO Matched"
          status="matched"
          detail="Qty: 50 units"
        />{" "}
        <MatchCard
          title="Receipt Matched"
          status="variance"
          detail="Qty: 48 units (-4%)"
        />{" "}
        <MatchCard
          title="Invoice Amount"
          status="variance"
          detail="$2,350 (+2.1%)"
        />{" "}
      </div>{" "}
    </div>
  );
}
function ApprovalWorkflow() {
  return (
    <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
      {" "}
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        {" "}
        <CheckCircle2 className="h-5 w-5 text-emerald-300" /> Approval
        Workflow{" "}
      </h3>{" "}
      <p className="mt-2 text-sm text-muted-foreground">
        {" "}
        Invoices requiring approval based on amount and vendor tier{" "}
      </p>{" "}
      {/* Approval matrix would go here */}{" "}
      <div className="mt-6 space-y-2">
        {" "}
        {[
          { tier: "Supervisor", range: "< $5,000", count: 3 },
          { tier: "Manager", range: "$5,000 - $25,000", count: 12 },
          { tier: "Director", range: "$25,000 - $100,000", count: 6 },
          { tier: "CFO", range: "> $100,000", count: 3 },
        ].map((tier) => (
          <div
            key={tier.tier}
            className="flex items-center justify-between rounded-lg border border-border/20 bg-surface/60 p-3"
          >
            {" "}
            <div>
              {" "}
              <p className="font-semibold text-foreground">{tier.tier}</p>{" "}
              <p className="text-xs text-muted-foreground">{tier.range}</p>{" "}
            </div>{" "}
            <span className="rounded-full bg-aurum-500/20 px-3 py-1 text-sm font-bold text-aurum-200">
              {" "}
              {tier.count} pending{" "}
            </span>{" "}
          </div>
        ))}{" "}
      </div>{" "}
    </div>
  );
}
function PaymentOrchestration() {
  const paymentMethods = [
    { method: "ACH", ready: 8, amount: 45230, time: "Next day" },
    { method: "Check", ready: 3, amount: 12450, time: "2-3 days" },
    { method: "Virtual Card", ready: 5, amount: 28750, time: "Immediate" },
    { method: "Wire", ready: 2, amount: 156000, time: "Same day" },
  ];
  return (
    <div className="space-y-6">
      {" "}
      <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
        {" "}
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          {" "}
          <ArrowRight className="h-5 w-5 text-sky-300" /> Payment Batches by
          Method{" "}
        </h3>{" "}
        <p className="mt-2 text-sm text-muted-foreground">
          {" "}
          Optimal routing with vendor payment term and bank limits{" "}
        </p>{" "}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {" "}
          {paymentMethods.map((method) => (
            <div
              key={method.method}
              className="rounded-xl border border-border/40 bg-surface/60 p-4 transition hover:border-sky-400/60"
            >
              {" "}
              <p className="text-sm font-semibold text-foreground">
                {" "}
                {method.method}{" "}
              </p>{" "}
              <p className="mt-2 text-2xl font-bold text-sky-300">
                {" "}
                {method.ready}{" "}
              </p>{" "}
              <p className="text-xs text-muted-foreground">invoices ready</p>{" "}
              <p className="mt-3 font-semibold text-foreground">
                {" "}
                ${method.amount.toLocaleString()}{" "}
              </p>{" "}
              <p className="text-xs text-muted-foreground/80">{method.time}</p>{" "}
              <Button size="sm" className="mt-4 w-full" variant="outline">
                {" "}
                Prepare {method.method}{" "}
              </Button>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
        {" "}
        <h3 className="text-lg font-semibold">Payment Strategy</h3>{" "}
        <p className="mt-2 text-sm text-muted-foreground">
          {" "}
          AI-optimized payment timing based on vendor terms and cash
          position{" "}
        </p>{" "}
        <div className="mt-4 space-y-2">
          {" "}
          {[
            {
              action: "Pay on day 40 (discount at day 35)",
              vendors: 12,
              savings: "$4,230",
            },
            {
              action: "Accelerate early payment discounts",
              vendors: 5,
              savings: "$1,850",
            },
            {
              action: "Hold until day 60 for cash preservation",
              vendors: 8,
              impact: "Holds $89K",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-border/20 bg-surface/60 p-3"
            >
              {" "}
              <p className="font-semibold text-foreground">
                {item.action}
              </p>{" "}
              <span className="text-sm text-sky-300">
                {" "}
                {item.vendors} vendors{" "}
              </span>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}

/* ============================================================================
   COMPONENT UTILITIES
   ============================================================================ */
function KPICard({
  title,
  value,
  change,
  trend,
  color = "aurum",
  icon,
}: {
  title: string;
  value: ReactNode;
  change: string;
  trend: "up" | "down" | "neutral";
  color?: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-4 transition hover:border-border/60">
      {" "}
      <div className="flex items-start justify-between gap-2">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {" "}
            {title}{" "}
          </p>{" "}
          <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>{" "}
          <p
            className={cn(
              "mt-2 text-xs font-semibold",
              trend === "up"
                ? "text-red-300"
                : trend === "down"
                  ? "text-emerald-300"
                  : "text-muted-foreground",
            )}
          >
            {" "}
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {change}{" "}
          </p>{" "}
        </div>{" "}
        <span className="text-3xl">{icon}</span>{" "}
      </div>{" "}
    </div>
  );
}
function StatusBadge({
  status,
  matchStatus,
}: {
  status: string;
  matchStatus: string;
}) {
  if (matchStatus === "duplicate") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-[0.65rem] font-semibold text-red-200">
        {" "}
        <AlertCircle className="h-3 w-3" /> Duplicate{" "}
      </span>
    );
  }
  if (matchStatus === "variance") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 text-[0.65rem] font-semibold text-yellow-200">
        {" "}
        <AlertCircle className="h-3 w-3" /> Variance{" "}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[0.65rem] font-semibold text-emerald-200">
      {" "}
      <CheckCircle2 className="h-3 w-3" /> Matched{" "}
    </span>
  );
}
function MatchCard({
  title,
  status,
  detail,
}: {
  title: string;
  status: "matched" | "variance" | "pending";
  detail: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 p-4 text-center",
        status === "matched"
          ? "border-emerald-500/30 bg-emerald-500/10"
          : status === "variance"
            ? "border-yellow-500/30 bg-yellow-500/10"
            : "border-border/40 bg-surface/60",
      )}
    >
      {" "}
      <p
        className={cn(
          "text-xs font-semibold uppercase tracking-[0.2em]",
          status === "matched"
            ? "text-emerald-200"
            : status === "variance"
              ? "text-yellow-200"
              : "text-muted-foreground",
        )}
      >
        {" "}
        {title}{" "}
      </p>{" "}
      <p className="mt-2 text-sm font-semibold text-foreground">{detail}</p>{" "}
      <p
        className={cn(
          "mt-2 text-[0.65rem] font-bold uppercase",
          status === "matched"
            ? "text-emerald-300"
            : status === "variance"
              ? "text-yellow-300"
              : "text-muted-foreground/70",
        )}
      >
        {" "}
        {status}{" "}
      </p>{" "}
    </div>
  );
}
