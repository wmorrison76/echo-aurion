import { useState } from "react";
import { GlassWater, Loader2, Sparkles } from "lucide-react";

import { PanelFrame } from "@/components/panels/PanelFrame";
import { useEchoActions } from "@/hooks/use-echo-actions";
import { useAudit } from "@/hooks/use-audit";
import { useToast } from "@/hooks/use-toast";

export function WinePairingPanel() {
  const echo = useEchoActions();
  const audit = useAudit();
  const { toast } = useToast();

  const [dishName, setDishName] = useState("Scallop tartare, yuzu kosho, compressed pear");
  const [dominantFlavor, setDominantFlavor] = useState("Citrus + salinity");
  const [occasion, setOccasion] = useState("Chef's tasting");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Awaited<ReturnType<NonNullable<typeof echo.pairWine>>>>();

  const handlePairings = async () => {
    if (!echo.pairWine) {
      toast({
        title: "Pairing service unavailable",
        description: "Echo pairing tools are offline. Try again soon.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const wines = await echo.pairWine({ name: dishName, dominantFlavor, occasion });
      setSuggestions(wines);
      toast({
        title: "Pairings refreshed",
        description: `${wines.length} wines mapped to the tasting.`,
      });
      await audit.log({
        action: "PANEL_ACTION",
        entity: "WinePairing",
        entityId: dishName,
        data: { panel: "WinePairing", dominantFlavor, occasion },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Unable to fetch pairings",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PanelFrame
      panelId="WinePairing"
      title="Wine pairing"
      subtitle="Echo sommeliers translate dishes into confident pours"
      areas={["ops", "dining"]}
      toolbar={
        <span className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:border-[#c8a97e]/25 dark:text-[#c8a97e]/80">
          Live cellar sync
        </span>
      }
    >
      <div className="grid gap-3 lg:grid-cols-[1.1fr_1.2fr]">
        <section className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 shadow-sm dark:border-[#c8a97e]/15 dark:bg-slate-900/60">
          <header className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-[#c8a97e]/80">
            <GlassWater className="h-4 w-4" aria-hidden />
            Dish context
          </header>
          <div className="mt-3 space-y-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-[#c8a97e]/80">
                Dish name
              </span>
              <input
                value={dishName}
                onChange={(event) => setDishName(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-500 focus:outline-none dark:border-[#c8a97e]/25 dark:bg-slate-950/70 dark:text-[#c8a97e]/80"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-[#c8a97e]/80">
                Dominant flavor
              </span>
              <input
                value={dominantFlavor}
                onChange={(event) => setDominantFlavor(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-500 focus:outline-none dark:border-[#c8a97e]/25 dark:bg-slate-950/70 dark:text-[#c8a97e]/80"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-[#c8a97e]/80">
                Occasion
              </span>
              <input
                value={occasion}
                onChange={(event) => setOccasion(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-500 focus:outline-none dark:border-[#c8a97e]/25 dark:bg-slate-950/70 dark:text-[#c8a97e]/80"
                placeholder="Banquet, chef's counter, etc."
              />
            </label>
            <button
              type="button"
              onClick={handlePairings}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-full border border-[#c8a97e]/60 bg-[#c8a97e]/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-white/80 transition hover:bg-[#c8a97e]/25 disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}Pair wines
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 shadow-sm dark:border-[#c8a97e]/15 dark:bg-slate-900/60">
          <header className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-[#c8a97e]/80">
            Suggested pours
          </header>
          <div className="mt-3 space-y-2 text-sm">
            {suggestions?.length ? (
              suggestions.map((wine) => (
                <article
                  key={`${wine.label}-${wine.style}`}
                  className="rounded-2xl border border-[#c8a97e]/25 bg-[#c8a97e]/08 p-3 text-white/80 shadow-[#c8a97e]-500/10"
                >
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.32em]">
                    <span>{wine.label}</span>
                    <span>{Math.round(wine.confidence * 100)}%</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold">{wine.style}</div>
                  <div className="text-xs uppercase tracking-[0.32em] opacity-70">{wine.region}</div>
                  <p className="mt-2 text-sm leading-relaxed">{wine.pairingNote}</p>
                </article>
              ))
            ) : (
              <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300/70 bg-white/60 text-center text-sm text-slate-500 dark:border-[#c8a97e]/25 dark:bg-slate-900/40 dark:text-[#c8a97e]/60">
                <p className="max-w-xs">Run pairing to populate Echo’s curated cellar recommendations.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </PanelFrame>
  );
}

export default WinePairingPanel;
