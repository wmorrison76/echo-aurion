import React, { useState, useEffect, useCallback } from "react";
import { PanelEmbed as PanelEmbedType, DrillDownSnapshot } from "./types";
import {
  ChevronUp,
  ChevronDown,
  X,
  Maximize2,
  Minimize2,
  RefreshCw,
  TrendingUp,
  Share2,
  Monitor,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";

interface EmbeddedPanelProps {
  embed: PanelEmbedType;
  onUpdate?: (embed: PanelEmbedType) => void;
  onRemove?: (id: string) => void;
  onShareDesktop?: (embedId: string) => void;
  onShareWithGroup?: (embedId: string) => void;
  onResizeStart?: (edge: string, e: React.MouseEvent) => void;
  onFullscreen?: (isFullscreen: boolean) => void;
  isFullscreen?: boolean;
  readOnly?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

interface DrillDownLevel {
  level: number;
  title: string;
  breadcrumb: string[];
  metrics: Array<{
    name: string;
    value: string | number;
    trend?: "up" | "down" | "flat";
    change?: number;
  }>;
  children?: Array<{ id: string; name: string; value: string | number }>;
}

const DRILL_DOWN_LEVELS: Record<number, string> = {
  1: "Overview",
  2: "Categories",
  3: "Details",
  4: "Users",
  5: "Transactions",
};

function humanFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / Math.pow(1024, i);
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[i]}`;
}

/** * Renders widget content based on type */
const renderWidgetContent = (embed: PanelEmbedType): React.ReactNode => {
  const widgetType = embed.widgetType;
  if (!widgetType) return null;
  switch (widgetType) {
    case "revenue":
      return (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-foreground/60">Today&apos;s Revenue</span>
            <span className="font-semibold text-green-500">$4,283</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/60">Weekly Total</span>
            <span className="font-semibold">$28,450</span>
          </div>
          <div className="mt-3 h-20 bg-primary/10 rounded border border-border/30 flex items-center justify-center text-xs text-foreground/40">
            📊 Revenue Chart
          </div>
        </div>
      );
    case "labor-cost":
      return (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-foreground/60">Labor Hours</span>
            <span className="font-semibold">124 hrs</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/60">Cost</span>
            <span className="font-semibold text-orange-500">$3,720</span>
          </div>
          <div className="mt-3 h-20 bg-orange-500/10 rounded border border-border/30 flex items-center justify-center text-xs text-foreground/40">
            💼 Labor Analytics
          </div>
        </div>
      );
    case "occupancy":
      return (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-foreground/60">Current Occupancy</span>
            <span className="font-semibold">85%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/60">Available Tables</span>
            <span className="font-semibold">12</span>
          </div>
          <div className="mt-3 h-20 bg-blue-500/10 rounded border border-border/30 flex items-center justify-center text-xs text-foreground/40">
            🪑 Seat Map
          </div>
        </div>
      );
    default:
      return (
        <div className="p-4 text-center text-xs text-muted-foreground italic">
          No data available for {widgetType}
        </div>
      );
  }
};

/** * Embedded Panel Widget */
export const PanelEmbedWidget: React.FC<EmbeddedPanelProps> = ({
  embed,
  onUpdate,
  onRemove,
  onShareDesktop,
  onShareWithGroup,
  onResizeStart,
  onFullscreen,
  isFullscreen = false,
  readOnly = false,
  isSelected = false,
  onSelect,
}) => {
  const [currentLevel, setCurrentLevel] = useState(embed.drillDownLevel || 1);
  const [drillDownPath, setDrillDownPath] = useState<string[]>([]);
  const [drillDownData, setDrillDownData] = useState<DrillDownLevel | null>(
    null,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // Show widget content instead of drill-down if widget type is available
  const showWidgetContent = !!embed.widgetType;

  // Simulate drill-down data
  const generateDrillDownData = useCallback(
    (level: number, path: string[]): DrillDownLevel => {
      return {
        level,
        title: DRILL_DOWN_LEVELS[level] || "Details",
        breadcrumb: path,
        metrics: [
          {
            name: "Total",
            value: "$125,430",
            trend: "up",
            change: 12.5,
          },
          { name: "Count", value: 1240, trend: "up", change: 8.2 },
          { name: "Average", value: "$101.13", trend: "flat", change: 0 },
        ],
        children:
          level < 5
            ? [
                { id: "sub-1", name: "Category A", value: "$42,150" },
                { id: "sub-2", name: "Category B", value: "$65,280" },
                { id: "sub-3", name: "Category C", value: "$18,000" },
              ]
            : undefined,
      };
    },
    [],
  );

  useEffect(() => {
    setDrillDownData(generateDrillDownData(currentLevel, drillDownPath));
  }, [currentLevel, drillDownPath, generateDrillDownData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdate(Date.now());
    }, 1000);
  };

  const handleDrillDown = (childId: string, childName: string) => {
    if (currentLevel < 5) {
      const nextLevel = currentLevel + 1;
      const nextPath = [...drillDownPath, childName];
      setCurrentLevel(nextLevel);
      setDrillDownPath(nextPath);
      onUpdate?.({
        ...embed,
        drillDownLevel: nextLevel,
      });
    }
  };

  const handleGoBack = () => {
    if (currentLevel > 1) {
      const nextLevel = currentLevel - 1;
      const nextPath = drillDownPath.slice(0, -1);
      setCurrentLevel(nextLevel);
      setDrillDownPath(nextPath);
      onUpdate?.({
        ...embed,
        drillDownLevel: nextLevel,
      });
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden",
        isSelected && "ring-2 ring-primary",
        isFullscreen ? "fixed inset-4 z-[100]" : "w-full h-full",
      )}
      onClick={() => onSelect?.(embed.id)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-1 bg-primary/10 rounded text-primary">
            {embed.widgetIcon ? (
              <span className="text-sm">{embed.widgetIcon}</span>
            ) : (
              <Monitor size={14} />
            )}
          </div>
          <span className="text-xs font-semibold truncate">
            {embed.widgetTitle || embed.panelId}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className={cn(
              "p-1 hover:bg-muted rounded text-muted-foreground",
              isRefreshing && "animate-spin",
            )}
          >
            <RefreshCw size={12} />
          </button>
          {!readOnly && (
            <button
              onClick={() => onRemove?.(embed.id)}
              className="p-1 hover:bg-destructive/10 hover:text-destructive rounded text-muted-foreground"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {showWidgetContent ? (
          renderWidgetContent(embed)
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {currentLevel > 1 && (
                  <button
                    onClick={handleGoBack}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <ChevronUp size={12} className="-rotate-90" />
                  </button>
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {DRILL_DOWN_LEVELS[currentLevel]}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                Updated {new Date(lastUpdate).toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {drillDownData?.metrics.map((metric, i) => (
                <div key={i} className="p-2 rounded bg-muted/30 border">
                  <p className="text-[10px] text-muted-foreground">
                    {metric.name}
                  </p>
                  <p className="text-sm font-bold">{metric.value}</p>
                  {metric.change !== undefined && (
                    <div
                      className={cn(
                        "flex items-center gap-0.5 text-[9px] font-medium",
                        metric.trend === "up"
                          ? "text-green-500"
                          : metric.trend === "down"
                            ? "text-red-500"
                            : "text-muted-foreground",
                      )}
                    >
                      <TrendingUp
                        size={8}
                        className={metric.trend === "down" ? "rotate-180" : ""}
                      />
                      {metric.change}%
                    </div>
                  )}
                </div>
              ))}
            </div>

            {drillDownData?.children && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground">
                  DRILL DOWN
                </p>
                <div className="space-y-1">
                  {drillDownData.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => handleDrillDown(child.id, child.name)}
                      className="w-full flex items-center justify-between p-2 rounded hover:bg-muted text-xs transition-colors"
                    >
                      <span>{child.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{child.value}</span>
                        <ChevronDown size={12} className="-rotate-90" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t bg-muted/30 flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex gap-2">
          <button
            onClick={() => onShareDesktop?.(embed.id)}
            className="hover:text-primary flex items-center gap-1"
          >
            <Share2 size={10} /> Share
          </button>
          <button
            onClick={() => onShareWithGroup?.(embed.id)}
            className="hover:text-primary flex items-center gap-1"
          >
            <Users size={10} /> Group
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onFullscreen?.(!isFullscreen)}
            className="hover:text-primary"
          >
            {isFullscreen ? <Minimize2 size={10} /> : <Maximize2 size={10} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PanelEmbedWidget;
