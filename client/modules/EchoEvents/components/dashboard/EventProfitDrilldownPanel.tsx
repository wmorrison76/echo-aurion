/** * EventProfitDrilldownPanel Component * Displays detailed profit breakdown for an event from Aurum integration * Shows cost categories, margins, and forecast vs actual comparison * Part of LUCCCA financial analytics */ import React from "react";
import { useEventProfitDrilldown } from "../../hooks/useEventProfitDrilldown";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { AlertCircle, TrendingDown, TrendingUp } from "lucide-react";
interface Props {
  eventId: string | null;
  beoId?: string;
  className?: string;
}
export const EventProfitDrilldownPanel: React.FC<Props> = ({
  eventId,
  beoId,
  className = "",
}) => {
  const { breakdown, comparison, loading, error } =
    useEventProfitDrilldown(eventId);
  if (!eventId) {
    return (
      <Card className={className}>
        {" "}
        <CardHeader className="pb-3">
          {" "}
          <CardTitle className="text-sm">Event Profit Breakdown</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="text-xs text-muted-foreground">
            {" "}
            Select an event to view profit details.{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  if (loading) {
    return (
      <Card className={className}>
        {" "}
        <CardHeader className="pb-3">
          {" "}
          <CardTitle className="text-sm">Event Profit Breakdown</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="text-xs text-muted-foreground">Loading…</div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  if (error) {
    return (
      <Card className={className}>
        {" "}
        <CardHeader className="pb-3">
          {" "}
          <CardTitle className="text-sm">Event Profit Breakdown</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="flex gap-2 text-xs text-amber-600">
            {" "}
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{" "}
            <span>{error}</span>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  if (!breakdown) {
    return (
      <Card className={className}>
        {" "}
        <CardHeader className="pb-3">
          {" "}
          <CardTitle className="text-sm">Event Profit Breakdown</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="text-xs text-muted-foreground">
            {" "}
            No profit data available for this event.{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>
    );
  } // Determine status badge let statusBadge = { color:"bg-green-50", text:"text-green-700", label:"On Track" }; if (comparison?.status ==="warning") { statusBadge = { color:"bg-yellow-50", text:"text-yellow-700", label:"Warning" }; } else if (comparison?.status ==="critical") { statusBadge = { color:"bg-red-50", text:"text-red-700", label:"Critical" }; } return ( <Card className={className}> <CardHeader className="pb-3"> <div className="flex items-center justify-between"> <div> <CardTitle className="text-sm">Event Profit Breakdown</CardTitle> <CardDescription className="text-xs"> {breakdown.guestCount} guests • {breakdown.eventDate} </CardDescription> </div> {comparison && ( <Badge className={`${statusBadge.color} ${statusBadge.text} border-0`}> {statusBadge.label} </Badge> )} </div> </CardHeader> <CardContent className="space-y-4"> {/* Revenue vs COGS */} <div className="space-y-2"> <div className="flex justify-between items-center text-xs"> <span className="font-medium">Revenue</span> <span className="font-semibold"> {breakdown.currency} {breakdown.forecastRevenueTotal.toFixed(2)} </span> </div> <div className="flex justify-between items-center text-xs"> <span className="font-medium">Total COGS</span> <span className="font-semibold"> {breakdown.currency} {breakdown.totalCogs.toFixed(2)} </span> </div> <div className="flex justify-between items-center text-xs bg-blue-50 p-2 rounded"> <span className="font-semibold">Gross Margin</span> <span className="font-bold text-blue-700"> {breakdown.currency} {breakdown.forecastGrossMargin.toFixed(2)} </span> </div> <div className="flex justify-between items-center text-xs text-muted-foreground"> <span>Margin %</span> <span className="font-semibold text-foreground"> {breakdown.marginPercentage.toFixed(1)}% </span> </div> </div> <div className="border-t" /> {/* Cost Breakdown */} <div className="space-y-1.5"> <h4 className="text-xs font-semibold mb-2">Cost Allocation</h4> {breakdown.costs.map((cost) => ( <div key={cost.value} className="space-y-0.5"> <div className="flex justify-between items-center text-xs"> <span className="text-muted-foreground">{cost.name}</span> <span className="font-semibold"> {breakdown.currency} {cost.amount.toFixed(2)} </span> </div> <div className="flex items-center gap-1.5"> <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden"> <div className="h-full bg-slate-600" style={{ width: `${cost.percentageOfTotal}%` }} /> </div> <span className="text-[0.6rem] text-muted-foreground w-8 text-right"> {cost.percentageOfTotal.toFixed(0)}% </span> </div> </div> ))} </div> <div className="border-t" /> {/* Per Cover Metrics */} <div className="grid grid-cols-2 gap-2 text-xs"> <div className="border rounded p-2 bg-slate-50"> <div className="text-muted-foreground mb-0.5">COGS / Cover</div> <div className="font-semibold"> {breakdown.currency} {breakdown.cogsPerCover.toFixed(2)} </div> </div> <div className="border rounded p-2 bg-slate-50"> <div className="text-muted-foreground mb-0.5">Margin / Cover</div> <div className="font-semibold"> {breakdown.currency} {((breakdown.forecastGrossMargin) / breakdown.guestCount).toFixed(2)} </div> </div> </div> {/* Forecast vs Actual Comparison */} {comparison && ( <> <div className="border-t" /> <div className="space-y-1.5"> <h4 className="text-xs font-semibold">Forecast vs Actual</h4> {/* Revenue Variance */} <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded"> <span className="text-muted-foreground">Revenue Variance</span> <div className="flex items-center gap-1"> {comparison.variance.revenueVariance >= 0 ? ( <TrendingUp className="w-3 h-3 text-green-600" /> ) : ( <TrendingDown className="w-3 h-3 text-red-600" /> )} <span className={`font-semibold ${ comparison.variance.revenueVariance >= 0 ?"text-green-700" :"text-red-700" }`} > {comparison.variance.revenueVariance >= 0 ?"+" :""} {breakdown.currency} {comparison.variance.revenueVariance.toFixed(2)} </span> </div> </div> {/* Margin Variance */} <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded"> <span className="text-muted-foreground">Margin Variance</span> <div className="flex items-center gap-1"> {comparison.variance.marginVariance >= 0 ? ( <TrendingUp className="w-3 h-3 text-green-600" /> ) : ( <TrendingDown className="w-3 h-3 text-red-600" /> )} <span className={`font-semibold ${ comparison.variance.marginVariance >= 0 ?"text-green-700" :"text-red-700" }`} > {comparison.variance.marginVariance >= 0 ?"+" :""} {comparison.variance.marginVariance.toFixed(2)}% </span> </div> </div> </div> </> )} {/* Metadata */} <div className="text-[0.65rem] text-muted-foreground border-t pt-2 space-y-0.5"> {beoId && <div>BEO #{beoId}</div>} <div>Event #{breakdown.eventId}</div> <div>Last updated: {new Date(breakdown.lastUpdated).toLocaleString()}</div> </div> </CardContent> </Card> );
};
export default EventProfitDrilldownPanel;
