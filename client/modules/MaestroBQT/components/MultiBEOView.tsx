/**
 * Multi-BEO View Component
 * Visual management of multiple BEOs happening simultaneously
 * Shows conflicts, dependencies, and resource sharing
 */

import React from "react";
import {
  FileText,
  Calendar,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Link2,
  TrendingUp,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GenesisBEO } from "../types/genesis-integration";

interface MultiBEOViewProps {
  beos: GenesisBEO[];
  onSelectBEO?: (beoId: string) => void;
  onOpenBuilder?: (beoId?: string) => void;
}

export function MultiBEOView({
  beos,
  onSelectBEO,
  onOpenBuilder,
}: MultiBEOViewProps) {
  const [selectedBEODs, setSelectedBEODs] = React.useState<Set<string>>(
    new Set(),
  );
  const [groupBy, setGroupBy] = React.useState<"date" | "status" | "event">(
    "date",
  );

  // Calculate aggregate stats
  const stats = React.useMemo(() => {
    const totalGuests = beos.reduce((sum, beo) => {
      // Would need to get guest count from event
      return sum;
    }, 0);

    return {
      totalBEODs: beos.length,
      totalGuests,
      activeBEODs: beos.filter(
        (b) => b.status === "definite" || b.status === "executing",
      ).length,
      draftBEODs: beos.filter((b) => b.status === "draft").length,
    };
  }, [beos]);

  // Group BEOs
  const groupedBEODs = React.useMemo(() => {
    if (groupBy === "date") {
      const groups: Record<string, GenesisBEO[]> = {};
      beos.forEach((beo) => {
        const date = new Date(beo.createdAt).toLocaleDateString();
        if (!groups[date]) groups[date] = [];
        groups[date].push(beo);
      });
      return groups;
    } else if (groupBy === "status") {
      const groups: Record<string, GenesisBEO[]> = {};
      beos.forEach((beo) => {
        if (!groups[beo.status]) groups[beo.status] = [];
        groups[beo.status].push(beo);
      });
      return groups;
    } else {
      const groups: Record<string, GenesisBEO[]> = {};
      beos.forEach((beo) => {
        const key = beo.eventId || "unassigned";
        if (!groups[key]) groups[key] = [];
        groups[key].push(beo);
      });
      return groups;
    }
  }, [beos, groupBy]);

  const getStatusColor = (status: GenesisBEO["status"]) => {
    switch (status) {
      case "draft":
        return "bg-gray-500/10 text-gray-700 border-gray-500/30";
      case "tentative":
        return "bg-amber-500/10 text-amber-700 border-amber-500/30";
      case "definite":
        return "bg-blue-500/10 text-blue-700 border-blue-500/30";
      case "executing":
        return "bg-green-500/10 text-green-700 border-green-500/30";
      case "closed":
        return "bg-slate-500/10 text-slate-700 border-slate-500/30";
    }
  };

  const toggleSelection = (beoId: string) => {
    setSelectedBEODs((prev) => {
      const next = new Set(prev);
      if (next.has(beoId)) {
        next.delete(beoId);
      } else {
        next.add(beoId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-border/20 bg-background/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground/60 mb-1">Total BEOs</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalBEODs}
                </p>
              </div>
              <FileText className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/20 bg-background/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground/60 mb-1">Active BEOs</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.activeBEODs}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/20 bg-background/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground/60 mb-1">Draft BEOs</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.draftBEODs}
                </p>
              </div>
              <Clock className="w-8 h-8 text-amber-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/20 bg-background/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground/60 mb-1">Selected</p>
                <p className="text-2xl font-bold text-foreground">
                  {selectedBEODs.size}
                </p>
              </div>
              <Link2 className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Group By Controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground/60">Group by:</span>
        <Button
          variant={groupBy === "date" ? "default" : "outline"}
          size="sm"
          onClick={() => setGroupBy("date")}
        >
          Date
        </Button>
        <Button
          variant={groupBy === "status" ? "default" : "outline"}
          size="sm"
          onClick={() => setGroupBy("status")}
        >
          Status
        </Button>
        <Button
          variant={groupBy === "event" ? "default" : "outline"}
          size="sm"
          onClick={() => setGroupBy("event")}
        >
          Event
        </Button>
        {selectedBEODs.size > 0 && (
          <Button
            variant="default"
            size="sm"
            className="ml-auto"
            onClick={() => onOpenBuilder?.()}
          >
            Create Combined BEO
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => onOpenBuilder?.()}>
          <FileText className="w-4 h-4 mr-2" />
          New BEO
        </Button>
      </div>

      {/* Grouped BEOs */}
      <div className="space-y-6">
        {Object.entries(groupedBEODs).map(([groupKey, groupBeos]) => (
          <Card key={groupKey} className="border-border/20 bg-background/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground capitalize">
                {groupBy === "date" && `Events on ${groupKey}`}
                {groupBy === "status" &&
                  `${groupKey.charAt(0).toUpperCase() + groupKey.slice(1)} BEOs`}
                {groupBy === "event" && `Event: ${groupKey}`}
                <Badge variant="outline" className="ml-2">
                  {groupBeos.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupBeos.map((beo) => {
                  const isSelected = selectedBEODs.has(beo.id);

                  return (
                    <div
                      key={beo.id}
                      onClick={() => {
                        toggleSelection(beo.id);
                        onSelectBEO?.(beo.id);
                      }}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer transition-all",
                        getStatusColor(beo.status),
                        isSelected && "ring-2 ring-primary shadow-lg",
                        "hover:shadow-md",
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span className="font-semibold text-sm">
                            BEO #{beo.id.slice(-6)}
                          </span>
                        </div>
                        <Badge
                          className={cn("text-xs", getStatusColor(beo.status))}
                        >
                          {beo.status}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs text-foreground/70">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {new Date(beo.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Event: {beo.eventId.slice(-6)}</span>
                        </div>
                      </div>
                      {beo.functions && beo.functions.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/20">
                          <p className="text-xs text-foreground/60">
                            {beo.functions.length} function
                            {beo.functions.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conflicts Warning */}
      {beos.length > 1 && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-1">
                  Multiple BEOs Active
                </p>
                <p className="text-xs text-foreground/70">
                  Review production timeline and resource allocation to avoid
                  conflicts. Use the Production Timeline view to see lane-based
                  scheduling.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MultiBEOView;
