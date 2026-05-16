import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
export interface ParSuggestionRow {
  id: string;
  itemName: string;
  outletName: string;
  currentPar: number | null;
  recommendedPar: number;
  variancePct: number;
  rationale: string;
}
interface ParLevelsWidgetProps {
  suggestions: ParSuggestionRow[];
}
const formatPar = (value: number | null) => {
  if (value == null || Number.isNaN(value)) return "—";
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toFixed(1);
};
export function ParLevelsWidget({ suggestions }: ParLevelsWidgetProps) {
  if (!suggestions.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {" "}
        No variance between current par levels and AI recommendations.{" "}
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {" "}
      {suggestions.map((suggestion) => {
        const direction = suggestion.variancePct >= 0 ? "Increase" : "Reduce";
        const magnitude = Math.abs(suggestion.variancePct);
        return (
          <div
            key={suggestion.id}
            className="rounded-lg border border-slate-800/60 bg-card p-4 shadow-inner shadow-slate-950/30"
          >
            {" "}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {" "}
              <div>
                {" "}
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {" "}
                  {suggestion.outletName}{" "}
                </p>{" "}
                <h3 className="text-sm font-semibold text-slate-100">
                  {" "}
                  {suggestion.itemName}{" "}
                </h3>{" "}
                <p className="text-xs text-slate-400">
                  {suggestion.rationale}
                </p>{" "}
              </div>{" "}
              <Badge
                className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide ${suggestion.variancePct >= 0 ? "bg-emerald-500/20 text-emerald-100" : "bg-amber-400/20 text-amber-100"}`}
              >
                {" "}
                {direction} {magnitude.toFixed(1)}%{" "}
              </Badge>{" "}
            </div>{" "}
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400">
              {" "}
              <div>
                {" "}
                <p className="text-foreground"> Current Par </p>{" "}
                <p className="text-sm font-semibold text-slate-200">
                  {" "}
                  {formatPar(suggestion.currentPar)}{" "}
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="text-foreground"> Recommended </p>{" "}
                <p className="text-sm font-semibold text-slate-200">
                  {" "}
                  {formatPar(suggestion.recommendedPar)}{" "}
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="text-foreground">Variance</p>{" "}
                <p className="text-sm font-semibold text-slate-200">
                  {" "}
                  {suggestion.variancePct >= 0 ? "+" : ""}{" "}
                  {suggestion.variancePct.toFixed(1)}%{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
            <div className="mt-3">
              {" "}
              <Progress value={Math.min(magnitude, 100)} className="h-2" />{" "}
            </div>{" "}
          </div>
        );
      })}{" "}
    </div>
  );
}
