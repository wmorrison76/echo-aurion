/**
 * Trace Drawer Component
 * Universal explainability panel for all derived values
 * Genesis F + H compliance
 *
 * Shows: Origin, Assumptions, Math, Dependencies, Change History
 */

import React from "react";
import {
  X,
  Info,
  Calculator,
  Link2,
  History,
  AlertCircle,
  CheckCircle,
  Clock,
  Package,
} from "lucide-react";
import type { TraceEntry, TraceChange } from "../types/genesis-integration";
import { cn } from "@/lib/glass";

interface TraceDrawerProps {
  trace: TraceEntry;
  onClose: () => void;
  isOpen: boolean;
}

export function TraceDrawer({ trace, onClose, isOpen }: TraceDrawerProps) {
  if (!isOpen) return null;

  const getOriginIcon = (source: string) => {
    switch (source) {
      case "recipe":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "manual":
        return <Info className="w-4 h-4 text-blue-600" />;
      case "package":
        return <Package className="w-4 h-4 text-purple-600" />;
      case "transfer":
        return <Link2 className="w-4 h-4 text-orange-600" />;
      case "calculation":
        return <Calculator className="w-4 h-4 text-amber-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-background border-l border-border shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/20">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Trace Details
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-background/60 transition-colors"
          title="Close"
        >
          <X className="w-5 h-5 text-foreground/60" />
        </button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Origin */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
            {getOriginIcon(trace.origin.source)}
            Origin
          </h3>
          <div className="rounded-lg border border-border/20 bg-background/40 p-3">
            <p className="text-sm text-foreground/80 mb-1">
              <span className="font-medium">Source:</span> {trace.origin.source}
            </p>
            {trace.origin.sourceId && (
              <p className="text-xs text-foreground/60">
                {trace.origin.sourceType}: {trace.origin.sourceId}
              </p>
            )}
          </div>
        </section>

        {/* Assumptions */}
        {Object.keys(trace.assumptions).length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Assumptions
            </h3>
            <div className="space-y-2">
              {trace.assumptions.portionSize !== undefined && (
                <div className="rounded-lg border border-border/20 bg-background/40 p-3">
                  <p className="text-xs text-foreground/60 mb-1">
                    Portion Size
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {trace.assumptions.portionSize} oz
                  </p>
                </div>
              )}
              {trace.assumptions.yield !== undefined && (
                <div className="rounded-lg border border-border/20 bg-background/40 p-3">
                  <p className="text-xs text-foreground/60 mb-1">Yield Loss</p>
                  <p className="text-sm font-medium text-foreground">
                    {trace.assumptions.yield}%
                  </p>
                </div>
              )}
              {trace.assumptions.routing && (
                <div className="rounded-lg border border-border/20 bg-background/40 p-3">
                  <p className="text-xs text-foreground/60 mb-1">
                    Production Routing
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {trace.assumptions.routing.nodeId}
                  </p>
                  <p className="text-xs text-foreground/60 mt-1">
                    {trace.assumptions.routing.reason}
                  </p>
                </div>
              )}
              {trace.assumptions.vendorMatch && (
                <div className="rounded-lg border border-border/20 bg-background/40 p-3">
                  <p className="text-xs text-foreground/60 mb-1">
                    Vendor Match
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {trace.assumptions.vendorMatch.vendorId}
                  </p>
                  <p className="text-xs text-foreground/60 mt-1">
                    {trace.assumptions.vendorMatch.reason}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Math Breakdown */}
        {trace.calculation && (
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
              <Calculator className="w-4 h-4 text-blue-600" />
              Calculation
            </h3>
            <div className="rounded-lg border border-border/20 bg-background/40 p-3 space-y-2">
              <div>
                <p className="text-xs text-foreground/60 mb-1">Formula</p>
                <code className="text-sm text-foreground font-mono">
                  {trace.calculation.formula}
                </code>
              </div>
              <div>
                <p className="text-xs text-foreground/60 mb-1">Inputs</p>
                <div className="space-y-1">
                  {Object.entries(trace.calculation.inputs).map(
                    ([key, value]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-foreground/60">{key}:</span>
                        <span className="text-foreground font-medium">
                          {value}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-border/20">
                <p className="text-xs text-foreground/60 mb-1">Result</p>
                <p className="text-lg font-bold text-foreground">
                  {trace.calculation.result}
                </p>
              </div>
              {trace.calculation.steps &&
                trace.calculation.steps.length > 0 && (
                  <div className="pt-2 border-t border-border/20">
                    <p className="text-xs text-foreground/60 mb-1">Steps</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-foreground/80">
                      {trace.calculation.steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
            </div>
          </section>
        )}

        {/* Dependencies */}
        {(trace.dependencies.affectsBEODs?.length ||
          trace.dependencies.affectsRecipes?.length ||
          trace.dependencies.affectsOrders?.length ||
          trace.dependencies.affectsTimeline) && (
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
              <Link2 className="w-4 h-4 text-purple-600" />
              Dependencies
            </h3>
            <div className="rounded-lg border border-border/20 bg-background/40 p-3 space-y-2">
              {trace.dependencies.affectsBEODs &&
                trace.dependencies.affectsBEODs.length > 0 && (
                  <div>
                    <p className="text-xs text-foreground/60 mb-1">
                      Affects BEOs
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {trace.dependencies.affectsBEODs.map((beoId) => (
                        <span
                          key={beoId}
                          className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs"
                        >
                          {beoId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              {trace.dependencies.affectsRecipes &&
                trace.dependencies.affectsRecipes.length > 0 && (
                  <div>
                    <p className="text-xs text-foreground/60 mb-1">
                      Affects Recipes
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {trace.dependencies.affectsRecipes.map((recipeId) => (
                        <span
                          key={recipeId}
                          className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-xs"
                        >
                          {recipeId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              {trace.dependencies.affectsOrders &&
                trace.dependencies.affectsOrders.length > 0 && (
                  <div>
                    <p className="text-xs text-foreground/60 mb-1">
                      Affects Orders
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {trace.dependencies.affectsOrders.map((orderId) => (
                        <span
                          key={orderId}
                          className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 text-xs"
                        >
                          {orderId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              {trace.dependencies.affectsTimeline && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <p className="text-xs text-foreground/80">
                    Affects Production Timeline
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Change History */}
        {trace.changeHistory.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
              <History className="w-4 h-4 text-gray-600" />
              Change History
            </h3>
            <div className="space-y-2">
              {trace.changeHistory.map((change) => (
                <div
                  key={change.id}
                  className="rounded-lg border border-border/20 bg-background/40 p-3"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          change.changeType === "created" &&
                            "bg-green-500/10 text-green-600",
                          change.changeType === "updated" &&
                            "bg-blue-500/10 text-blue-600",
                          change.changeType === "deleted" &&
                            "bg-red-500/10 text-red-600",
                          change.changeType === "calculated" &&
                            "bg-purple-500/10 text-purple-600",
                        )}
                      >
                        {change.changeType}
                      </span>
                      {change.actorName && (
                        <span className="text-xs text-foreground/60">
                          by {change.actorName}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-foreground/60">
                      {formatTimestamp(change.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 mb-1">
                    {change.changeDescription}
                  </p>
                  {change.impact && change.impact.length > 0 && (
                    <p className="text-xs text-foreground/60">
                      Impact: {change.impact.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default TraceDrawer;
