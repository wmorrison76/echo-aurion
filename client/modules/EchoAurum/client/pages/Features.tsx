import { ArrowRight, BarChart3, Lock, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
const features = [
  {
    id: "ai-automation",
    name: "Echo Ai³ Automation",
    description:
      "Configurable 0-100% automation per feature with per-account overrides. Operator learning and commit-to-memory rules.",
    icon: Zap,
    modules: ["GL Operations", "AP Workflows", "Approval Management"],
  },
  {
    id: "guardian-suite",
    name: "Guardian Oversight Suite",
    description:
      "Zelda snapshots, Argus audit trails, Phoenix fraud detection, and Odin threat analytics woven through every transaction.",
    icon: Lock,
    modules: ["Fraud Detection", "Audit Trail", "Risk Management"],
  },
  {
    id: "financial-analytics",
    name: "Financial Analytics",
    description:
      "Real-time variance insights, forecasting, cash ladder optimization, and profitability analysis with AI narratives.",
    icon: BarChart3,
    modules: ["Reporting", "Forecasting", "Cash Management"],
  },
];
const optionsList = [
  {
    title: "Option A: Full 12-Week Execution",
    budget: "$200K",
    timeline: "3 months",
    description:
      "Complete feature parity with NetSuite/Xero for small chains. Market dominance in 90 days.",
    features: [
      "Full GL & AP end-to-end workflows",
      "Echo Ai³ complete automation suite (0-100%)",
      "All 4 Guardian features (Zelda, Argus, Phoenix, Odin)",
      "Forecasting with PredictHQ integration",
      "Multi-entity consolidation",
      "SOX 404 compliance framework",
      "CPA Portal with audit export",
      "Production-grade security & monitoring",
      "24/5 priority support included",
      "White-glove onboarding (5 locations)",
    ],
  },
  {
    title: "Option B: Slow Roll (Lower Risk)",
    budget: "$100K/month",
    timeline: "Ongoing (6+ months to full parity)",
    description:
      "Phased rollout with smaller team. Lower initial risk, longer time-to-market.",
    features: [
      "Core GL posting & reconciliation (Weeks 1-4)",
      "Basic AP invoice processing (Weeks 5-8)",
      "Echo Ai¹ Assist recommendations only",
      "Zelda snapshot oversight",
      "Essential variance reporting",
      "Month-end close automation (40-60%)",
      "Incremental Guardian rollout",
      "Email support during phases",
      "3-entity starter plan",
      "Quarterly feature releases",
    ],
  },
  {
    title: "Option C: Selective Build (Compromise)",
    budget: "$150K",
    timeline: "4 months (16 weeks)",
    description:
      "Market-ready in 4 months with extended timeline for less-critical features.",
    features: [
      "Priority GL & AP (Weeks 1-6)",
      "Guardian core suite (Weeks 7-12)",
      "Echo Ai³ with 70% automation ceiling",
      "Forecasting (essential scenarios only)",
      "Dual-ledger (USALI + GAAP)",
      "Essential fraud detection",
      "Basic CPA reporting",
      "SOC 2 compliance preparation",
      "Premium support (24/5)",
      "Advanced features deferred to Phase 2",
    ],
  },
];
export default function Features() {
  return (
    <PageLayout>
      {" "}
      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
        {" "}
        {/* Hero */}{" "}
        <div className="mb-16 space-y-6">
          {" "}
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {" "}
            Platform Features{" "}
          </h1>{" "}
          <p className="max-w-2xl text-lg text-muted-foreground">
            {" "}
            EchoAurum combines powerful AI automation with enterprise-grade
            guardian oversight to transform hospitality finance.{" "}
          </p>{" "}
        </div>{" "}
        {/* Core Features */}{" "}
        <section className="mb-20 space-y-8">
          {" "}
          <h2 className="text-2xl font-semibold text-foreground">
            {" "}
            Core Capabilities{" "}
          </h2>{" "}
          <div className="grid gap-8 md:grid-cols-3">
            {" "}
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.id}
                  className="rounded-lg border border-border/40 bg-surface/60 p-8 space-y-4"
                >
                  {" "}
                  <div className="flex items-start justify-between">
                    {" "}
                    <Icon className="h-8 w-8 text-aurum-400" />{" "}
                  </div>{" "}
                  <h3 className="text-xl font-semibold text-foreground">
                    {" "}
                    {feature.name}{" "}
                  </h3>{" "}
                  <p className="text-sm text-muted-foreground">
                    {" "}
                    {feature.description}{" "}
                  </p>{" "}
                  <div className="space-y-2 pt-4 border-t border-border/40">
                    {" "}
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {" "}
                      Modules{" "}
                    </p>{" "}
                    <div className="flex flex-wrap gap-2">
                      {" "}
                      {feature.modules.map((module) => (
                        <span
                          key={module}
                          className="text-xs rounded-full bg-aurum-500/10 border border-aurum-400/30 px-2 py-1 text-aurum-200"
                        >
                          {" "}
                          {module}{" "}
                        </span>
                      ))}{" "}
                    </div>{" "}
                  </div>{" "}
                </div>
              );
            })}{" "}
          </div>{" "}
        </section>{" "}
        {/* Implementation Options */}{" "}
        <section className="mb-20 space-y-8">
          {" "}
          <div className="space-y-4">
            {" "}
            <h2 className="text-2xl font-semibold text-foreground">
              {" "}
              Implementation Options{" "}
            </h2>{" "}
            <p className="text-muted-foreground">
              {" "}
              Choose the execution strategy that best fits your timeline and
              budget.{" "}
            </p>{" "}
          </div>{" "}
          <div className="grid gap-6 md:grid-cols-3">
            {" "}
            {optionsList.map((option) => (
              <div
                key={option.title}
                className="rounded-lg border border-border/40 bg-surface/60 p-8 space-y-6"
              >
                {" "}
                <div>
                  {" "}
                  <h3 className="text-lg font-semibold text-foreground">
                    {" "}
                    {option.title}{" "}
                  </h3>{" "}
                  <p className="mt-2 text-sm text-muted-foreground">
                    {" "}
                    {option.description}{" "}
                  </p>{" "}
                </div>{" "}
                <div className="space-y-3 pt-4 border-t border-border/40">
                  {" "}
                  <div>
                    {" "}
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {" "}
                      Budget{" "}
                    </p>{" "}
                    <p className="text-lg font-semibold text-aurum-300">
                      {" "}
                      {option.budget}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {" "}
                      Timeline{" "}
                    </p>{" "}
                    <p className="text-lg font-semibold text-aurum-300">
                      {" "}
                      {option.timeline}{" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
                <ul className="space-y-2">
                  {" "}
                  {option.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm">
                      {" "}
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-aurum-400 flex-shrink-0" />{" "}
                      <span className="text-muted-foreground">{feat}</span>{" "}
                    </li>
                  ))}{" "}
                </ul>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </section>{" "}
        {/* CTA */}{" "}
        <div className="rounded-lg border border-aurum-400/30 bg-aurum-500/10 p-8 space-y-6">
          {" "}
          <div>
            {" "}
            <h3 className="text-xl font-semibold text-foreground">
              {" "}
              Ready to transform your finance operations?{" "}
            </h3>{" "}
            <p className="mt-2 text-muted-foreground">
              {" "}
              Explore the platform and see how EchoAurum can automate your
              workflows.{" "}
            </p>{" "}
          </div>{" "}
          <div className="flex flex-wrap gap-4">
            {" "}
            <Button
              size="lg"
              className="bg-aurum-500 text-surface-900 hover:bg-aurum-400"
              asChild
            >
              {" "}
              <Link to="/dashboard" className="flex items-center gap-2">
                {" "}
                Go to Dashboard <ArrowRight className="h-4 w-4" />{" "}
              </Link>{" "}
            </Button>{" "}
            <Button variant="outline" size="lg" asChild>
              {" "}
              <Link to="/overview">View Platform Overview</Link>{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </PageLayout>
  );
}
