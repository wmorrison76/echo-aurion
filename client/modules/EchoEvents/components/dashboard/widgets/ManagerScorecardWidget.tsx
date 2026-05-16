import { Crown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ManagerScorecardWidget({
  managers,
}: {
  managers: Array<{
    managerId: string;
    openPipelineValue: number;
    weightedPipelineValue: number;
    closeRate: number;
    overdueActions: number;
    stalledDeals: number;
  }>;
}) {
  const top = managers.slice(0, 3);

  return (
    <Card className="border-border/40 bg-gradient-to-br from-background to-background/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Crown className="h-4 w-4 text-primary" />
          Sales Manager Scorecards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {top.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            No manager data yet.
          </div>
        ) : (
          top.map((m) => (
            <div
              key={m.managerId}
              className="rounded-lg border border-border/40 p-3 flex items-center justify-between"
            >
              <div>
                <div className="text-sm font-semibold">{m.managerId}</div>
                <div className="text-xs text-muted-foreground">
                  Weighted pipeline: $
                  {Math.round(m.weightedPipelineValue).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  {(m.closeRate * 100).toFixed(0)}% close
                </div>
                <Badge
                  variant={m.overdueActions > 0 ? "destructive" : "secondary"}
                >
                  {m.overdueActions} overdue
                </Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
