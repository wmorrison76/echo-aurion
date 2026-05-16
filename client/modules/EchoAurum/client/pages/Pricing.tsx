import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
const pricingTiers = [
  {
    name: "Starter",
    price: "$3,000",
    period: "/month",
    description: "Perfect for growing hospitality operators with 1-5 locations",
    features: [
      "Up to 5 locations",
      "Basic GL & AP workflows",
      "Echo Ai¹ Assist (recommendations only)",
      "Monthly close automation (40%)",
      "Standard reporting suite",
      "Email support",
      "30-day data retention",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$7,500",
    period: "/month",
    description: "For established chains with 5-25 locations",
    features: [
      "Up to 25 locations",
      "Advanced GL & AP automation (70%)",
      "Echo Ai³ with Guardian oversight",
      "Weekly close completion (2-3 days)",
      "Variance analytics & forecasting",
      "Fraud detection & prevention",
      "Priority support (24/5)",
      "1-year data retention",
      "Custom integrations (OPERA, Toast, SAP)",
    ],
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "pricing",
    description: "For large multi-unit operators and enterprise consolidators",
    features: [
      "Unlimited locations",
      "Full automation (90-100%)",
      "Echo Ai³ with custom training",
      "Same-day close automation",
      "Multi-entity consolidation",
      "SOX 404 compliance suite",
      "24/7 dedicated support",
      "Unlimited data retention",
      "Custom Guardian rules",
      "Forensic accounting logs",
      "White-label capabilities",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];
const addons = [
  {
    name: "Advanced Forecasting",
    description: "Scenario modeling with PredictHQ weather integration",
    price: "$1,500",
  },
  {
    name: "CPA Portal",
    description: "Automated audit evidence collection and export",
    price: "$2,000",
  },
  {
    name: "Custom Integrations",
    description: "Integration with systems beyond standard connectors",
    price: "$3,000+",
  },
  {
    name: "Dedicated Infrastructure",
    description: "Private cloud deployment with SLA guarantees",
    price: "$5,000+",
  },
];
export default function Pricing() {
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
            Transparent, Scalable Pricing{" "}
          </h1>{" "}
          <p className="max-w-2xl text-lg text-muted-foreground">
            {" "}
            Pay for what you use. No hidden fees. Scale from startup to
            enterprise with flexible pricing options.{" "}
          </p>{" "}
        </div>{" "}
        {/* Pricing Tiers */}{" "}
        <section className="mb-20 space-y-8">
          {" "}
          <div className="grid gap-8 md:grid-cols-3 lg:gap-6">
            {" "}
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-lg border p-8 space-y-6 transition-all ${tier.highlighted ? "border-aurum-400/60 bg-aurum-500/15 shadow-lg shadow-aurum-500/20 md:scale-105" : "border-border/40 bg-surface/60"}`}
              >
                {" "}
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    {" "}
                    <span className="rounded-full bg-aurum-500/20 border border-aurum-400/50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-aurum-300">
                      {" "}
                      Most Popular{" "}
                    </span>{" "}
                  </div>
                )}{" "}
                <div className="space-y-2">
                  {" "}
                  <h3 className="text-2xl font-semibold text-foreground">
                    {" "}
                    {tier.name}{" "}
                  </h3>{" "}
                  <p className="text-sm text-muted-foreground">
                    {" "}
                    {tier.description}{" "}
                  </p>{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <div className="flex items-baseline gap-2">
                    {" "}
                    <span className="text-4xl font-bold text-aurum-300">
                      {" "}
                      {tier.price}{" "}
                    </span>{" "}
                    <span className="text-sm text-muted-foreground">
                      {" "}
                      {tier.period}{" "}
                    </span>{" "}
                  </div>{" "}
                </div>{" "}
                <Button
                  size="lg"
                  className={
                    tier.highlighted
                      ? "w-full bg-aurum-500 text-surface-900 hover:bg-aurum-400"
                      : "w-full"
                  }
                  variant={tier.highlighted ? "default" : "outline"}
                  asChild
                >
                  {" "}
                  <Link to="/dashboard">{tier.cta}</Link>{" "}
                </Button>{" "}
                <ul className="space-y-3 border-t border-border/40 pt-6">
                  {" "}
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm"
                    >
                      {" "}
                      <Check className="h-5 w-5 text-aurum-400 flex-shrink-0 mt-0.5" />{" "}
                      <span className="text-muted-foreground">
                        {feature}
                      </span>{" "}
                    </li>
                  ))}{" "}
                </ul>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </section>{" "}
        {/* Add-ons */}{" "}
        <section className="mb-20 space-y-8">
          {" "}
          <div>
            {" "}
            <h2 className="text-2xl font-semibold text-foreground">
              {" "}
              Add-ons & Extensions{" "}
            </h2>{" "}
            <p className="mt-2 text-muted-foreground">
              {" "}
              Customize your plan with powerful add-ons.{" "}
            </p>{" "}
          </div>{" "}
          <div className="grid gap-4 md:grid-cols-2">
            {" "}
            {addons.map((addon) => (
              <div
                key={addon.name}
                className="rounded-lg border border-border/40 bg-surface/60 p-6 flex items-center justify-between"
              >
                {" "}
                <div>
                  {" "}
                  <h4 className="font-semibold text-foreground">
                    {" "}
                    {addon.name}{" "}
                  </h4>{" "}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {" "}
                    {addon.description}{" "}
                  </p>{" "}
                </div>{" "}
                <div className="text-right flex-shrink-0 ml-4">
                  {" "}
                  <p className="font-semibold text-aurum-300">
                    {addon.price}
                  </p>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </section>{" "}
        {/* FAQ */}{" "}
        <section className="mb-20 space-y-8">
          {" "}
          <h2 className="text-2xl font-semibold text-foreground">
            {" "}
            Frequently Asked Questions{" "}
          </h2>{" "}
          <div className="space-y-4">
            {" "}
            {[
              {
                q: "Is there a setup fee?",
                a: "Professional and Enterprise plans include onboarding at no extra cost. Starter includes email support setup.",
              },
              {
                q: "Can I change plans anytime?",
                a: "Yes, upgrade or downgrade at any time. Changes take effect on your next billing cycle.",
              },
              {
                q: "What's included in support?",
                a: "Starter: Email support. Professional: 24/5 priority support. Enterprise: 24/7 dedicated success manager.",
              },
              {
                q: "Do you offer discounts for annual contracts?",
                a: "Yes! Annual plans receive 15% discount. Contact sales for custom arrangements.",
              },
            ].map((faq) => (
              <div
                key={faq.q}
                className="rounded-lg border border-border/40 bg-surface/60 p-6 space-y-3"
              >
                {" "}
                <p className="font-semibold text-foreground">{faq.q}</p>{" "}
                <p className="text-sm text-muted-foreground">{faq.a}</p>{" "}
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
              Ready to get started?{" "}
            </h3>{" "}
            <p className="mt-2 text-muted-foreground">
              {" "}
              Choose a plan and start automating your financial operations
              today.{" "}
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
                Get Started <ArrowRight className="h-4 w-4" />{" "}
              </Link>{" "}
            </Button>{" "}
            <Button variant="outline" size="lg" asChild>
              {" "}
              <a href="mailto:sales@echoaurum.io">Contact Sales</a>{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </PageLayout>
  );
}
