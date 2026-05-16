import { ArrowRight, BookOpen, Code, LifeBuoy, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
const docSections = [
  {
    title: "Getting Started",
    icon: BookOpen,
    description: "Learn the basics and get up and running in minutes",
    items: [
      { name: "Platform Overview", href: "/overview" },
      { name: "First Steps", href: "/dashboard" },
      { name: "Account Setup", href: "/profile" },
      { name: "User Roles", href: "/admin" },
    ],
  },
  {
    title: "Features & Modules",
    icon: Zap,
    description: "Deep dives into core features and how to use them",
    items: [
      { name: "GL Operations", href: "/gl" },
      { name: "AP & Invoice Workflows", href: "/ap" },
      { name: "Audit Intelligence", href: "/audit" },
      { name: "Reporting & Analytics", href: "/reports" },
    ],
  },
  {
    title: "API Reference",
    icon: Code,
    description: "Complete API documentation for developers",
    items: [
      { name: "Authentication", href: "/docs#auth-section" },
      { name: "GL Endpoints", href: "/docs#api-gl" },
      { name: "AP Endpoints", href: "/docs#api-ap" },
      { name: "Webhook Events", href: "/docs#webhooks" },
    ],
  },
  {
    title: "Help & Support",
    icon: LifeBuoy,
    description: "Troubleshooting guides and support resources",
    items: [
      { name: "Common Issues", href: "/docs#troubleshooting" },
      { name: "FAQ", href: "/docs#faq" },
      { name: "Contact Support", href: "mailto:support@echoaurum.io" },
      { name: "Status Page", href: "https://status.echoaurum.io" },
    ],
  },
];
const guides = [
  {
    title: "GL Journal Entry Workflow",
    description: "Step-by-step guide to posting journal entries with AI assist",
    category: "GL Operations",
    href: "/gl",
  },
  {
    title: "Invoice Processing Pipeline",
    description: "OCR ingestion, matching, and approval workflows",
    category: "AP Workflows",
    href: "/ap",
  },
  {
    title: "Month-End Close Automation",
    description: "Automate your month-end close with Echo Ai³",
    category: "Operations",
    href: "/reports",
  },
  {
    title: "Guardian Oversight Configuration",
    description: "Set up fraud detection and audit controls per GL account",
    category: "Security",
    href: "/security",
  },
  {
    title: "Multi-Entity Consolidation",
    description: "Consolidate financials across multiple entities in seconds",
    category: "Reporting",
    href: "/reports",
  },
  {
    title: "Custom Integrations",
    description: "Connect your ERP, PMS, and POS systems via API",
    category: "Integrations",
    href: "/console",
  },
];
export default function Docs() {
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
            Documentation{" "}
          </h1>{" "}
          <p className="max-w-2xl text-lg text-muted-foreground">
            {" "}
            Complete guides, API documentation, and tutorials to help you master
            EchoAurum.{" "}
          </p>{" "}
          <div className="flex items-center gap-3 pt-4">
            {" "}
            <input
              type="text"
              placeholder="Search documentation..."
              className="flex-1 rounded-lg border border-border/40 bg-surface/60 px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-aurum-500/50"
            />{" "}
            <Button size="icon" variant="outline">
              {" "}
              <span>→</span>{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
        {/* Doc Sections */}{" "}
        <section className="mb-20 space-y-8">
          {" "}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {" "}
            {docSections.map((section) => {
              const Icon = section.icon;
              return (
                <div
                  key={section.title}
                  className="rounded-lg border border-border/40 bg-surface/60 p-6 space-y-4"
                >
                  {" "}
                  <Icon className="h-8 w-8 text-aurum-400" />{" "}
                  <div>
                    {" "}
                    <h3 className="font-semibold text-foreground">
                      {" "}
                      {section.title}{" "}
                    </h3>{" "}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {" "}
                      {section.description}{" "}
                    </p>{" "}
                  </div>{" "}
                  <ul className="space-y-2 border-t border-border/40 pt-4">
                    {" "}
                    {section.items.map((item) => (
                      <li key={item.name}>
                        {" "}
                        <Link
                          to={item.href}
                          className="text-sm text-aurum-300 hover:text-aurum-200 transition-colors"
                        >
                          {" "}
                          {item.name} →{" "}
                        </Link>{" "}
                      </li>
                    ))}{" "}
                  </ul>{" "}
                </div>
              );
            })}{" "}
          </div>{" "}
        </section>{" "}
        {/* Popular Guides */}{" "}
        <section className="mb-20 space-y-8">
          {" "}
          <div>
            {" "}
            <h2 className="text-2xl font-semibold text-foreground">
              {" "}
              Popular Guides{" "}
            </h2>{" "}
            <p className="mt-2 text-muted-foreground">
              {" "}
              Step-by-step instructions for common workflows{" "}
            </p>{" "}
          </div>{" "}
          <div className="grid gap-4 md:grid-cols-2">
            {" "}
            {guides.map((guide) => (
              <Link
                key={guide.title}
                to={guide.href}
                className="group rounded-lg border border-border/40 bg-surface/60 p-6 transition hover:border-aurum-400/40 hover:bg-surface-variant/60"
              >
                {" "}
                <div className="flex items-start justify-between">
                  {" "}
                  <div className="flex-1">
                    {" "}
                    <h4 className="font-semibold text-foreground group-hover:text-aurum-300 transition">
                      {" "}
                      {guide.title}{" "}
                    </h4>{" "}
                    <p className="mt-2 text-sm text-muted-foreground">
                      {" "}
                      {guide.description}{" "}
                    </p>{" "}
                  </div>{" "}
                  <span className="ml-4 text-aurum-400">→</span>{" "}
                </div>{" "}
                <div className="mt-4 pt-4 border-t border-border/40">
                  {" "}
                  <span className="text-xs rounded-full bg-aurum-500/10 border border-aurum-400/30 px-2 py-1 text-aurum-200">
                    {" "}
                    {guide.category}{" "}
                  </span>{" "}
                </div>{" "}
              </Link>
            ))}{" "}
          </div>{" "}
        </section>{" "}
        {/* Code Samples */}{" "}
        <section className="mb-20 space-y-8">
          {" "}
          <div>
            {" "}
            <h2 className="text-2xl font-semibold text-foreground">
              {" "}
              Code Examples{" "}
            </h2>{" "}
            <p className="mt-2 text-muted-foreground">
              {" "}
              Ready-to-use code snippets for common integrations{" "}
            </p>{" "}
          </div>{" "}
          <div className="space-y-4">
            {" "}
            {[
              { title: "Post a Journal Entry", lang: "JavaScript" },
              { title: "Process an Invoice", lang: "Python" },
              { title: "Query GL Balance", lang: "cURL" },
            ].map((example) => (
              <div
                key={example.title}
                className="rounded-lg border border-border/40 bg-surface/60 p-6"
              >
                {" "}
                <div className="flex items-center justify-between">
                  {" "}
                  <div>
                    {" "}
                    <h4 className="font-semibold text-foreground">
                      {" "}
                      {example.title}{" "}
                    </h4>{" "}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {" "}
                      {example.lang}{" "}
                    </p>{" "}
                  </div>{" "}
                  <Button variant="ghost" size="sm">
                    {" "}
                    View Code{" "}
                  </Button>{" "}
                </div>{" "}
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
              Can't find what you're looking for?{" "}
            </h3>{" "}
            <p className="mt-2 text-muted-foreground">
              {" "}
              Our support team is here to help. Get answers to your
              questions.{" "}
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
              <a
                href="mailto:support@echoaurum.io"
                className="flex items-center gap-2"
              >
                {" "}
                Contact Support <ArrowRight className="h-4 w-4" />{" "}
              </a>{" "}
            </Button>{" "}
            <Button variant="outline" size="lg" asChild>
              {" "}
              <Link to="/dashboard">Back to Dashboard</Link>{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </PageLayout>
  );
}
