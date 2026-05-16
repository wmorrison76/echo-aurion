import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  BrainCircuit,
  Code2,
  CheckCheck,
  GitMerge,
  BookOpenText,
  Gauge,
} from "lucide-react";

const features = [
  {
    title: "Planner",
    desc: "Turns a spec into a step-by-step plan with files, tools, and risks.",
    Icon: BrainCircuit,
  },
  { title: "Coder", desc: "Generates/edits code via templates + AST transforms.", Icon: Code2 },
  { title: "Reviewer", desc: "Runs lint, type, tests, a11y, perf, and security checks.", Icon: CheckCheck },
  { title: "Integrator", desc: "Wires routes, exports, RBAC, telemetry, and budgets.", Icon: GitMerge },
  { title: "Historian", desc: "Logs decisions, diffs, metrics; makes edits context-aware.", Icon: BookOpenText },
  { title: "Scorecard", desc: "Chooses the best plan by Fit, Perf, A11y, Security, and more.", Icon: Gauge },
];

export default function Index() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-50 [background:radial-gradient(1200px_600px_at_50%_-20%,hsl(var(--primary)/0.25),transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,transparent,transparent_31px,hsl(var(--border))_32px),linear-gradient(to_bottom,transparent,transparent_31px,hsl(var(--border))_32px)] [background-size:32px_32px]" />
        <div className="container relative py-20 md:py-28">
          <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground bg-background/60">
            Echo Ai Hospitality Suite
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
          </p>
          <h1 className="mt-6 max-w-4xl text-4xl font-extrabold tracking-tight md:text-6xl">
            <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400 bg-clip-text text-transparent">EchoCoder</span>
            <span className="block text-foreground/90">Visual + code studio for LUCCCA</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base md:text-lg text-muted-foreground">
            Plan → Scaffold → Verify → Patch → Integrate → Log. Deterministic guardrails, Apple×TRON tokens, and MCP integrations. Pixel‑perfect, accessible, and budget‑aware.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="shadow-neon">
              <Link to="/studio">Open Studio</Link>
            </Button>
            <Button asChild variant="outline">
              <a href="#blueprint">See Blueprint</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Core Loop */}
      <section className="container py-16 md:py-24">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">The Self‑Coding Loop</h2>
        <p className="mt-2 text-muted-foreground max-w-2xl">Tighten the loop with tools, rules, and your house patterns. No retraining—just deterministic steps.</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ title, desc, Icon }) => (
            <Link key={title} to="/studio" className="group">
              <Card className="border-border/60 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-transform group-hover:-translate-y-0.5">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-md p-2 bg-primary/15 text-primary shadow-neon">
                      <Icon />
                    </div>
                    <CardTitle>{title}</CardTitle>
                  </div>
                  <CardDescription>{desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Decision Engine */}
      <section id="blueprint" className="container py-16 md:py-24">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Decision Engine</h2>
            <p className="mt-2 text-muted-foreground">Plans are scored by Fit, Complexity, Deps, Perf, A11y, Observability, Security, and Bundle. Highest score wins; Historian records the why.</p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li>• Fit to LUCCCA patterns & components</li>
              <li>• Minimal complexity and deps; zero risky packages by default</li>
              <li>• Budgets: Lighthouse, bundle delta, tests, security</li>
              <li>• A11y‑first: keyboard paths, contrast, reduced motion</li>
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 p-2 text-xs">
              <Link className="px-3 py-1 rounded-md hover:bg-accent/30" to="/studio">Studio</Link>
              <a className="px-3 py-1 rounded-md hover:bg-accent/30" href="#monorepo">Monorepo</a>
              <Link className="px-3 py-1 rounded-md hover:bg-accent/30" to="/generated">/generated</Link>
              <Link className="px-3 py-1 rounded-md hover:bg-accent/30" to="/studio">Planner</Link>
              <Link className="px-3 py-1 rounded-md hover:bg-accent/30" to="/studio">Coder</Link>
              <Link className="px-3 py-1 rounded-md hover:bg-accent/30" to="/studio">Reviewer</Link>
              <Link className="px-3 py-1 rounded-md hover:bg-accent/30" to="/studio">Integrator</Link>
              <Link className="px-3 py-1 rounded-md hover:bg-accent/30" to="/studio">Historian</Link>
              <Link className="px-3 py-1 rounded-md hover:bg-accent/30" to="/studio">Scorecard</Link>
            </div>
            <div className="mt-6 flex gap-3">
              <Button asChild>
                <Link to="/studio">Generate a Panel</Link>
              </Button>
              <Button variant="secondary" asChild>
                <a href="#monorepo">Monorepo Layout</a>
              </Button>
            </div>
          </div>
          <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/30">
            <CardHeader>
              <CardTitle>Guardrails & Tools</CardTitle>
              <CardDescription>ESLint/TS, Vitest, axe-core, Lighthouse, audits; AST codemods—not regex.</CardDescription>
            </CardHeader>
            <CardContent>
              <code className="block whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-xs leading-relaxed">
{`tools: {
  run_tests({ scope: "packages/echo-coder" }),
  run_lint({ scope: "." }),
  run_a11y({ url: "/" }),
  run_perf({ url: "/", budgets }),
  ast_edit("react-insert-telemetry")
}`}
              </code>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Monorepo */}
      <section id="monorepo" className="container py-16 md:py-24">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Minimal Monorepo (v1)</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Packages</CardTitle>
              <CardDescription>Engine, adapters, templates, knowledge, tools, packs.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• echo-coder-engine • echo-coder-adapters • echo-coder-templates</li>
                <li>• echo-coder-knowledge • echo-coder-tools • zaro-guard</li>
                <li>• finance & hospitality domain packs • 3D pack</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Apps</CardTitle>
              <CardDescription>LUCCCA web + EchoCoder Studio + API gateway.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• luccca-web (React + Vite + Tailwind + shadcn/ui)</li>
                <li>• echo-coder-studio (Canvas, Inspector, Code, Preview)</li>
                <li>• api-gateway (tools + adapters HTTP surface)</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 md:py-24">
        <div className="rounded-xl border bg-card/60 p-8 text-center backdrop-blur">
          <h3 className="text-2xl font-semibold">Ready to watch it code itself?</h3>
          <p className="mt-2 text-muted-foreground">Connect MCPs, set budgets, and press Generate. EchoCoder will scaffold, verify, and open a PR.</p>
          <div className="mt-6">
            <Button asChild className="shadow-neon">
              <Link to="/studio">Open Studio</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
