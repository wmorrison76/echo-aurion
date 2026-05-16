import { ArrowRight, Lock, Shield, Zap, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
const securityPillars = [
  {
    title: "Guardian Mesh",
    description:
      "Zelda cold snapshots, Argus immutable audit, Phoenix time-travel, and Odin threat analytics woven through every pod.",
    icon: Shield,
  },
  {
    title: "Zero-Trust Vault",
    description:
      "HashiCorp Vault-managed secrets, PQC-ready key rotation, and per-tenant RLS enforcing finance isolation.",
    icon: Lock,
  },
  {
    title: "Audit Trail Integrity",
    description:
      "Immutable hash-chain verified forensic accounting log. Every human and AI action logged with cryptographic proofs.",
    icon: AlertTriangle,
  },
  {
    title: "Compliance Ready",
    description:
      "SOC 2 Type II, SOX 404 controls, and GAAP audit evidence collection. Automatic compliance reporting.",
    icon: Zap,
  },
];
const controls = [
  {
    category: "SOX 404 Controls",
    items: [
      "GL Journal Entry Authorization & Posting",
      "AP Invoice Processing & Approval",
      "Bank Reconciliation",
      "Intercompany Eliminations",
      "Month-End Close",
    ],
  },
  {
    category: "Fraud Detection",
    items: [
      "Duplicate invoice detection",
      "Unusual payment patterns",
      "Vendor risk scoring",
      "Segregation of duties enforcement",
      "Exception flagging",
    ],
  },
  {
    category: "Data Security",
    items: [
      "Encryption at rest (AES-256)",
      "Encryption in transit (TLS 1.3)",
      "Field-level access controls",
      "Audit logging per transaction",
      "Time-based key rotation",
    ],
  },
];
export default function Security() {
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
            Security & Compliance{" "}
          </h1>{" "}
          <p className="max-w-2xl text-lg text-muted-foreground">
            {" "}
            Enterprise-grade security built for financial institutions. Guardian
            mesh oversight, immutable audit trails, and comprehensive compliance
            controls.{" "}
          </p>{" "}
        </div>{" "}
        {/* Security Pillars */}{" "}
        <section className="mb-20 space-y-8">
          {" "}
          <h2 className="text-2xl font-semibold text-foreground">
            {" "}
            Security Pillars{" "}
          </h2>{" "}
          <div className="grid gap-6 md:grid-cols-2">
            {" "}
            {securityPillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="rounded-lg border border-border/40 bg-surface/60 p-6 space-y-4"
                >
                  {" "}
                  <div className="flex items-start gap-4">
                    {" "}
                    <Icon className="h-8 w-8 text-aurum-400 flex-shrink-0 mt-1" />{" "}
                    <div className="flex-1">
                      {" "}
                      <h3 className="text-lg font-semibold text-foreground">
                        {" "}
                        {pillar.title}{" "}
                      </h3>{" "}
                      <p className="mt-2 text-sm text-muted-foreground">
                        {" "}
                        {pillar.description}{" "}
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>
              );
            })}{" "}
          </div>{" "}
        </section>{" "}
        {/* Controls Matrix */}{" "}
        <section className="mb-20 space-y-8">
          {" "}
          <h2 className="text-2xl font-semibold text-foreground">
            {" "}
            Control Framework{" "}
          </h2>{" "}
          <div className="grid gap-6 md:grid-cols-3">
            {" "}
            {controls.map((control) => (
              <div
                key={control.category}
                className="rounded-lg border border-border/40 bg-surface/60 p-6 space-y-4"
              >
                {" "}
                <h3 className="text-lg font-semibold text-foreground">
                  {" "}
                  {control.category}{" "}
                </h3>{" "}
                <ul className="space-y-3">
                  {" "}
                  {control.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      {" "}
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-aurum-400 flex-shrink-0" />{" "}
                      <span className="text-muted-foreground">{item}</span>{" "}
                    </li>
                  ))}{" "}
                </ul>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </section>{" "}
        {/* Compliance Status */}{" "}
        <section className="mb-20 space-y-6">
          {" "}
          <h2 className="text-2xl font-semibold text-foreground">
            {" "}
            Compliance Certifications{" "}
          </h2>{" "}
          <div className="grid gap-4 md:grid-cols-2">
            {" "}
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-6">
              {" "}
              <div className="flex items-center gap-3">
                {" "}
                <div className="h-3 w-3 rounded-full bg-emerald-500" />{" "}
                <h4 className="font-semibold text-emerald-200">
                  SOC 2 Type II
                </h4>{" "}
              </div>{" "}
              <p className="mt-2 text-sm text-emerald-100/80">
                {" "}
                Certified for security, availability, and integrity controls
                across all operations.{" "}
              </p>{" "}
            </div>{" "}
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-6">
              {" "}
              <div className="flex items-center gap-3">
                {" "}
                <div className="h-3 w-3 rounded-full bg-emerald-500" />{" "}
                <h4 className="font-semibold text-emerald-200">
                  SOX 404 Ready
                </h4>{" "}
              </div>{" "}
              <p className="mt-2 text-sm text-emerald-100/80">
                {" "}
                Built-in controls and audit evidence collection for
                Sarbanes-Oxley compliance.{" "}
              </p>{" "}
            </div>{" "}
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-6">
              {" "}
              <div className="flex items-center gap-3">
                {" "}
                <div className="h-3 w-3 rounded-full bg-emerald-500" />{" "}
                <h4 className="font-semibold text-emerald-200">
                  GAAP Compliant
                </h4>{" "}
              </div>{" "}
              <p className="mt-2 text-sm text-emerald-100/80">
                {" "}
                Dual-ledger (USALI + GAAP) with automatic alignment and
                consolidation.{" "}
              </p>{" "}
            </div>{" "}
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-6">
              {" "}
              <div className="flex items-center gap-3">
                {" "}
                <div className="h-3 w-3 rounded-full bg-emerald-500" />{" "}
                <h4 className="font-semibold text-emerald-200">
                  HIPAA Capable
                </h4>{" "}
              </div>{" "}
              <p className="mt-2 text-sm text-emerald-100/80">
                {" "}
                Field-level encryption and role-based access controls support
                HIPAA requirements.{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
        </section>{" "}
        {/* CTA */}{" "}
        <div className="rounded-lg border border-aurum-400/30 bg-aurum-500/10 p-8 space-y-6">
          {" "}
          <div>
            {" "}
            <h3 className="text-xl font-semibold text-foreground">
              {" "}
              Security-first platform for financial operations{" "}
            </h3>{" "}
            <p className="mt-2 text-muted-foreground">
              {" "}
              Explore how Guardian oversight and immutable audit trails protect
              your financial data.{" "}
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
                Access Secure Dashboard <ArrowRight className="h-4 w-4" />{" "}
              </Link>{" "}
            </Button>{" "}
            <Button variant="outline" size="lg" asChild>
              {" "}
              <Link to="/overview">View Platform</Link>{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </PageLayout>
  );
}
