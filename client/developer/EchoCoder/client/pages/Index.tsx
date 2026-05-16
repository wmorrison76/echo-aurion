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
  ArrowRight,
} from "lucide-react";
import { ResponsiveContainer, ResponsiveGrid, useBreakpoint } from "@/components/layout";

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
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "xs" || breakpoint === "sm";

  return (
    <main className="bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-0 opacity-50 [background:radial-gradient(1200px_600px_at_50%_-20%,hsl(var(--primary)/0.25),transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,transparent,transparent_31px,hsl(var(--border))_32px),linear-gradient(to_bottom,transparent,transparent_31px,hsl(var(--border))_32px)] [background-size:32px_32px]" />
        
        <ResponsiveContainer className="relative py-12 sm:py-20 md:py-28">
          <div className="space-y-6 sm:space-y-8">
            {/* Badge */}
            <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs sm:text-sm text-muted-foreground bg-background/60 w-fit">
              Echo Ai Hospitality Suite
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
            </p>

            {/* Main Heading */}
            <div className="space-y-4 sm:space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400 bg-clip-text text-transparent">
                  EchoCoder
                </span>
                <span className="block text-foreground/90 mt-2 text-2xl sm:text-3xl md:text-4xl">
                  Builder.io-style visual + code studio for LUCCCA
                </span>
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl">
                Plan → Scaffold → Verify → Patch → Integrate → Log. Deterministic guardrails, Apple×TRON tokens, and MCP integrations. Pixel-perfect, accessible, and budget-aware.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 sm:pt-4">
              <Button asChild className="shadow-neon text-xs sm:text-sm h-9 sm:h-10">
                <Link to="/studio" className="inline-flex items-center gap-2">
                  Open Studio
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="text-xs sm:text-sm h-9 sm:h-10">
                <a href="#blueprint">See Blueprint</a>
              </Button>
            </div>
          </div>
        </ResponsiveContainer>
      </section>

      {/* Features Section */}
      <section className="border-b">
        <ResponsiveContainer className="py-12 sm:py-16 md:py-24">
          <div className="space-y-6 sm:space-y-8">
            <div className="space-y-2 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                The Self-Coding Loop
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl">
                Tighten the loop with tools, rules, and your house patterns. No retraining—just deterministic steps.
              </p>
            </div>

            {/* Features Grid */}
            <ResponsiveGrid 
              cols={{ xs: 1, sm: 2, md: 3, lg: 3 }} 
              gap="md"
              className="sm:gap-lg"
            >
              {features.map(({ title, desc, Icon }) => (
                <Link key={title} to="/studio" className="group">
                  <Card className="border-border/60 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-transform group-hover:-translate-y-0.5 h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="rounded-md p-2 bg-primary/15 text-primary shadow-neon flex-shrink-0">
                          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
                      </div>
                      <CardDescription className="text-xs sm:text-sm line-clamp-3">
                        {desc}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </ResponsiveGrid>
          </div>
        </ResponsiveContainer>
      </section>

      {/* Decision Engine Section */}
      <section id="blueprint" className="border-b">
        <ResponsiveContainer className="py-12 sm:py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-12">
            {/* Text Content */}
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                Decision Engine
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
                Plans are scored by Fit, Complexity, Deps, Perf, A11y, Observability, Security, and Bundle. Highest score wins; Historian records the why.
              </p>
              <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Fit to LUCCCA patterns & components</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Minimal complexity and deps; zero risky packages by default</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Budgets: Lighthouse, bundle delta, tests, security</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>A11y-first: keyboard paths, contrast, reduced motion</span>
                </li>
              </ul>
            </div>

            {/* Links Grid */}
            <div className="flex items-center">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
                {[
                  { label: "Studio", href: "/studio" },
                  { label: "Planner", href: "/studio" },
                  { label: "Coder", href: "/studio" },
                  { label: "Reviewer", href: "/studio" },
                  { label: "Integrator", href: "/studio" },
                  { label: "Historian", href: "/studio" },
                  { label: "/generated", href: "/generated" },
                  { label: "Scorecard", href: "/studio" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="p-3 rounded-md border hover:bg-accent/30 transition text-xs sm:text-sm font-medium text-center"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </ResponsiveContainer>
      </section>

      {/* CTA Section */}
      <section className="border-t">
        <ResponsiveContainer className="py-12 sm:py-16 md:py-24 text-center">
          <div className="space-y-6 sm:space-y-8">
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                Ready to build?
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
                Start building your next application with the power of AI-driven code generation.
              </p>
            </div>
            <Button asChild className="text-xs sm:text-sm h-9 sm:h-10 mx-auto">
              <Link to="/studio">
                Launch Studio
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </ResponsiveContainer>
      </section>
    </main>
  );
}
