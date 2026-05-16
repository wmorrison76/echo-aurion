import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FEATURE_COMPARISON, COMPETITORS, type FeatureComparison } from "@/data/competitiveAnalysis";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

const stanceLabel: Record<string, { label: string; className: string }> = {
  lead: { label: "Lead", className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100" },
  parity: { label: "Parity", className: "bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-100" },
  lag: { label: "Lag", className: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100" },
};

const stanceDot: Record<string, string> = {
  lead: "bg-emerald-500",
  parity: "bg-sky-500",
  lag: "bg-amber-500",
};

type CompetitiveAnalysisPanelProps = {
  className?: string;
};

export function CompetitiveAnalysisPanel({ className }: CompetitiveAnalysisPanelProps) {
  const [activeFeatureKey, setActiveFeatureKey] = useState(FEATURE_COMPARISON[0]?.key ?? "yieldIntelligence");

  const activeFeature = useMemo<FeatureComparison | undefined>(
    () => FEATURE_COMPARISON.find((feature) => feature.key === activeFeatureKey),
    [activeFeatureKey],
  );

  return (
    <section className={cn("space-y-6", className)}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Competitive intelligence</CardTitle>
          <CardDescription>
            Position Echo Recipe Pro against core competitors. Use the scorecards to guide enablement and roadmap
            priorities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricHighlight label="Strength lanes" value="Yield intelligence · Predictive procurement" />
            <MetricHighlight label="Parity lanes" value="Nutrition compliance · Menu engineering" />
            <MetricHighlight label="Catch-up lanes" value="None — we lead or meet in every focus" accent="emerald" />
            <MetricHighlight
              label="Opportunity"
              value="Leverage collaboration & look book upgrades in go-to-market stories"
              accent="sky"
            />
          </div>
          <Tabs
            value={activeFeatureKey}
            onValueChange={(value) => setActiveFeatureKey(value as FeatureComparison["key"])}
            className="w-full"
          >
            <TabsList className="w-full flex-wrap justify-start gap-1 overflow-x-auto">
              {FEATURE_COMPARISON.map((feature) => (
                <TabsTrigger key={feature.key} value={feature.key} className="text-xs whitespace-nowrap">
                  {feature.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={activeFeatureKey} className="mt-4">
              {activeFeature && (
                <Card className="border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">{activeFeature.label}</CardTitle>
                    <CardDescription>{activeFeature.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3">
                      <p className="font-medium text-emerald-900 dark:text-emerald-100">Echo Recipe Pro</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-emerald-800 dark:text-emerald-100/90">
                        {activeFeature.echoRecipePro.proofPoints.map((point) => (
                          <Badge
                            key={point}
                            variant="outline"
                            className="border-emerald-500/40 bg-white/40 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100"
                          >
                            {point}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {COMPETITORS.map((competitor) => {
                        const score = activeFeature.competitors[competitor.id];
                        const stance = stanceLabel[score.stance];
                        return (
                          <div key={competitor.id} className="rounded-lg border border-white/10 bg-muted/30 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold">{competitor.name}</p>
                                <p className="text-[11px] text-muted-foreground">{competitor.focus}</p>
                              </div>
                              <Badge variant="secondary" className={stance.className}>
                                {stance.label}
                              </Badge>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">{score.notes}</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Feature matrix</CardTitle>
          <CardDescription>
            Quick visual comparison of feature depth and differentiation. "Lead" indicates a clear functional or UX
            advantage.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <ScrollArea className="max-h-[420px]">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[700px] border-separate border-spacing-y-2 text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="rounded-l-lg bg-muted/60 px-4 py-3 text-left font-medium">Capability</th>
                    <th className="bg-muted/60 px-4 py-3 text-left font-medium">Echo Recipe Pro</th>
                    {COMPETITORS.map((competitor, idx) => (
                      <th
                        key={competitor.id}
                        className={cn(
                          "bg-muted/60 px-4 py-3 text-left font-medium",
                          idx === COMPETITORS.length - 1 && "rounded-r-lg",
                        )}
                      >
                        {competitor.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_COMPARISON.map((feature) => (
                    <tr key={feature.key} className="align-top">
                      <td className="w-52 rounded-l-lg bg-background/70 px-4 py-3">
                        <div className="font-semibold">{feature.label}</div>
                        <div className="text-xs text-muted-foreground leading-relaxed">
                          {feature.description}
                        </div>
                      </td>
                      <td className="bg-background/70 px-4 py-3">
                        <StanceChip stance={feature.echoRecipePro.stance}>
                          {feature.echoRecipePro.proofPoints[0]}
                        </StanceChip>
                      </td>
                      {COMPETITORS.map((competitor, idx) => {
                        const competitorScore = feature.competitors[competitor.id];
                        const cellClasses = cn(
                          "bg-background/70 px-4 py-3",
                          idx === COMPETITORS.length - 1 && "rounded-r-lg",
                        );
                        return (
                          <td key={competitor.id} className={cellClasses}>
                            <StanceChip stance={competitorScore.stance}>{competitorScore.notes}</StanceChip>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Competitor snapshots</CardTitle>
          <CardDescription>
            Condensed positioning intel to support enablement decks and objection handling.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {COMPETITORS.map((competitor) => (
            <div key={competitor.id} className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{competitor.name}</p>
                  <p className="text-[11px] text-muted-foreground">{competitor.pricingModel}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {competitor.focus}
                </Badge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Ideal customer</p>
                <p>{competitor.idealCustomer}</p>
              </div>
              <div className="mt-3 grid gap-2 text-xs">
                <div>
                  <p className="font-semibold text-foreground">Strengths</p>
                  <ul className="list-disc pl-4 text-muted-foreground">
                    {competitor.strengths.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Cautions</p>
                  <ul className="list-disc pl-4 text-muted-foreground">
                    {competitor.cautions.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

function MetricHighlight({
  label,
  value,
  accent = "slate",
}: {
  label: string;
  value: string;
  accent?: "slate" | "emerald" | "sky";
}) {
  const palette: Record<typeof accent, string> = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:text-slate-100",
    emerald: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100",
    sky: "bg-sky-100 text-sky-900 dark:bg-sky-500/10 dark:text-sky-100",
  } as const;
  return (
    <div className={cn("rounded-xl p-4 text-xs", palette[accent])}>
      <p className="font-semibold uppercase tracking-[0.2em]">{label}</p>
      <p className="mt-2 text-sm font-medium leading-relaxed">{value}</p>
    </div>
  );
}

function StanceChip({ stance, children }: { stance: string; children: React.ReactNode }) {
  const config = stanceLabel[stance] ?? stanceLabel.parity;
  return (
    <div className="space-y-1">
      <Badge variant="outline" className={cn("gap-2", config.className)}>
        <span className={cn("h-2 w-2 rounded-full", stanceDot[stance] ?? stanceDot.parity)} aria-hidden />
        {config.label}
      </Badge>
      <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
