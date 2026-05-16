import { FormEvent, useState } from "react";
import { BookOpenCheck, ExternalLink, Loader2, Shield } from "lucide-react";

import { PanelFrame } from "@/components/panels/PanelFrame";
import { useEchoActions } from "@/hooks/use-echo-actions";
import { useAudit } from "@/hooks/use-audit";
import { usePanelManager } from "@/hooks/use-panel-manager";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { useToast } from "@/hooks/use-toast";

const areaFilters = [
  { id: "all", label: "All areas" },
  { id: "finance", label: "Finance" },
  { id: "ops", label: "Operations" },
  { id: "kitchen", label: "Kitchen" },
  { id: "dining", label: "Dining" },
];

export function HelpCenterPanel() {
  const echo = useEchoActions();
  const audit = useAudit();
  const panelManager = usePanelManager();
  const flags = useFeatureFlags();
  const { toast } = useToast();

  const [query, setQuery] = useState("invoice triage flow");
  const [area, setArea] = useState<string>("all");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Awaited<ReturnType<NonNullable<typeof echo.searchKnowledge>>>>([]);

  const handleSearch = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!echo.searchKnowledge) {
      toast({
        title: "Help Center offline",
        description: "Echo search is currently unavailable.",
      });
      return;
    }

    setIsSearching(true);
    try {
      const response = await echo.searchKnowledge(query);
      const filtered = area === "all"
        ? response
        : response.filter((hit) => hit.panelSuggestion?.toLowerCase().includes(area));
      setResults(filtered);
      toast({
        title: filtered.length ? "Knowledge base updated" : "No matches",
        description: filtered.length
          ? `${filtered.length} articles surfaced.`
          : "Try refining the query or switch the area filter.",
      });
      await audit.log({
        action: "PANEL_ACTION",
        entity: "HelpCenter",
        entityId: query,
        data: { area },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Search failed",
        description: message,
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <PanelFrame
      panelId="HelpCenter"
      title="Help center"
      subtitle="Semantic search across SOPs, Builder CMS, and Notion"
      areas={["global"]}
      toolbar={
        <div className="flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:border-[#c8a97e]/25 dark:text-[#c8a97e]/80">
          <Shield className={flags.AUTH_ENABLE_TOTP ? "h-3.5 w-3.5 text-emerald-400" : "h-3.5 w-3.5 text-amber-400"} aria-hidden />
          MFA {flags.AUTH_ENABLE_TOTP ? "enabled" : "disabled"}
        </div>
      }
    >
      <form onSubmit={handleSearch} className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 shadow-sm dark:border-[#c8a97e]/15 dark:bg-slate-900/60">
        <div className="grid gap-2 sm:grid-cols-[1.2fr_0.8fr_auto]">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-[#c8a97e]/80">
              Search
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ask Echo..."
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-500 focus:outline-none dark:border-[#c8a97e]/25 dark:bg-slate-950/70 dark:text-[#c8a97e]/80"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-[#c8a97e]/80">
              Area
            </span>
            <select
              value={area}
              onChange={(event) => setArea(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-500 focus:outline-none dark:border-[#c8a97e]/25 dark:bg-slate-950/70 dark:text-[#c8a97e]/80"
            >
              {areaFilters.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={isSearching}
            className="mt-auto inline-flex items-center gap-2 rounded-full border border-[#c8a97e]/60 bg-[#c8a97e]/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-white/80 transition hover:bg-[#c8a97e]/25 disabled:opacity-60"
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <BookOpenCheck className="h-4 w-4" aria-hidden />}
            Search
          </button>
        </div>
      </form>

      <section className="mt-3 space-y-2">
        {results.length ? (
          results.map((hit) => (
            <article
              key={hit.id}
              className="rounded-2xl border border-[#c8a97e]/25 bg-[#c8a97e]/08 p-3 text-sm text-white/80 shadow-[#c8a97e]-500/10"
            >
              <header className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.32em]">
                <span>{hit.title}</span>
                <span className="rounded-full border border-[#c8a97e]/25 px-3 py-0.5 text-[10px] uppercase tracking-[0.32em]">
                  {hit.source}
                </span>
              </header>
              <p className="mt-2 text-sm leading-relaxed text-amber-50/90">{hit.snippet}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {hit.panelSuggestion ? (
                  <button
                    type="button"
                    onClick={() => panelManager.open(hit.panelSuggestion ?? "HelpCenter")}
                    className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white transition hover:border-white/60 hover:bg-white/20"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    Open panel
                  </button>
                ) : null}
                <span className="text-[11px] uppercase tracking-[0.28em] text-amber-50/70">
                  {hit.panelSuggestion ?? "Context"}
                </span>
              </div>
            </article>
          ))
        ) : (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300/70 bg-white/60 text-center text-sm text-slate-500 dark:border-[#c8a97e]/25 dark:bg-slate-900/40 dark:text-[#c8a97e]/60">
            <p className="max-w-xs">Search AI-assisted docs, SOPs, and Builder CMS entries to unblock the team.</p>
          </div>
        )}
      </section>
    </PanelFrame>
  );
}

export default HelpCenterPanel;
