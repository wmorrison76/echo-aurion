import { Coins, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function CommissionMiniPanel({
  totalRevenue,
  totalCommission,
  entryCount,
}: {
  totalRevenue: number;
  totalCommission: number;
  entryCount: number;
}) {
  const rate = totalRevenue > 0 ? totalCommission / totalRevenue : 0;

  return (
    <Card className="border-border/40 bg-gradient-to-br from-background to-background/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Coins className="h-4 w-4 text-primary" />
          Commission Tracker
          <Badge variant="secondary" className="ml-auto">
            {entryCount} deals
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-border/40 p-3">
          <div className="text-xs text-muted-foreground">Total commission</div>
          <div className="text-2xl font-semibold">
            ${Math.round(totalCommission).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3 text-emerald-500" />
          {Math.round(rate * 1000) / 10}% effective rate on $
          {Math.round(totalRevenue).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}
