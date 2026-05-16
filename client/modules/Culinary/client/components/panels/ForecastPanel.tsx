import { useMemo, useState } from "react";
import { BarChart3, Clock3, Loader2, PanelsTopLeft } from "lucide-react";

import { PanelFrame } from "@/components/panels/PanelFrame";
import { useEchoActions } from "@/hooks/use-echo-actions";
import { useAudit } from "@/hooks/use-audit";
import { usePanelManager } from "@/hooks/use-panel-manager";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const windows = [7, 14, 30] as const;
const bases = ["baseline", "optimistic", "cautious"] as const;

type WindowOption = (typeof windows)[number];
type BasisOption = (typeof bases)[number];

export function ForecastPanel() {
  const echo = useEchoActions();
  const audit = useAudit();
  const panelManager = usePanelManager();
  const { toast } = useToast();

  const [scope, setScope] = useState("Global rollup");
  const [windowDays, setWindowDays] = useState<WindowOption>(30);
  const [basis, setBasis] = useState<BasisOption>("baseline");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<NonNullable<typeof echo.forecastDemand>>>>();

  const dailyGroups = useMemo(() => {
    if (!result) return [] as typeof result.daily[];
    return result.daily.slice(0, 10);
  }, [result]);

  const handleForecast = async () => {
    if (!echo.forecastDemand) {
      toast({
        title: "Forecast service unavailable",
        description: "Try again later or open Help Center for status updates.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const outcome = await echo.forecastDemand({ windowDays, scope, basis });
      setResult(outcome);
      toast({
        title: "Forecast ready",
        description: `${windowDays}-day outlook for ${scope}`,
      });
      await audit.log({
        action: "PANEL_ACTION",
        entity: "Forecast",
        entityId: `${scope}:${windowDays}`,
        data: { panel: "Forecast30", basis },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Unable to forecast",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PanelFrame
      panelId="Forecast30"
      title="30-day forecast"
      subtitle="Blend demand, events, and reservations for prep planning"
      areas={["global", "finance"]}
      toolbar={
        <button
          type="button"
          onClick={() => panelManager.open("InvoiceTriage", { context: { scope } })}
          className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 transition hover:border-slate-400 hover:bg-white dark:border-[#c8a97e]/25 dark:text-[#c8a97e]/80 dark:hover:border-[#c8a97e]/50 dark:hover:bg-[#c8a97e]-500/10"
        >
          <PanelsTopLeft className="h-3.5 w-3.5" aria-hidden />
          Open AP
        </button>
      }
    >
      <div className="grid gap-3 lg:grid-cols-[1.05fr_1.2fr]">
        <section className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 shadow-sm dark:border-[#c8a97e]/15 dark:bg-slate-900/60">
          <header className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-[#c8a97e]/80">
            <BarChart3 className="h-4 w-4" aria-hidden />
            Configuration
          </header>
          <div className="mt-3 space-y-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-[#c8a97e]/80">
                Scope
              </span>
              <input
                value={scope}
                onChange={(event) => setScope(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-500 focus:outline-none dark:border-[#c8a97e]/25 dark:bg-slate-950/70 dark:text-[#c8a97e]/80"
                placeholder="Outlet / Market"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-[#c8a97e]/80">
                  Window days
                </span>
                <div className="flex gap-1">
                  {windows.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setWindowDays(value)}
                      className={cn(
                        "flex-1 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.3em] transition",
                        value === windowDays
                          ? "border-[#c8a97e]/60 bg-[#c8a97e]/15 text-white/80"
                          : "border-slate-300 bg-white/85 text-slate-500 hover:border-slate-400 dark:border-[#c8a97e]/25 dark:bg-slate-950/70 dark:text-[#c8a97e]/60",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-[#c8a97e]/80">
                  Basis
                </span>
                <div className="flex gap-1">
                  {bases.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setBasis(value)}
                      className={cn(
                        "flex-1 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.3em] transition",
                        value === basis
                          ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-50"
                          : "border-slate-300 bg-white/85 text-slate-500 hover:border-slate-400 dark:border-[#c8a97e]/25 dark:bg-slate-950/70 dark:text-[#c8a97e]/60",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </label>
            </div>
            <button
              type="button"
              onClick={handleForecast}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-full border border-[#c8a97e]/60 bg-[#c8a97e]/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-white/80 transition hover:bg-[#c8a97e]/25 disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Clock3 className="h-4 w-4" aria-hidden />}Generate
            </button>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-[#c8a97e]/80">
              Forecast blends historical covers, scheduled events, and active reservations with weather and macro trends.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          {result ? (
            <div className="rounded-2xl border border-[#c8a97e]/25 bg-[#c8a97e]/08 p-3 text-sm text-white/80 shadow-lg shadow-[#c8a97e]-500/10">
              <header className="text-xs font-semibold uppercase tracking-[0.32em]">
                {result.summary}
              </header>
              <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-[#c8a97e]/15 bg-slate-950/20">
                <table className="min-w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#c8a97e]/15 uppercase tracking-[0.32em] text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Demand</th>
                      <th className="px-3 py-2">Labor hrs</th>
                      <th className="px-3 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyGroups.map((entry) => (
                      <tr key={entry.date} className="odd:bg-slate-950/10">
                        <td className="px-3 py-1.5 font-semibold">{entry.date}</td>
                        <td className="px-3 py-1.5">{entry.demand}</td>
                        <td className="px-3 py-1.5">{entry.laborHours}</td>
                        <td className="px-3 py-1.5 opacity-80">{entry.commentary ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300/70 bg-white/60 text-center text-sm text-slate-500 dark:border-[#c8a97e]/25 dark:bg-slate-900/40 dark:text-[#c8a97e]/60">
              <p className="max-w-xs">
                Generate a forecast to populate demand curves and labor utilization suggestions.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-3 text-xs leading-relaxed text-slate-500 shadow-sm dark:border-[#c8a97e]/15 dark:bg-slate-900/60 dark:text-[#c8a97e]/80">
            <header className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em]">
              <BarChart3 className="h-4 w-4" aria-hidden />
              Suggested follow-up
            </header>
            <ul className="list-disc space-y-1 pl-4">
              <li>Dock to kitchen boards for prep staging.</li>
              <li>Share with finance for cash flow modeling.</li>
              <li>Escalate to AP if inbound invoices miss forecast by 20%.</li>
            </ul>
          </div>
        </section>
      </div>
    </PanelFrame>
  );
}

export default ForecastPanel;
