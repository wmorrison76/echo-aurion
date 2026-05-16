import { ArrowRight, ShieldCheck, Sparkles, Waves } from "lucide-react";
import { Link } from "react-router-dom";
import { EchoAiDock } from "@/components/echo-ai/EchoAiDock";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/PageLayout";
const heroMetrics = [
  {
    label: "Period Close",
    value: "< 2 days",
    description: "Automated accruals + AI variance narratives",
  },
  {
    label: "AP Cycle",
    value: "60% faster",
    description: "OCR + Echo Ai³ payment prioritization",
  },
  {
    label: "Forecast Accuracy",
    value: "±2%",
    description: "Weather + demand drivers streamed in real-time",
  },
];
const platformStreams = [
  {
    title: "CFO Command Center",
    description:
      "Multi-pane glass dashboard with live cash ladder, variance radar, and AI narrative dock for every entity.",
    highlights: [
      "Cash ladder heatmap",
      "EchoExplain insights",
      "Latency <200ms",
    ],
  },
  {
    title: "Event-Sourced Ledger",
    description:
      "Every OPERA, Toast, and payroll event routes through EchoLedger² into immutable journals (TIMESTAMPTZ(6)).",
    highlights: [
      "USALI + GAAP dual book",
      "Phoenix reversibility",
      "Argus audit trail",
    ],
  },
  {
    title: "Ai³ Forecast Studio",
    description:
      "Scenario studio with occupancy, ADR, and weather inputs that re-forecast cash, staffing, and P&L in seconds.",
    highlights: [
      "Scenario banding",
      "Dynamic discount ladder",
      "Variance explain",
    ],
  },
];
const modules = [
  {
    id: "invoice-payment",
    name: "Invoice & Payment Hub",
    body: "Drag-drop ingest, OCR, triad matching, and ACH/VC batched payouts governed by EchoSentinel.",
    badge: "AP",
    href: "/console#invoice-payment",
  },
  {
    id: "ledger-viewer",
    name: "Ledger Viewer",
    body: "Side-by-side source, journal, and evidence with entity, department, and vendor filters—compliant by design.",
    badge: "GL",
    href: "/console#ledger-viewer",
  },
  {
    id: "forecast-studio",
    name: "Forecast Studio",
    body: "Ai³ actuarial engine blending PMS occupancy, weather, and events to anticipate cash gaps before they emerge.",
    badge: "Ai³",
    href: "/console#forecast-studio",
  },
  {
    id: "cpa-portal",
    name: "CPA Portal",
    body: "Push-button export to Axcess, UltraTax, and Lacerte with binder packaging, tick marks, and workpaper sync.",
    badge: "CPA",
    href: "/console#cpa-portal",
  },
  {
    id: "purchasing",
    name: "Purchasing & Receiving",
    body: "Invoice, inventory, and dock orchestration unified for LUCCCA buyers and receiving teams.",
    badge: "Supply",
    href: "/purchasing",
  },
];
const integrations = [
  {
    cluster: "ERP & Financial",
    partners: "NetSuite, Sage Intacct, SAP S/4, Odoo",
    flow: "Two-way sync of bills, consolidations, eliminations",
  },
  {
    cluster: "PMS & POS",
    partners: "OPERA Cloud, Infor HMS, StayNTouch, Toast, R365, Micros",
    flow: "Daily revenue, net sales, and event bus ingestion",
  },
  {
    cluster: "AP & Vendors",
    partners:
      "LUCCCA Vendor Exchange, Bill.com, Fintech, Stripe Treasury, Adyen",
    flow: "Invoice ingest, payment orchestration, rebate management",
  },
  {
    cluster: "Risk & Guardians",
    partners: "Zelda, Argus, Phoenix, Odin",
    flow: "Snapshots, audit evidence, rollback, threat analytics",
  },
];
const roadmap = [
  {
    title: "Phase I — Foundation (0-90 days)",
    items: [
      "Deploy EchoLedger² with USALI mapping and immutable journal events",
      "Launch AP triad matching, OCR, and Echo Ai¹ Assist workflows",
      "Wire OPERA + Toast adapters for instant flash reporting",
      "Provision CPA exports (TB CSV + Workpaper ZIP) and Zelda snapshots",
    ],
  },
  {
    title: "Phase II — Intelligence (90-180 days)",
    items: [
      "Enable Ai³ Forecast Studio with PredictHQ and NOAA drivers",
      "Roll out cash ladder optimizer + vendor discount prioritization",
      "Activate EchoExplain narratives + dual-book intercompany eliminations",
      "Deploy EchoSentinel fraud guardrails and CPA Bridge v2",
    ],
  },
];
const securityHighlights = [
  {
    title: "Guardian Mesh",
    detail:
      "Zelda cold snapshots, Argus immutable audit, Phoenix time-travel, and Odin threat analytics woven through every pod.",
  },
  {
    title: "Zero-Trust Vault",
    detail:
      "HashiCorp Vault-managed secrets, PQC-ready key rotation, and per-tenant RLS enforcing finance isolation.",
  },
  {
    title: "Observability SLOs",
    detail:
      "OpenTelemetry traces, Grafana SLOs, and Prometheus budgets keep ledger reject rates below 0.05%.",
  },
];
export default function Index() {
  return (
    <PageLayout>
      {" "}
      <div className="relative overflow-hidden">
        {" "}
        <div className="pointer-events-none absolute inset-x-0 top-[-120px] h-[420px] bg-[radial-gradient(circle_at_top,_rgba(236,211,133,0.18)_0%,_rgba(12,18,35,0)_60%)]" />{" "}
        <section
          id="platform"
          className="relative mx-auto max-w-6xl scroll-mt-32 px-6 pb-20 pt-24 sm:px-10 lg:pt-28"
        >
          {" "}
          <div className="flex flex-col gap-12 lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            {" "}
            <div>
              {" "}
              <span className="inline-flex items-center gap-2 rounded-full border border-aurum-400/50 bg-aurum-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-aurum-200">
                {" "}
                <Sparkles className="h-3.5 w-3.5" /> Echo Ai³ inside{" "}
              </span>{" "}
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {" "}
                EchoAurum™ — The golden source of hospitality finance.{" "}
              </h1>{" "}
              <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
                {" "}
                Built for LUCCCA, EchoAurum unifies ledger, AP, forecasting, and
                CPA collaboration into a single command surface. Every posting
                is event-sourced, AI-explained, and instantly audit-ready.{" "}
              </p>{" "}
              <div className="mt-8 flex flex-wrap items-center gap-4" id="cta">
                {" "}
                <Button
                  size="lg"
                  className="bg-aurum-500 text-surface-900 shadow-lg shadow-aurum-600/40 hover:bg-aurum-400"
                  asChild
                >
                  {" "}
                  <a
                    href="mailto:aurum@luccca.cloud"
                    className="flex items-center gap-2"
                  >
                    {" "}
                    Deploy EchoAurum <ArrowRight className="h-4 w-4" />{" "}
                  </a>{" "}
                </Button>{" "}
                <Button
                  variant="ghost"
                  size="lg"
                  className="border border-border/60 bg-surface-variant/40"
                  asChild
                >
                  {" "}
                  <a href="#integrations" className="flex items-center gap-2">
                    {" "}
                    View integration mesh <Waves className="h-4 w-4" />{" "}
                  </a>{" "}
                </Button>{" "}
              </div>{" "}
              <div className="mt-10 grid gap-6 sm:grid-cols-3">
                {" "}
                {heroMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-border/40 bg-surface/80 p-5 shadow-lg shadow-black/10"
                  >
                    {" "}
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                      {" "}
                      {metric.label}{" "}
                    </p>{" "}
                    <p className="mt-3 text-3xl font-semibold text-foreground">
                      {" "}
                      {metric.value}{" "}
                    </p>{" "}
                    <p className="mt-2 text-sm text-muted-foreground/80">
                      {" "}
                      {metric.description}{" "}
                    </p>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
            </div>{" "}
            <div className="relative">
              {" "}
              <div className="absolute inset-0 -translate-y-6 translate-x-6 rounded-3xl bg-gradient-to-br from-aurum-400/40 via-transparent to-transparent blur-3xl" />{" "}
              <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-surface/70 backdrop-blur-xl shadow-[0_25px_60px_-30px_rgba(17,25,40,0.8)]">
                {" "}
                <div className="border-b border-border/40 bg-surface-variant/60 px-6 py-4">
                  {" "}
                  <div className="flex items-center justify-between">
                    {" "}
                    <p className="text-sm font-semibold text-muted-foreground">
                      {" "}
                      Real-time Liquidity Signal{" "}
                    </p>{" "}
                    <span className="flex items-center gap-2 text-xs text-aurum-200">
                      {" "}
                      <span className="h-2.5 w-2.5 rounded-full bg-aurum-400" />{" "}
                      Live{" "}
                    </span>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="grid gap-0.5 bg-gradient-to-br from-[#10182b] via-[#0c131f] to-[#05080f] p-6 text-sm text-slate-100 dark:text-muted-foreground">
                  {" "}
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1.4fr_1fr_1fr_1fr] items-center gap-4 rounded-xl border border-white/10 bg-background px-4 py-3"
                    >
                      {" "}
                      <span className="font-semibold text-white dark:text-foreground/90">
                        {" "}
                        {index % 2 === 0
                          ? "EchoLedger²"
                          : "EchoStratus Ai³"}{" "}
                      </span>{" "}
                      <span className="text-slate-300 dark:text-muted-foreground">
                        {" "}
                        {index % 2 === 0 ? "OPERA Revenue" : "PredictHQ"}{" "}
                      </span>{" "}
                      <span className="text-aurum-200">
                        {" "}
                        {index % 3 === 0
                          ? "+$214K"
                          : index % 3 === 1
                            ? "±0.9%"
                            : "-12 hrs"}{" "}
                      </span>{" "}
                      <span className="text-right text-xs uppercase tracking-[0.28em] text-slate-400 dark:text-muted-foreground">
                        {" "}
                        {index % 2 === 0 ? "Ledger" : "Forecast"}{" "}
                      </span>{" "}
                    </div>
                  ))}{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </section>{" "}
        <section
          id="modules"
          className="mx-auto max-w-6xl scroll-mt-32 px-6 py-20 sm:px-10"
        >
          {" "}
          <div className="mx-auto max-w-2xl text-center">
            {" "}
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {" "}
              Unified modules engineered for hospitality precision.{" "}
            </h2>{" "}
            <p className="mt-4 text-base text-muted-foreground">
              {" "}
              EchoAurum orchestrates every hospitality signal—from banquet
              forecasts to labor accruals—through four core modules tuned to
              LUCCCA’s ecosystem.{" "}
            </p>{" "}
          </div>{" "}
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {" "}
            {modules.map((module) => (
              <Link
                key={module.id}
                to={module.href}
                className="group relative overflow-hidden rounded-3xl border border-border/40 bg-surface/80 p-8 shadow-lg shadow-black/10 transition-transform hover:-translate-y-1 hover:shadow-[0_35px_80px_-40px_rgba(12,18,35,0.9)]"
              >
                {" "}
                <div className="absolute inset-0 bg-gradient-to-br from-aurum-500/0 via-aurum-500/0 to-aurum-500/0 transition-opacity duration-300 group-hover:via-aurum-500/10 group-hover:to-aurum-500/5" />{" "}
                <div className="relative">
                  {" "}
                  <span className="inline-flex items-center gap-2 rounded-full border border-aurum-300/40 bg-aurum-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
                    {" "}
                    {module.badge}{" "}
                  </span>{" "}
                  <h3 className="mt-6 text-2xl font-semibold text-foreground">
                    {" "}
                    {module.name}{" "}
                  </h3>{" "}
                  <p className="mt-3 text-sm text-muted-foreground">
                    {" "}
                    {module.body}{" "}
                  </p>{" "}
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-aurum-200">
                    {" "}
                    Explore in console <ArrowRight className="h-4 w-4" />{" "}
                  </span>{" "}
                </div>{" "}
              </Link>
            ))}{" "}
          </div>{" "}
        </section>{" "}
        <section
          id="echo-ai"
          className="mx-auto max-w-6xl scroll-mt-32 px-6 pb-20 sm:px-10"
        >
          {" "}
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            {" "}
            <div>
              {" "}
              <span className="inline-flex items-center gap-2 rounded-full border border-aurum-300/50 bg-aurum-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-aurum-100">
                {" "}
                Echo Ai³ inside LUCCCA{" "}
              </span>{" "}
              <h2 className="mt-5 text-3xl font-semibold text-foreground sm:text-4xl">
                {" "}
                Launch the EchoAi³ command dock directly from EchoAurum.{" "}
              </h2>{" "}
              <p className="mt-4 text-base text-muted-foreground">
                {" "}
                Conversations route through Zelda, Argus, Phoenix, and Odin so
                every recommendation is auditable and reversible. Engage Ai³ to
                orchestrate cash, diagnose variance, and release payments
                without leaving the console.{" "}
              </p>{" "}
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                {" "}
                <li className="flex items-start gap-3">
                  {" "}
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-aurum-400" />{" "}
                  <span>
                    {" "}
                    Live signals from EchoLedger², EchoStratus Ai³, and
                    EchoSentinel with confidence telemetry.{" "}
                  </span>{" "}
                </li>{" "}
                <li className="flex items-start gap-3">
                  {" "}
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-aurum-400" />{" "}
                  <span>
                    {" "}
                    Action blueprints aligned to LUCCCA guardrails—ACH releases,
                    variance narratives, and snapshot orchestration.{" "}
                  </span>{" "}
                </li>{" "}
                <li className="flex items-start gap-3">
                  {" "}
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-aurum-400" />{" "}
                  <span>
                    {" "}
                    Confidence streaming with guardian provenance so every
                    directive is SOC 2 ready.{" "}
                  </span>{" "}
                </li>{" "}
              </ul>{" "}
            </div>{" "}
            <EchoAiDock />{" "}
          </div>{" "}
        </section>{" "}
        <section
          id="streams"
          aria-label="Platform streams"
          className="mx-auto max-w-6xl scroll-mt-32 px-6 pb-20 sm:px-10"
        >
          {" "}
          <div className="grid gap-6 lg:grid-cols-3">
            {" "}
            {platformStreams.map((stream) => (
              <div
                key={stream.title}
                className="flex flex-col justify-between rounded-3xl border border-border/40 bg-gradient-to-br from-[#10182b] via-[#0b131f] to-[#05080f] p-8 text-slate-200 shadow-lg shadow-black/20 dark:text-muted-foreground"
              >
                {" "}
                <div>
                  {" "}
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-100 dark:text-muted-foreground">
                    {" "}
                    {stream.title}{" "}
                  </p>{" "}
                  <p className="mt-4 text-base text-slate-200/90 dark:text-muted-foreground">
                    {" "}
                    {stream.description}{" "}
                  </p>{" "}
                </div>{" "}
                <div className="mt-6 flex flex-wrap gap-2">
                  {" "}
                  {stream.highlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="rounded-full border border-white/10 bg-background px-3 py-1 text-xs font-semibold text-aurum-200"
                    >
                      {" "}
                      {highlight}{" "}
                    </span>
                  ))}{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </section>{" "}
        <section
          id="integrations"
          className="mx-auto max-w-6xl scroll-mt-32 px-6 pb-20 sm:px-10"
        >
          {" "}
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            {" "}
            <div>
              {" "}
              <span className="inline-flex items-center gap-2 rounded-full border border-aurum-300/50 bg-aurum-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-aurum-100">
                {" "}
                Mesh ready{" "}
              </span>{" "}
              <h2 className="mt-5 text-3xl font-semibold text-foreground sm:text-4xl">
                {" "}
                Integrated across LUCCCA and every hospitality system you
                own.{" "}
              </h2>{" "}
              <p className="mt-4 text-base text-muted-foreground">
                {" "}
                From PMS and POS to treasury and CPA suites, EchoAurum keeps
                data fidelity intact while Argus and Zelda guard every
                transaction.{" "}
              </p>{" "}
              <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold text-muted-foreground">
                {" "}
                <span className="rounded-full border border-border/50 bg-surface-variant px-3 py-1">
                  {" "}
                  Kafka / Redpanda EventStore{" "}
                </span>{" "}
                <span className="rounded-full border border-border/50 bg-surface-variant px-3 py-1">
                  {" "}
                  HashiCorp Vault Secrets{" "}
                </span>{" "}
                <span className="rounded-full border border-border/50 bg-surface-variant px-3 py-1">
                  {" "}
                  Linkerd Service Mesh{" "}
                </span>{" "}
              </div>{" "}
            </div>{" "}
            <div className="overflow-hidden rounded-3xl border border-border/40 bg-surface/80 shadow-[0_30px_80px_-50px_rgba(5,8,15,0.9)]">
              {" "}
              <table className="min-w-full divide-y divide-border/40 text-left text-sm">
                {" "}
                <thead className="bg-surface-variant/60 text-xs uppercase tracking-[0.28em] text-muted-foreground">
                  {" "}
                  <tr>
                    {" "}
                    <th className="px-6 py-4">Layer</th>{" "}
                    <th className="px-6 py-4">Partners</th>{" "}
                    <th className="px-6 py-4">Flow</th>{" "}
                  </tr>{" "}
                </thead>{" "}
                <tbody className="divide-y divide-border/40 text-muted-foreground">
                  {" "}
                  {integrations.map((integration) => (
                    <tr
                      key={integration.cluster}
                      className="hover:bg-aurum-500/5"
                    >
                      {" "}
                      <td className="px-6 py-4 text-foreground">
                        {" "}
                        {integration.cluster}{" "}
                      </td>{" "}
                      <td className="px-6 py-4">{integration.partners}</td>{" "}
                      <td className="px-6 py-4 text-muted-foreground/80">
                        {" "}
                        {integration.flow}{" "}
                      </td>{" "}
                    </tr>
                  ))}{" "}
                </tbody>{" "}
              </table>{" "}
            </div>{" "}
          </div>{" "}
        </section>{" "}
        <section
          id="roadmap"
          className="mx-auto max-w-6xl scroll-mt-32 px-6 pb-20 sm:px-10"
        >
          {" "}
          <div className="rounded-3xl border border-border/40 bg-gradient-to-br from-[#121a2e] via-[#0a101c] to-[#05080f] p-10 text-slate-200 shadow-[0_30px_90px_-45px_rgba(7,11,20,0.9)] dark:text-muted-foreground">
            {" "}
            <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
              {" "}
              <div>
                {" "}
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-aurum-200">
                  {" "}
                  <ShieldCheck className="h-4 w-4" /> Evolution roadmap{" "}
                </span>{" "}
                <h2 className="mt-4 text-3xl font-semibold text-foreground">
                  {" "}
                  From foundation to intelligence in 180 days.{" "}
                </h2>{" "}
                <p className="mt-4 text-sm text-slate-200/90 dark:text-muted-foreground">
                  {" "}
                  Orchestrated phases accelerate value: establish immutable
                  ledgers, then elevate to Ai³-powered forecasting and fraud
                  mitigation.{" "}
                </p>{" "}
              </div>{" "}
              <div className="grid gap-6">
                {" "}
                {roadmap.map((phase) => (
                  <div
                    key={phase.title}
                    className="rounded-2xl border border-white/10 bg-background p-6 text-sm text-slate-200 dark:text-muted-foreground"
                  >
                    {" "}
                    <p className="text-base font-semibold text-white dark:text-foreground">
                      {" "}
                      {phase.title}{" "}
                    </p>{" "}
                    <ul className="mt-4 space-y-3">
                      {" "}
                      {phase.items.map((item) => (
                        <li key={item} className="flex items-start gap-3">
                          {" "}
                          <span className="mt-1 h-2 w-2 rounded-full bg-aurum-300" />{" "}
                          <span>{item}</span>{" "}
                        </li>
                      ))}{" "}
                    </ul>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </section>{" "}
        <section
          id="security"
          className="mx-auto max-w-6xl scroll-mt-32 px-6 pb-24 sm:px-10"
        >
          {" "}
          <div className="grid gap-8 lg:grid-cols-3">
            {" "}
            {securityHighlights.map((highlight) => (
              <div
                key={highlight.title}
                className="rounded-3xl border border-border/40 bg-surface/80 p-8 shadow-lg shadow-black/10"
              >
                {" "}
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {" "}
                  {highlight.title}{" "}
                </p>{" "}
                <p className="mt-4 text-sm text-muted-foreground">
                  {" "}
                  {highlight.detail}{" "}
                </p>{" "}
              </div>
            ))}{" "}
          </div>{" "}
          <div className="mt-12 flex flex-col items-center justify-between gap-6 rounded-3xl border border-aurum-400/40 bg-aurum-500/10 px-6 py-10 text-center sm:px-12 lg:flex-row lg:text-left">
            {" "}
            <div>
              {" "}
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-aurum-200">
                {" "}
                Ready to unify LUCCCA finance?{" "}
              </p>{" "}
              <h3 className="mt-3 text-2xl font-semibold text-foreground">
                {" "}
                Deploy EchoAurum across your entities with 0.000005 precision
                today.{" "}
              </h3>{" "}
            </div>{" "}
            <div className="flex flex-col gap-3 sm:flex-row">
              {" "}
              <Button
                size="lg"
                className="bg-foreground text-background"
                asChild
              >
                {" "}
                <Link to="/console" className="flex items-center gap-2">
                  {" "}
                  View running console <ArrowRight className="h-4 w-4" />{" "}
                </Link>{" "}
              </Button>{" "}
              <Button
                variant="ghost"
                size="lg"
                className="border border-border/60 bg-surface-variant/40"
                asChild
              >
                {" "}
                <a
                  href="https://builder.io/c/docs/projects"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2"
                >
                  {" "}
                  Builder.io integration docs{" "}
                </a>{" "}
              </Button>{" "}
            </div>{" "}
          </div>{" "}
        </section>{" "}
      </div>{" "}
    </PageLayout>
  );
}
