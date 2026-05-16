/** * SeasonResultsPanel Component * Displays comprehensive season results with rankings and metrics * For GM/Leadership analytics and season review * Part of LUCCCA sales analytics */ import React, {
  useState,
} from "react";
import { useSeasonResults } from "../../hooks/useSeasonResults";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import { AlertCircle, TrendingUp } from "lucide-react";
export const SeasonResultsPanel: React.FC = () => {
  const { data, seasons, loading, seasonsLoading, error, refetch } =
    useSeasonResults();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const handleSeasonChange = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    refetch(seasonId);
  }; // Auto-select first season React.useEffect(() => { if (seasons.length > 0 && !selectedSeasonId) { setSelectedSeasonId(seasons[0].id); refetch(seasons[0].id); } }, [seasons]); if (seasonsLoading) { return ( <Card> <CardHeader> <CardTitle className="text-sm">Season Results</CardTitle> </CardHeader> <CardContent> <div className="text-xs text-muted-foreground">Loading seasons…</div> </CardContent> </Card> ); } if (seasons.length === 0) { return ( <Card> <CardHeader> <CardTitle className="text-sm">Season Results</CardTitle> </CardHeader> <CardContent> <div className="flex gap-2 text-xs text-amber-600"> <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> <span>No seasons available.</span> </div> </CardContent> </Card> ); } return ( <Card> <CardHeader> <CardTitle className="text-sm">Season Results</CardTitle> <CardDescription className="text-xs"> Performance rankings and metrics for selected season </CardDescription> </CardHeader> <CardContent className="space-y-4"> {/* Season Selector */} <Select value={selectedSeasonId} onValueChange={handleSeasonChange}> <SelectTrigger className="w-full h-9"> <SelectValue placeholder="Select a season…" /> </SelectTrigger> <SelectContent> {seasons.map((season) => ( <SelectItem key={season.id} value={season.id}> {season.name} ({season.startDate} → {season.endDate}) </SelectItem> ))} </SelectContent> </Select> {/* Loading */} {loading && ( <div className="text-xs text-muted-foreground text-center py-4"> Loading results… </div> )} {/* Error */} {error && ( <div className="flex gap-2 text-xs text-red-600 p-2 bg-red-50 rounded"> <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> <span>{error}</span> </div> )} {/* Results */} {data && !loading && ( <> {/* Summary Metrics */} <div className="grid grid-cols-2 gap-2"> <div className="border rounded-lg p-2 bg-slate-50"> <div className="text-[0.65rem] text-muted-foreground mb-0.5"> Total Revenue </div> <div className="font-semibold text-sm"> ${data.summary.totalRevenue.toLocaleString("en-US", { maximumFractionDigits: 0, })} </div> </div> <div className="border rounded-lg p-2 bg-slate-50"> <div className="text-[0.65rem] text-muted-foreground mb-0.5"> Total Profit </div> <div className="font-semibold text-sm"> ${data.summary.totalProfit.toLocaleString("en-US", { maximumFractionDigits: 0, })} </div> </div> <div className="border rounded-lg p-2 bg-slate-50"> <div className="text-[0.65rem] text-muted-foreground mb-0.5"> Avg Margin </div> <div className="font-semibold text-sm"> {(data.summary.averageMarginPct * 100).toFixed(1)}% </div> </div> <div className="border rounded-lg p-2 bg-slate-50"> <div className="text-[0.65rem] text-muted-foreground mb-0.5"> Avg Win Rate </div> <div className="font-semibold text-sm"> {(data.summary.averageWinRatePct * 100).toFixed(0)}% </div> </div> </div> {/* Top Performer */} {data.summary.topPerformer && ( <div className="border rounded-lg p-3 bg-blue-50"> <div className="flex items-center gap-1.5 mb-1.5"> <TrendingUp className="w-3.5 h-3.5 text-primary" /> <span className="text-xs font-semibold text-blue-700"> Top Performer </span> </div> <div className="text-sm font-bold"> {data.summary.topPerformer.userName} </div> <div className="text-[0.65rem] text-primary"> ${data.summary.topPerformer.totalRevenue.toLocaleString("en-US", { maximumFractionDigits: 0, })}{""} revenue • {(data.summary.topPerformer.winRatePct * 100).toFixed(0)}% win rate </div> </div> )} {/* Rankings Table */} <div className="space-y-1"> <h4 className="text-xs font-semibold">Rankings</h4> <div className="border rounded-lg overflow-hidden"> <div className="text-[0.65rem] font-semibold bg-slate-100 px-2 py-1.5 grid grid-cols-7 gap-1"> <div className="text-center">Rank</div> <div className="col-span-2">Salesperson</div> <div className="text-right">Revenue</div> <div className="text-right">Margin %</div> <div className="text-right">Win %</div> <div className="text-right">Score</div> </div> <div className="divide-y"> {data.rankings.map((perf, idx) => ( <div key={perf.userId} className="text-[0.65rem] px-2 py-1.5 grid grid-cols-7 gap-1 hover:bg-slate-50" > <div className="text-center font-semibold"> {idx + 1} </div> <div className="col-span-2 font-medium"> {perf.userName} </div> <div className="text-right"> ${(perf.totalRevenue / 1000).toFixed(0)}k </div> <div className="text-right"> {(perf.avgMarginPct * 100).toFixed(0)}% </div> <div className="text-right"> {(perf.winRatePct * 100).toFixed(0)}% </div> <div className="text-right font-semibold"> {perf.overallScore.toFixed(0)} </div> </div> ))} </div> </div> </div> </> )} </CardContent> </Card> );
};
export default SeasonResultsPanel;
