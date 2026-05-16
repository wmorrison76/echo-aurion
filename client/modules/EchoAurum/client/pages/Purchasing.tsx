import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Loader2,
  PackageCheck,
  Shield,
  Warehouse,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { SessionRequiredNotice } from "../modules/auth";
import {
  OrderAgingPanel,
  OrderStatusBoard,
  PurchaseOrderTable,
  ReceivingTimeline,
  SummaryCards,
  VarianceList,
  VendorSpendChart,
  usePurchasingDashboard,
} from "../modules/purchRec";
const HERO_FEATURES = [
  {
    icon: PackageCheck,
    title: "Unified purchasing",
    description:
      "Create, approve, and route purchase orders with LUCCCA policy guardrails baked into every step.",
  },
  {
    icon: Warehouse,
    title: "Real-time receiving",
    description:
      "Dock timelines stream into the console so culinary and finance teams see status without paging receiving.",
  },
  {
    icon: Shield,
    title: "Variance guardians",
    description:
      "Zelda and Argus monitor shortages, temperature breaches, and compliance evidence automatically.",
  },
  {
    icon: ClipboardList,
    title: "Invoice-ready",
    description:
      "Receiving closes the loop with Accounts Payable so matched invoices release without manual reconciliation.",
  },
];
export default function Purchasing() {
  const { status, data, message } = usePurchasingDashboard();
  const heroSection = (
    <header className="rounded-3xl border border-border/40 bg-surface/90 p-10 shadow-[0_40px_120px_-60px_rgba(6,10,20,0.8)]">
      {" "}
      <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        {" "}
        <div>
          {" "}
          <span className="inline-flex items-center gap-2 rounded-full border border-aurum-300/40 bg-aurum-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-aurum-200">
            {" "}
            LUCCCA purchasing & receiving{" "}
          </span>{" "}
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {" "}
            Invoice and inventory control built into the LUCCCA console.{" "}
          </h1>{" "}
          <p className="mt-5 text-base text-muted-foreground sm:text-lg">
            {" "}
            Purchasing, receiving, and accounts payable operate on the same
            event-sourced backbone. Buyers gain vendor visibility, docks stay
            orchestrated, and invoices land reconciled without waiting on email
            threads.{" "}
          </p>{" "}
          <div className="mt-8 flex flex-wrap gap-4">
            {" "}
            <Button
              asChild
              size="lg"
              className="bg-aurum-500 text-surface-900 shadow-lg shadow-aurum-600/40 hover:bg-aurum-400"
            >
              {" "}
              <Link to="/console">
                {" "}
                View finance console{" "}
                <ArrowRight className="ml-2 h-4 w-4" />{" "}
              </Link>{" "}
            </Button>{" "}
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="border border-border/60 bg-surface-variant/40"
            >
              {" "}
              <a
                href="mailto:aurum@luccca.cloud"
                className="flex items-center gap-2"
              >
                {" "}
                Coordinate rollout <ArrowRight className="h-4 w-4" />{" "}
              </a>{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
        <div className="grid gap-4 sm:grid-cols-2">
          {" "}
          {HERO_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-border/40 bg-surface-variant/70 p-5"
            >
              {" "}
              <feature.icon className="h-6 w-6 text-aurum-200" />{" "}
              <p className="mt-4 text-sm font-semibold text-foreground">
                {feature.title}
              </p>{" "}
              <p className="mt-2 text-xs text-muted-foreground">
                {feature.description}
              </p>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </div>{" "}
    </header>
  );
  let bodySection: ReactNode;
  if (status === "loading") {
    bodySection = (
      <StatusPanel
        icon={<Loader2 className="h-5 w-5 animate-spin text-aurum-100" />}
        title="Loading purchasing telemetry"
        description="Streaming purchase orders, receiving events, and variance signals."
      />
    );
  } else if (status === "unauthenticated") {
    bodySection = (
      <SessionRequiredNotice
        className="max-w-2xl"
        description="Authenticate with a controller persona to orchestrate purchase order workflows and receiving operations."
      />
    );
  } else if (status === "error") {
    bodySection = (
      <StatusPanel
        icon={<AlertTriangle className="h-5 w-5 text-red-300" />}
        title="Purchasing dashboard unavailable"
        description={message ?? "Unable to load purchasing dashboard."}
        tone="error"
      />
    );
  } else if (data) {
    const {
      snapshot,
      orders,
      grouped,
      aging,
      timeline,
      variances,
      vendorSpend,
      vendorSummary,
    } = data;
    bodySection = (
      <>
        {" "}
        <SummaryCards snapshot={snapshot} />{" "}
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {" "}
          <OrderStatusBoard grouped={grouped} />{" "}
          <OrderAgingPanel aging={aging} />{" "}
        </div>{" "}
        <PurchaseOrderTable orders={orders} />{" "}
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {" "}
          <ReceivingTimeline events={timeline} />{" "}
          <VarianceList variances={variances} />{" "}
        </div>{" "}
        <VendorSpendChart vendors={vendorSpend} summary={vendorSummary} />{" "}
      </>
    );
  } else {
    bodySection = (
      <StatusPanel
        icon={<AlertTriangle className="h-5 w-5 text-red-300" />}
        title="Purchasing dashboard unavailable"
        description="Dashboard data was not returned."
        tone="error"
      />
    );
  }
  return (
    <PageLayout>
      {" "}
      <div className="relative mx-auto max-w-6xl overflow-hidden px-6 pb-24 pt-24 sm:px-10">
        {" "}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,_rgba(236,211,133,0.18)_0%,_rgba(12,18,35,0)_65%)]" />{" "}
        <div className="relative space-y-16">
          {" "}
          {heroSection} {bodySection}{" "}
        </div>{" "}
      </div>{" "}
    </PageLayout>
  );
}
function StatusPanel({
  icon,
  title,
  description,
  tone = "default",
}: {
  icon: ReactNode;
  title: string;
  description: string;
  tone?: "default" | "error";
}) {
  const toneClasses =
    tone === "error"
      ? "border-red-500/40 bg-red-500/10 text-red-100"
      : "border-aurum-400/40 bg-aurum-500/10 text-aurum-50";
  return (
    <div
      className={cn(
        "rounded-3xl border p-8 shadow-[0_24px_80px_-60px_rgba(6,10,20,0.8)]",
        toneClasses,
      )}
    >
      {" "}
      <div className="flex items-start gap-4">
        {" "}
        {icon}{" "}
        <div>
          {" "}
          <p className="text-base font-semibold">{title}</p>{" "}
          <p className="mt-2 text-sm opacity-80">{description}</p>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
