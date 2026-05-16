import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ProfitabilityForecastWidget({
  avgMarginPct,
  totalRevenue,
  totalCogs,
}: {
  avgMarginPct: number;
  totalRevenue: number;
  totalCogs: number;
}) {
  const marginStatus =
    avgMarginPct >= 0.35
      ? "Healthy"
      : avgMarginPct >= 0.2
        ? "Tight"
        : "At Risk";

  return (
    <Card className="border-border/40 bg-gradient-to-br from-background to-background/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-primary" />
          Deal Profitability
          <Badge
            variant={marginStatus === "At Risk" ? "destructive" : "secondary"}
            className="ml-auto"
          >
            {marginStatus}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-border/40 p-3">
          <div className="text-xs text-muted-foreground">Avg margin</div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-semibold">
              {(avgMarginPct * 100).toFixed(0)}%
            </div>
            {avgMarginPct >= 0.35 ? (
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-amber-500" />
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Revenue ${Math.round(totalRevenue).toLocaleString()} · COGS $
          {Math.round(totalCogs).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}
