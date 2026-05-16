import React from "react";
import type { AdvisoryMessage } from "@/../shared/types/advisory";
import { osBus } from "@/lib/os-bus";
import { listAdvisoriesForBeo } from "@/lib/advisory-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
} from "lucide-react";

interface AdvisoryHistoryPanelProps {
  beoId?: string;
}

export default function AdvisoryHistoryPanel({
  beoId,
}: AdvisoryHistoryPanelProps) {
  const [advisories, setAdvisories] = React.useState<AdvisoryMessage[]>([]);
  const [selectedAdvisory, setSelectedAdvisory] =
    React.useState<AdvisoryMessage | null>(null);

  // Load advisories when beoId changes
  React.useEffect(() => {
    if (!beoId) {
      setAdvisories([]);
      return;
    }

    const loaded = listAdvisoriesForBeo(beoId);
    setAdvisories(loaded);

    // Listen for new advisories
    const unsubscribe = osBus.on("echo:advisory_generated", (payload) => {
      if (payload.beoId === beoId) {
        const updated = listAdvisoriesForBeo(beoId);
        setAdvisories(updated);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [beoId]);

  const getSeverityBadgeColor = (severity: "info" | "warning" | "critical") => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "warning":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getSeverityIcon = (severity: "info" | "warning" | "critical") => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-4 w-4" />;
      case "warning":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const handleOpenAdvisory = (advisory: AdvisoryMessage) => {
    setSelectedAdvisory(advisory);
    osBus.emit("ui:open_panel", {
      panelKey: "echo-advisory",
      payload: { advisoryId: advisory.advisoryId, beoId: advisory.beoId },
      focus: true,
    });
  };

  if (!beoId) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-3 h-6 w-6 text-slate-400" />
          <p className="text-sm text-slate-500">No BEO selected.</p>
        </div>
      </div>
    );
  }

  if (advisories.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-center">
          <Lightbulb className="mx-auto mb-3 h-6 w-6 text-slate-400" />
          <p className="text-sm text-slate-500">
            No advisories yet for this BEO.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Advisories are generated when the BEO is revised.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/30 p-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground text-sm">
            Advisory History
          </h3>
          <p className="text-xs text-foreground/60">
            {advisories.length}{" "}
            {advisories.length === 1 ? "advisory" : "advisories"}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Card className="border-0 shadow-none bg-transparent rounded-none h-full">
          <CardContent className="p-3">
            <div className="space-y-2">
              {advisories.map((advisory) => (
                <button
                  key={advisory.advisoryId}
                  onClick={() => handleOpenAdvisory(advisory)}
                  className={`w-full text-left rounded-lg border transition-colors p-3 ${
                    selectedAdvisory?.advisoryId === advisory.advisoryId
                      ? "border-primary bg-primary/5"
                      : "border-border/20 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="text-foreground/60 flex-shrink-0">
                        {getSeverityIcon(advisory.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-foreground truncate">
                          {advisory.title}
                        </h4>
                        <p className="text-xs text-foreground/60 mt-0.5">
                          Rev {advisory.revision}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        getSeverityBadgeColor(advisory.severity) as
                          | "destructive"
                          | "secondary"
                          | "outline"
                          | "default"
                      }
                      className="flex-shrink-0 text-xs"
                    >
                      {advisory.severity}
                    </Badge>
                  </div>

                  {/* Impact Summary */}
                  <div className="text-xs text-foreground/70 space-y-1 mb-2">
                    {advisory.impacts.foodCostDelta !== undefined && (
                      <div>
                        Food Cost:{" "}
                        <span
                          className={
                            advisory.impacts.foodCostDelta > 0
                              ? "text-red-600"
                              : "text-emerald-600"
                          }
                        >
                          {advisory.impacts.foodCostDelta > 0 ? "+" : ""}$
                          {advisory.impacts.foodCostDelta.toFixed(0)}
                        </span>
                      </div>
                    )}
                    {advisory.impacts.laborStaffDelta !== undefined && (
                      <div>
                        Staffing:{" "}
                        <span
                          className={
                            advisory.impacts.laborStaffDelta > 0
                              ? "text-orange-600"
                              : "text-blue-600"
                          }
                        >
                          {advisory.impacts.laborStaffDelta > 0 ? "+" : ""}
                          {advisory.impacts.laborStaffDelta}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Generated Time */}
                  <div className="text-xs text-foreground/50 flex items-center justify-between">
                    <span>
                      {new Date(advisory.generatedAt).toLocaleTimeString(
                        "en-US",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
