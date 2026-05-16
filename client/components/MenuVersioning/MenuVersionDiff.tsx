/**
 * Menu Version Side-by-Side Diff Component
 * 
 * Displays side-by-side comparison of two menu versions with
 * highlighting of differences, impact analysis, and change summary
 */

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
} from "lucide-react";

interface VersionDifference {
  type: "added" | "removed" | "modified" | "price_changed" | "category_changed";
  path: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
  description: string;
  descriptionKey?: string;
}

interface VersionComparison {
  version1: {
    id: string;
    versionNumber: number;
    menuState: any;
    createdAt: string;
    createdBy: string;
    changeLog?: string;
  };
  version2: {
    id: string;
    versionNumber: number;
    menuState: any;
    createdAt: string;
    createdBy: string;
    changeLog?: string;
  };
  differences: VersionDifference[];
  summary: {
    itemsAdded: number;
    itemsRemoved: number;
    itemsModified: number;
    categoriesAdded: number;
    categoriesRemoved: number;
    categoriesModified: number;
    priceChanges: number;
    totalChanges: number;
  };
  impactAnalysis?: {
    estimatedRevenueImpact: number;
    estimatedCostImpact: number;
    performanceImpact: "positive" | "neutral" | "negative";
    riskLevel: "low" | "medium" | "high";
  };
}

interface MenuVersionDiffProps {
  menuId: string;
  version1Number: number;
  version2Number: number;
  onClose?: () => void;
}

