/**
 * Menu Version History Timeline Component
 * 
 * Displays version history as a timeline with:
 * - Version cards with metadata
 * - Performance metrics
 * - Change summaries
 * - Quick actions (restore, compare, view)
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Clock,
  User,
  FileText,
  ArrowLeft,
  ArrowRight,
  GitCompare,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
} from "lucide-react";

interface VersionHistoryItem {
  version: {
    id: string;
    versionNumber: number;
    createdAt: string;
    createdBy: string;
    changeLog?: string;
    changeLogKey?: string;
    performanceMetrics?: Record<string, any>;
  };
  changes: number;
  performance?: Record<string, any>;
}

interface MenuVersionTimelineProps {
  menuId: string;
  onVersionSelect?: (versionNumber: number) => void;
  onVersionCompare?: (version1: number, version2: number) => void;
  onVersionRestore?: (versionNumber: number) => void;
}

export default function MenuVersionTimeline({
  menuId,
  onVersionSelect,
  onVersionCompare,
  onVersionRestore,
}: MenuVersionTimelineProps) {
  const [history, setHistory] = useState<VersionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [compareVersions, setCompareVersions] = useState<{ v1: number | null; v2: number | null }>({
    v1: null,
    v2: null,
  });

  useEffect(() => {
    loadHistory();
  }, [menuId]);

  async function loadHistory() {
    try {
      setLoading(true);
      const response = await fetch(`/api/menu-versioning/${menuId}/history`, {
        headers: {
          "X-Org-ID": "default", // TODO: Get from auth context
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load version history");
      }

      const { data } = await response.json();
      setHistory(data || []);
    } catch (error) {
      console.error("[MenuVersionTimeline] Error loading history", error);
    } finally {
      setLoading(false);
    }
  }

  const handleVersionClick = (versionNumber: number) => {
    setSelectedVersion(selectedVersion === versionNumber ? null : versionNumber);
    onVersionSelect?.(versionNumber);
  };

  const handleCompareClick = (versionNumber: number) => {
    if (!compareVersions.v1) {
      setCompareVersions({ v1: versionNumber, v2: null });
    } else if (!compareVersions.v2) {
      setCompareVersions({ v1: compareVersions.v1, v2: versionNumber });
      onVersionCompare?.(compareVersions.v1, versionNumber);
    } else {
      // Reset and start new comparison
      setCompareVersions({ v1: versionNumber, v2: null });
    }
  };

  const handleRestoreClick = (versionNumber: number) => {
    if (confirm(`Are you sure you want to restore to version ${versionNumber}?`)) {
      onVersionRestore?.(versionNumber);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPerformanceColor = (metrics?: Record<string, any>): string => {
    if (!metrics) return "text-slate-600";
    const score = metrics.score || 0;
    if (score > 7) return "text-green-600";
    if (score > 4) return "text-amber-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading version history...</div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-2" />
          <p>No version history available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Version History Timeline
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Complete version history with change tracking and performance metrics
          </p>
        </div>
        {compareVersions.v1 && compareVersions.v2 && (
          <Button
            onClick={() => setCompareVersions({ v1: null, v2: null })}
            variant="outline"
            size="sm"
          >
            Clear Comparison
          </Button>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border dark:bg-slate-800" />

        {/* Version Cards */}
        <div className="space-y-6">
          {history.map((item, index) => {
            const isSelected = selectedVersion === item.version.versionNumber;
            const isInComparison =
              compareVersions.v1 === item.version.versionNumber ||
              compareVersions.v2 === item.version.versionNumber;
            const isLatest = index === 0;

            return (
              <div key={item.version.id} className="relative flex items-start gap-6">
                {/* Timeline Dot */}
                <div className="relative z-10 flex-shrink-0">
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border-2",
                      isLatest && "bg-primary border-primary",
                      isSelected && "bg-amber-500 border-amber-500",
                      isInComparison && "bg-blue-500 border-blue-500",
                      !isLatest && !isSelected && !isInComparison && "bg-background border-border"
                    )}
                  />
                  {isLatest && (
                    <div className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-primary/20 animate-pulse" />
                  )}
                </div>

                {/* Version Card */}
                <Card
                  className={cn(
                    "flex-1 cursor-pointer transition-all hover:shadow-md",
                    isSelected && "ring-2 ring-amber-500 border-amber-500",
                    isInComparison && "ring-2 ring-blue-500 border-blue-500",
                    isLatest && "border-primary"
                  )}
                  onClick={() => handleVersionClick(item.version.versionNumber)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg font-semibold text-foreground">
                            Version {item.version.versionNumber}
                          </CardTitle>
                          {isLatest && (
                            <Badge className="bg-primary text-primary-foreground">Latest</Badge>
                          )}
                          {item.version.performanceMetrics && (
                            <Badge
                              variant="outline"
                              className={cn("text-xs", getPerformanceColor(item.version.performanceMetrics))}
                            >
                              <BarChart3 className="w-3 h-3 mr-1" />
                              Score: {item.version.performanceMetrics.score?.toFixed(1) || "N/A"}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(item.version.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{item.version.createdBy}</span>
                          </div>
                          {item.changes > 0 && (
                            <div className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              <span>{item.changes} changes</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Change Log */}
                    {item.version.changeLog && (
                      <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-800">
                        <p className="text-sm text-foreground">{item.version.changeLog}</p>
                      </div>
                    )}

                    {/* Change Summary */}
                    {item.changes > 0 && (
                      <div className="mb-3">
                        <Badge variant="outline" className="text-xs">
                          {item.changes} change{item.changes > 1 ? "s" : ""} from previous version
                        </Badge>
                      </div>
                    )}

                    {/* Performance Metrics */}
                    {item.version.performanceMetrics && (
                      <div className="mb-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2">Performance Metrics</h4>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {item.version.performanceMetrics.revenue && (
                            <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded">
                              <p className="text-muted-foreground">Revenue</p>
                              <p className="font-semibold text-foreground">
                                ${parseFloat(item.version.performanceMetrics.revenue).toLocaleString()}
                              </p>
                            </div>
                          )}
                          {item.version.performanceMetrics.sales && (
                            <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded">
                              <p className="text-muted-foreground">Sales</p>
                              <p className="font-semibold text-foreground">
                                {parseInt(item.version.performanceMetrics.sales).toLocaleString()}
                              </p>
                            </div>
                          )}
                          {item.version.performanceMetrics.rating && (
                            <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded">
                              <p className="text-muted-foreground">Rating</p>
                              <p className="font-semibold text-foreground">
                                {parseFloat(item.version.performanceMetrics.rating).toFixed(1)}/5
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompareClick(item.version.versionNumber);
                        }}
                        className={cn(
                          "gap-2",
                          isInComparison && "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20"
                        )}
                      >
                        <GitCompare className="w-3 h-3" />
                        {compareVersions.v1 === item.version.versionNumber
                          ? "Compare From"
                          : compareVersions.v2 === item.version.versionNumber
                          ? "Compare To"
                          : "Compare"}
                      </Button>
                      {!isLatest && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreClick(item.version.versionNumber);
                          }}
                          className="gap-2"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Restore
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVersionClick(item.version.versionNumber);
                        }}
                        className="gap-2 ml-auto"
                      >
                        <FileText className="w-3 h-3" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison Summary */}
      {compareVersions.v1 && compareVersions.v2 && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <GitCompare className="w-5 h-5" />
              Comparing Versions {compareVersions.v1} and {compareVersions.v2}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Click "View Details" on any version card or use the compare button to see the full comparison.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
