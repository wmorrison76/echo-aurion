import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function NextActionSlaWidget({
  summary,
}: {
  summary: { total: number; overdue: number; due: number };
}) {
  const status =
    summary.overdue > 0 ? "At Risk" : summary.due > 0 ? "On Track" : "Clear";

  return (
    <Card className="border-border/40 bg-gradient-to-br from-background to-background/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CalendarClock className="h-4 w-4 text-primary" />
          Next‑Action SLA
          <Badge
            variant={summary.overdue > 0 ? "destructive" : "secondary"}
            className="ml-auto"
          >
            {status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg border border-border/40 p-2">
            <div className="text-muted-foreground">Total</div>
            <div className="text-lg font-semibold">{summary.total}</div>
          </div>
          <div className="rounded-lg border border-border/40 p-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Overdue
            </div>
            <div className="text-lg font-semibold">{summary.overdue}</div>
          </div>
          <div className="rounded-lg border border-border/40 p-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Due
            </div>
            <div className="text-lg font-semibold">{summary.due}</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          SLA enforces a next step on every deal. Overdue items auto‑escalate.
        </p>
      </CardContent>
    </Card>
  );
}
