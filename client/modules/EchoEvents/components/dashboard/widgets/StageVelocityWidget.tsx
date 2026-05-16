import { Activity, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function StageVelocityWidget({
  stalled,
  stallDays,
  averageDays,
}: {
  stalled: number;
  stallDays: number;
  averageDays: number;
}) {
  return (
    <Card className="border-border/40 bg-gradient-to-br from-background to-background/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4 text-primary" />
          Stage Velocity
          <Badge
            variant={stalled > 0 ? "destructive" : "secondary"}
            className="ml-auto"
          >
            {stalled > 0 ? `${stalled} stalled` : "Healthy"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-border/40 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Timer className="h-3 w-3" />
            Avg days in stage
          </div>
          <div className="text-2xl font-semibold">
            {averageDays.toFixed(1)} days
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Alerts trigger when a deal exceeds {stallDays} days in the current
          stage.
        </p>
      </CardContent>
    </Card>
  );
}
