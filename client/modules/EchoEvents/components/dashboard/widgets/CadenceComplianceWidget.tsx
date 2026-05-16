import { Repeat, ShieldCheck, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function CadenceComplianceWidget({
  compliancePct,
  cadenceDays,
  total,
}: {
  compliancePct: number;
  cadenceDays: number;
  total: number;
}) {
  const status =
    compliancePct >= 85 ? "Healthy" : compliancePct >= 70 ? "Watch" : "At Risk";

  return (
    <Card className="border-border/40 bg-gradient-to-br from-background to-background/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Repeat className="h-4 w-4 text-primary" />
          Touch Cadence
          <Badge
            variant={status === "At Risk" ? "destructive" : "secondary"}
            className="ml-auto"
          >
            {status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-border/40 p-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Compliance</div>
            <div className="text-2xl font-semibold">
              {compliancePct.toFixed(0)}%
            </div>
          </div>
          {compliancePct >= 85 ? (
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
          ) : (
            <ShieldAlert className="h-6 w-6 text-amber-500" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {total} prospects checked against a {cadenceDays}-day cadence rule.
        </p>
      </CardContent>
    </Card>
  );
}
