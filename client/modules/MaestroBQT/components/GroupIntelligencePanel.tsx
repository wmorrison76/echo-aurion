import React from "react";
import type { GroupIntelligenceSnapshot } from "@/../shared/types/group-intelligence";
import { osBus } from "@/lib/os-bus";
import {
  listGroupSnapshots,
  getGroupSnapshot,
} from "@/lib/group-intelligence-store";
import { listGroups } from "@/lib/group-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  DollarSign,
  Users,
  Clock,
  Utensils,
  ChevronDown,
} from "lucide-react";

interface GroupIntelligencePanelProps {
  groupId?: string;
}

export default function GroupIntelligencePanel({
  groupId: initialGroupId,
}: GroupIntelligencePanelProps) {
  const [snapshots, setSnapshots] = React.useState<GroupIntelligenceSnapshot[]>(
    [],
  );
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(
    initialGroupId ?? null,
  );
  const [currentSnapshot, setCurrentSnapshot] =
    React.useState<GroupIntelligenceSnapshot | null>(null);
  const [groups] = React.useState(() => listGroups());

  // Load snapshots on mount and listen for updates
  React.useEffect(() => {
    const loaded = listGroupSnapshots();
    setSnapshots(loaded);

    if (!selectedGroupId && loaded.length > 0) {
      setSelectedGroupId(loaded[0].groupId);
    }

    const unsubscribe = osBus.on("group:intelligence_generated", (payload) => {
      const updated = listGroupSnapshots();
      setSnapshots(updated);

      if (!selectedGroupId) {
        setSelectedGroupId(payload.groupId);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Load current snapshot when selectedGroupId changes
  React.useEffect(() => {
    if (!selectedGroupId) {
      setCurrentSnapshot(null);
      return;
    }

    const snapshot = getGroupSnapshot(selectedGroupId);
    setCurrentSnapshot(snapshot);
  }, [selectedGroupId]);

  if (snapshots.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-slate-400" />
          <p className="text-sm text-slate-500">No group intelligence yet.</p>
          <p className="text-xs text-slate-400 mt-2">
            Generate BEOs for a group to see consolidated insights.
          </p>
        </div>
      </div>
    );
  }

  if (!currentSnapshot) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-slate-400" />
          <p className="text-sm text-slate-500">Select a group.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/30 p-4 space-y-3">
        {/* Group Selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Group Intelligence
          </h2>
          <select
            value={selectedGroupId || ""}
            onChange={(e) => setSelectedGroupId(e.target.value || null)}
            className="px-3 py-1.5 rounded-md border border-border bg-background text-sm text-foreground"
          >
            <option value="">Select Group...</option>
            {snapshots.map((snap) => (
              <option key={snap.groupId} value={snap.groupId}>
                {snap.groupName}
              </option>
            ))}
          </select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          {/* Total Cost */}
          <Card className="border-0 shadow-none bg-muted/40">
            <CardContent className="pt-4 pb-3 px-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground/60 uppercase">
                  Total Cost
                </span>
                <DollarSign className="h-3.5 w-3.5 text-foreground/40" />
              </div>
              <div className="text-lg font-bold text-foreground">
                ${currentSnapshot.purchasePlan.totalCost.toFixed(2)}
              </div>
              <p className="text-xs text-foreground/50 mt-1">
                {currentSnapshot.purchasePlan.lines.length} ingredients
              </p>
            </CardContent>
          </Card>

          {/* Total Hours */}
          <Card className="border-0 shadow-none bg-muted/40">
            <CardContent className="pt-4 pb-3 px-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground/60 uppercase">
                  Total Hours
                </span>
                <Clock className="h-3.5 w-3.5 text-foreground/40" />
              </div>
              <div className="text-lg font-bold text-foreground">
                {currentSnapshot.laborPlan.totalHours.toFixed(1)}h
              </div>
              <p className="text-xs text-foreground/50 mt-1">
                Across all stations
              </p>
            </CardContent>
          </Card>

          {/* Peak Staff */}
          <Card className="border-0 shadow-none bg-muted/40">
            <CardContent className="pt-4 pb-3 px-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground/60 uppercase">
                  Peak Staff
                </span>
                <Users className="h-3.5 w-3.5 text-foreground/40" />
              </div>
              <div className="text-lg font-bold text-foreground">
                {currentSnapshot.laborPlan.totalStaff}
              </div>
              <p className="text-xs text-foreground/50 mt-1">Max concurrent</p>
            </CardContent>
          </Card>
        </div>

        {/* Events Count */}
        <div className="text-xs text-foreground/60 flex items-center gap-2">
          <Utensils className="h-3.5 w-3.5" />
          <span>
            {currentSnapshot.events.length}{" "}
            {currentSnapshot.events.length === 1 ? "event" : "events"}
          </span>
          <span className="text-foreground/40">•</span>
          <span>
            Generated{" "}
            {new Date(currentSnapshot.generatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* Content - Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="purchasing" className="h-full flex flex-col">
          <TabsList className="h-auto w-full justify-start rounded-none border-b border-border/30 bg-transparent p-0 px-4">
            <TabsTrigger
              value="purchasing"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Purchasing Rollup
            </TabsTrigger>
            <TabsTrigger
              value="labor"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Labor Rollup
            </TabsTrigger>
          </TabsList>

          {/* Purchasing Tab */}
          <TabsContent
            value="purchasing"
            className="flex-1 overflow-auto border-0 p-4"
          >
            {currentSnapshot.purchasePlan.lines.length > 0 ? (
              <div className="space-y-2">
                {currentSnapshot.purchasePlan.lines.map((line) => (
                  <div
                    key={line.ingredientId}
                    className="rounded-lg border border-border/20 bg-muted/30 p-3"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-foreground">
                          {line.ingredientName}
                        </h4>
                        <p className="text-xs text-foreground/60 mt-0.5">
                          {line.requiredQuantity.toFixed(1)} {line.unit}{" "}
                          required
                        </p>
                      </div>
                      <div className="text-right">
                        {line.optimized ? (
                          <div>
                            <Badge variant="outline" className="text-xs">
                              {line.optimized.vendorName}
                            </Badge>
                            <p className="text-xs font-semibold text-foreground mt-1">
                              ${line.optimized.totalCost.toFixed(2)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-foreground/50">
                            No vendor
                          </span>
                        )}
                      </div>
                    </div>

                    {line.sources.length > 0 && (
                      <div className="text-xs text-foreground/50 pt-2 border-t border-border/10">
                        <span>{line.sources.length} source(s)</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-foreground/60">
                No purchase lines.
              </div>
            )}
          </TabsContent>

          {/* Labor Tab */}
          <TabsContent
            value="labor"
            className="flex-1 overflow-auto border-0 p-4"
          >
            {currentSnapshot.laborPlan.lines.length > 0 ? (
              <div className="space-y-2">
                {currentSnapshot.laborPlan.lines.map((line, idx) => (
                  <div
                    key={`${line.station}:${line.day}:${idx}`}
                    className="rounded-lg border border-border/20 bg-muted/30 p-3"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm text-foreground">
                            {line.station} Kitchen
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {line.day}
                          </Badge>
                        </div>
                        <p className="text-xs text-foreground/60 mt-1">
                          {line.requiredHours.toFixed(1)} hours required
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-foreground">
                          {line.requiredStaff}
                        </div>
                        <p className="text-xs text-foreground/50">
                          staff needed
                        </p>
                      </div>
                    </div>

                    {line.sources.length > 0 && (
                      <div className="text-xs text-foreground/50 pt-2 border-t border-border/10">
                        <span>{line.sources.length} event(s)</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-foreground/60">
                No labor lines.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