export default function MenuVersionDiff({
  menuId,
  version1Number,
  version2Number,
  onClose,
}: MenuVersionDiffProps) {
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDiff, setSelectedDiff] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"items" | "categories" | "impact">("items");

  useEffect(() => {
    loadComparison();
  }, [menuId, version1Number, version2Number]);

  async function loadComparison() {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/menu-versioning/${menuId}/compare/${version1Number}/${version2Number}`,
        {
          headers: {
            "X-Org-ID": "default", // TODO: Get from auth context
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load comparison");
      }

      const { data } = await response.json();
      setComparison(data);
    } catch (error) {
      console.error("[MenuVersionDiff] Error loading comparison", error);
    } finally {
      setLoading(false);
    }
  }

  const getDiffColor = (type: VersionDifference["type"]): string => {
    switch (type) {
      case "added":
        return "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800";
      case "removed":
        return "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800";
      case "modified":
      case "price_changed":
        return "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800";
      default:
        return "bg-slate-50 border-slate-200 dark:bg-slate-900/20 dark:border-slate-800";
    }
  };

  const getDiffIcon = (type: VersionDifference["type"]) => {
    switch (type) {
      case "added":
        return <Plus className="w-4 h-4 text-green-600" />;
      case "removed":
        return <Minus className="w-4 h-4 text-red-600" />;
      case "price_changed":
        return <DollarSign className="w-4 h-4 text-amber-600" />;
      default:
        return <FileText className="w-4 h-4 text-blue-600" />;
    }
  };

  const itemDifferences = useMemo(() => {
    if (!comparison) return [];
    return comparison.differences.filter((d) => d.path.startsWith("items["));
  }, [comparison]);

  const categoryDifferences = useMemo(() => {
    if (!comparison) return [];
    return comparison.differences.filter((d) => d.path.startsWith("categories["));
  }, [comparison]);

  const priceChanges = useMemo(() => {
    if (!comparison) return [];
    return comparison.differences.filter((d) => d.type === "price_changed");
  }, [comparison]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading comparison...</div>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-amber-500" />
          <p>Failed to load comparison</p>
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
            <FileText className="w-6 h-6 text-primary" />
            Version Comparison
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Comparing Version {version1Number} vs Version {version2Number}
          </p>
        </div>
        {onClose && (
          <Button onClick={onClose} variant="outline" size="sm">
            Close
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{comparison.summary.totalChanges}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Items Changed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {comparison.summary.itemsAdded + comparison.summary.itemsRemoved + comparison.summary.itemsModified}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              +{comparison.summary.itemsAdded} / -{comparison.summary.itemsRemoved} / ~{comparison.summary.itemsModified}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Price Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{comparison.summary.priceChanges}</div>
          </CardContent>
        </Card>
        {comparison.impactAnalysis && (
          <Card
            className={cn(
              comparison.impactAnalysis.riskLevel === "high" && "border-red-200 bg-red-50/50",
              comparison.impactAnalysis.riskLevel === "medium" && "border-amber-200 bg-amber-50/50"
            )}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Risk Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "text-2xl font-bold",
                  comparison.impactAnalysis.riskLevel === "high" && "text-red-600",
                  comparison.impactAnalysis.riskLevel === "medium" && "text-amber-600",
                  comparison.impactAnalysis.riskLevel === "low" && "text-green-600"
                )}
              >
                {comparison.impactAnalysis.riskLevel.toUpperCase()}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Impact Analysis Summary */}
      {comparison.impactAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle>Impact Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Revenue Impact</p>
                <div className="flex items-center gap-2">
                  {comparison.impactAnalysis.estimatedRevenueImpact >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                  <span
                    className={cn(
                      "text-xl font-bold",
                      comparison.impactAnalysis.estimatedRevenueImpact >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    ${Math.abs(comparison.impactAnalysis.estimatedRevenueImpact).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Estimated monthly impact</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Cost Impact</p>
                <div className="flex items-center gap-2">
                  {comparison.impactAnalysis.estimatedCostImpact >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-red-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-green-600" />
                  )}
                  <span
                    className={cn(
                      "text-xl font-bold",
                      comparison.impactAnalysis.estimatedCostImpact >= 0 ? "text-red-600" : "text-green-600"
                    )}
                  >
                    ${Math.abs(comparison.impactAnalysis.estimatedCostImpact).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Estimated monthly impact</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Performance Impact</p>
                <div className="flex items-center gap-2">
                  {comparison.impactAnalysis.performanceImpact === "positive" && (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                  {comparison.impactAnalysis.performanceImpact === "negative" && (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  {comparison.impactAnalysis.performanceImpact === "neutral" && (
                    <Clock className="w-5 h-5 text-amber-600" />
                  )}
                  <span
                    className={cn(
                      "text-xl font-bold capitalize",
                      comparison.impactAnalysis.performanceImpact === "positive" && "text-green-600",
                      comparison.impactAnalysis.performanceImpact === "negative" && "text-red-600",
                      comparison.impactAnalysis.performanceImpact === "neutral" && "text-amber-600"
                    )}
                  >
                    {comparison.impactAnalysis.performanceImpact}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Predicted impact</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="items">
            Items ({itemDifferences.length})
          </TabsTrigger>
          <TabsTrigger value="categories">
            Categories ({categoryDifferences.length})
          </TabsTrigger>
          <TabsTrigger value="impact">
            Impact Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Item Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Side-by-Side View */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Version 1 (Old) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-foreground">Version {version1Number}</h3>
                      <Badge variant="outline">{comparison.version1.menuState?.items?.length || 0} items</Badge>
                    </div>
                    <div className="border rounded-lg p-4 space-y-2 max-h-[600px] overflow-y-auto">
                      {(comparison.version1.menuState?.items || []).map((item: any) => {
                        const diff = comparison.differences.find((d) => d.path.includes(`items[${item.id}]`));
                        const isModified = diff && (diff.type === "modified" || diff.type === "price_changed");
                        const isRemoved = diff && diff.type === "removed";

                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "p-3 rounded border",
                              isRemoved && "bg-red-50 border-red-200 dark:bg-red-900/20",
                              isModified && "bg-amber-50 border-amber-200 dark:bg-amber-900/20",
                              !diff && "bg-slate-50 border-slate-200 dark:bg-slate-900/20"
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-foreground">{item.name}</h4>
                                <p className="text-sm text-muted-foreground">{item.description || "No description"}</p>
                                <div className="mt-2 flex items-center gap-4 text-xs">
                                  <span className="font-semibold text-foreground">${parseFloat(item.price || 0).toFixed(2)}</span>
                                  {item.category && (
                                    <Badge variant="outline" className="text-xs">
                                      {item.category}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {isRemoved && <Minus className="w-4 h-4 text-red-600 flex-shrink-0" />}
                              {isModified && <FileText className="w-4 h-4 text-amber-600 flex-shrink-0" />}
                            </div>
                            {isModified && diff && (
                              <div className="mt-2 pt-2 border-t border-amber-200 text-xs">
                                {diff.field && (
                                  <p className="text-amber-700 dark:text-amber-300">
                                    {diff.field}: {String(diff.oldValue)} → {String(diff.newValue)}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Version 2 (New) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-foreground">Version {version2Number}</h3>
                      <Badge variant="outline">{comparison.version2.menuState?.items?.length || 0} items</Badge>
                    </div>
                    <div className="border rounded-lg p-4 space-y-2 max-h-[600px] overflow-y-auto">
                      {(comparison.version2.menuState?.items || []).map((item: any) => {
                        const diff = comparison.differences.find((d) => d.path.includes(`items[${item.id}]`));
                        const isModified = diff && (diff.type === "modified" || diff.type === "price_changed");
                        const isAdded = diff && diff.type === "added";

                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "p-3 rounded border",
                              isAdded && "bg-green-50 border-green-200 dark:bg-green-900/20",
                              isModified && "bg-amber-50 border-amber-200 dark:bg-amber-900/20",
                              !diff && "bg-slate-50 border-slate-200 dark:bg-slate-900/20"
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-foreground">{item.name}</h4>
                                <p className="text-sm text-muted-foreground">{item.description || "No description"}</p>
                                <div className="mt-2 flex items-center gap-4 text-xs">
                                  <span className="font-semibold text-foreground">${parseFloat(item.price || 0).toFixed(2)}</span>
                                  {item.category && (
                                    <Badge variant="outline" className="text-xs">
                                      {item.category}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {isAdded && <Plus className="w-4 h-4 text-green-600 flex-shrink-0" />}
                              {isModified && <FileText className="w-4 h-4 text-amber-600 flex-shrink-0" />}
                            </div>
                            {isModified && diff && (
                              <div className="mt-2 pt-2 border-t border-amber-200 text-xs">
                                {diff.field && (
                                  <p className="text-amber-700 dark:text-amber-300">
                                    {diff.field}: {String(diff.oldValue)} → {String(diff.newValue)}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Changes List */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-foreground mb-3">All Changes</h3>
                  <div className="space-y-2">
                    {itemDifferences.map((diff, idx) => (
                      <div
                        key={idx}
                        className={cn("p-3 rounded border", getDiffColor(diff.type))}
                        onClick={() => setSelectedDiff(selectedDiff === diff.path ? null : diff.path)}
                      >
                        <div className="flex items-start gap-2">
                          {getDiffIcon(diff.type)}
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{diff.description}</p>
                            {diff.field && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Field: {diff.field} | Path: {diff.path}
                              </p>
                            )}
                            {selectedDiff === diff.path && (
                              <div className="mt-2 pt-2 border-t border-current/20 space-y-1 text-xs">
                                {diff.oldValue !== undefined && (
                                  <div>
                                    <span className="font-semibold">Old:</span>{" "}
                                    <span className="line-through text-red-600">{String(diff.oldValue)}</span>
                                  </div>
                                )}
                                {diff.newValue !== undefined && (
                                  <div>
                                    <span className="font-semibold">New:</span>{" "}
                                    <span className="text-green-600">{String(diff.newValue)}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <Badge
                            className={cn(
                              diff.type === "added" && "bg-green-600",
                              diff.type === "removed" && "bg-red-600",
                              diff.type === "price_changed" && "bg-amber-600",
                              diff.type === "modified" && "bg-blue-600"
                            )}
                          >
                            {diff.type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categoryDifferences.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>No category changes</p>
                  </div>
                ) : (
                  categoryDifferences.map((diff, idx) => (
                    <div key={idx} className={cn("p-3 rounded border", getDiffColor(diff.type))}>
                      <div className="flex items-start gap-2">
                        {getDiffIcon(diff.type)}
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{diff.description}</p>
                          {diff.field && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Field: {diff.field} | Path: {diff.path}
                            </p>
                          )}
                        </div>
                        <Badge
                          className={cn(
                            diff.type === "added" && "bg-green-600",
                            diff.type === "removed" && "bg-red-600",
                            diff.type === "category_changed" && "bg-amber-600"
                          )}
                        >
                          {diff.type}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impact" className="space-y-4">
          {comparison.impactAnalysis ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {comparison.impactAnalysis.estimatedRevenueImpact >= 0 ? (
                          <TrendingUp className="w-8 h-8 text-green-600" />
                        ) : (
                          <TrendingDown className="w-8 h-8 text-red-600" />
                        )}
                        <span
                          className={cn(
                            "text-3xl font-bold",
                            comparison.impactAnalysis.estimatedRevenueImpact >= 0 ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {comparison.impactAnalysis.estimatedRevenueImpact >= 0 ? "+" : ""}
                          ${comparison.impactAnalysis.estimatedRevenueImpact.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">Estimated monthly revenue impact</p>
                    </div>

                    {priceChanges.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-semibold text-foreground mb-2">Price Changes</h4>
                        <div className="space-y-2">
                          {priceChanges.map((change, idx) => {
                            const oldPrice = parseFloat(change.oldValue || 0);
                            const newPrice = parseFloat(change.newValue || 0);
                            const priceDiff = newPrice - oldPrice;
                            const priceDiffPercent = oldPrice > 0 ? (priceDiff / oldPrice) * 100 : 0;

                            return (
                              <div key={idx} className="p-3 border rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-foreground">
                                      {change.path.match(/items\[([^\]]+)\]/)?.[1] || "Item"}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      ${oldPrice.toFixed(2)} → ${newPrice.toFixed(2)}
                                    </p>
                                  </div>
                                  <Badge
                                    className={cn(
                                      priceDiffPercent > 15 && "bg-red-600",
                                      priceDiffPercent > 0 && priceDiffPercent <= 15 && "bg-amber-600",
                                      priceDiffPercent <= 0 && "bg-green-600"
                                    )}
                                  >
                                    {priceDiffPercent > 0 ? "+" : ""}
                                    {priceDiffPercent.toFixed(1)}%
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {comparison.impactAnalysis.performanceImpact === "positive" && (
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      )}
                      {comparison.impactAnalysis.performanceImpact === "negative" && (
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                      )}
                      {comparison.impactAnalysis.performanceImpact === "neutral" && (
                        <Clock className="w-8 h-8 text-amber-600" />
                      )}
                      <span
                        className={cn(
                          "text-2xl font-bold capitalize",
                          comparison.impactAnalysis.performanceImpact === "positive" && "text-green-600",
                          comparison.impactAnalysis.performanceImpact === "negative" && "text-red-600",
                          comparison.impactAnalysis.performanceImpact === "neutral" && "text-amber-600"
                        )}
                      >
                        {comparison.impactAnalysis.performanceImpact}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">Predicted performance impact</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <div
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
                        comparison.impactAnalysis.riskLevel === "high" && "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200",
                        comparison.impactAnalysis.riskLevel === "medium" && "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200",
                        comparison.impactAnalysis.riskLevel === "low" && "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200"
                      )}
                    >
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-xl font-bold uppercase">{comparison.impactAnalysis.riskLevel}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Overall risk level</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-amber-500" />
                <p>Impact analysis not available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
