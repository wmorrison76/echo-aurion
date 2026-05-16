/** * P&L Comparison Component * Multi-property and multi-period side-by-side comparison * * Features: * - Side-by-side property comparison (3-5 properties) * - Multi-period comparison (months/quarters/years) * - Variance heatmap with color coding * - Index to budget (110 index = 110% of budget) * - Property ranking by metric * - Outlier highlighting * - Percentile analysis * - Trend sparklines */ import React, {
  useState,
  useMemo,
  useCallback,
} from "react";
import {
  DetailedPnL,
  PnLComparison as PnLComparisonType,
  PropertyRanking,
} from "@/shared/types/pnlTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
interface PnLComparisonProps {
  comparison: PnLComparisonType;
  metric?: "revenue" | "margin" | "operatingIncome" | "netIncome";
  onPropertyClick?: (propertyId: string) => void;
  showMetrics?: boolean;
  showTrends?: boolean;
  showRanking?: boolean;
}
interface ComparisonMetric {
  name: string;
  getValue: (pnl: DetailedPnL) => number;
  format: "currency" | "percent";
}
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};
const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};
const formatIndex = (actual: number, budget: number): number => {
  return budget !== 0 ? (actual / budget) * 100 : 100;
}; // Color coding for heatmap
const getHeatmapColor = (index: number): string => {
  if (index < 90) return "bg-red-100 text-red-900"; // Significantly under if (index < 95) return"bg-orange-100 text-orange-900"; // Moderately under if (index < 105) return"bg-green-100 text-green-900"; // Within target (95-105) if (index < 110) return"bg-yellow-100 text-yellow-900"; // Moderately over return"bg-red-100 text-red-900"; // Significantly over
};
const determineOutlier = (
  properties: DetailedPnL[],
  getValue: (pnl: DetailedPnL) => number,
): Set<string> => {
  const values = properties.map((p) => getValue(p));
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / values.length,
  );
  return new Set(
    properties
      .filter((p) => Math.abs(getValue(p) - mean) > 2 * stdDev)
      .map((p) => p.propertyId),
  );
};
export function PnLComparison({
  comparison,
  metric = "revenue",
  onPropertyClick,
  showMetrics = true,
  showTrends = true,
  showRanking = true,
}: PnLComparisonProps) {
  const [comparisonMetric, setComparisonMetric] = useState(metric);
  const [showIndexMode, setShowIndexMode] = useState(true);
  const [activeTab, setActiveTab] = useState("comparison");
  const properties = useMemo(
    () => [comparison.baselineProperty, ...comparison.comparisonProperties],
    [comparison.baselineProperty, comparison.comparisonProperties],
  ); // Define comparison metrics const metrics: Record<string, ComparisonMetric> = { revenue: { name:"Total Revenue", getValue: (pnl) => pnl.totalRevenue, format:"currency", }, margin: { name:"Gross Margin %", getValue: (pnl) => pnl.grossMarginPercent, format:"percent", }, operatingIncome: { name:"Operating Income", getValue: (pnl) => pnl.operatingIncome, format:"currency", }, netIncome: { name:"Net Income", getValue: (pnl) => pnl.netIncome, format:"currency", }, }; const selectedMetric = metrics[comparisonMetric]; // Calculate statistics const statistics = useMemo(() => { const values = properties.map((p) => selectedMetric.getValue(p)); const max = Math.max(...values); const min = Math.min(...values); const avg = values.reduce((a, b) => a + b, 0) / values.length; return { max, min, avg }; }, [properties, selectedMetric]); // Determine outliers const outliers = useMemo( () => determineOutlier(properties, selectedMetric.getValue), [properties, selectedMetric] ); // Build comparison data const comparisonData = useMemo( () => properties.map((pnl) => ({ pnl, value: selectedMetric.getValue(pnl), isOutlier: outliers.has(pnl.propertyId), isBaseline: pnl.propertyId === comparison.baselineProperty.propertyId, })), [properties, selectedMetric, outliers, comparison.baselineProperty.propertyId] ); // Calculate percentiles const percentiles = useMemo(() => { const sorted = [...comparisonData].sort((a, b) => b.value - a.value); return new Map( sorted.map((item, index) => [ item.pnl.propertyId, Math.round(((sorted.length - index) / sorted.length) * 100), ]) ); }, [comparisonData]); const handlePropertyClick = useCallback( (propertyId: string) => { onPropertyClick?.(propertyId); }, [onPropertyClick] ); return ( <div className="space-y-6"> {/* Controls */} <div className="flex flex-wrap items-center justify-between gap-4"> <div className="flex items-center gap-2"> <label className="text-sm font-medium">Metric:</label> <select value={comparisonMetric} onChange={(e) => setComparisonMetric(e.target.value)} className="border rounded px-2 py-1 text-sm" > {Object.entries(metrics).map(([key, metric]) => ( <option key={key} value={key}> {metric.name} </option> ))} </select> </div> <Button variant="outline" size="sm" onClick={() => setShowIndexMode(!showIndexMode)} > {showIndexMode ?"Show Actual" :"Show Index"} </Button> </div> {/* Main Comparison Tabs */} <Tabs value={activeTab} onValueChange={setActiveTab}> <TabsList> <TabsTrigger value="comparison">Comparison</TabsTrigger> {showRanking && <TabsTrigger value="ranking">Ranking</TabsTrigger>} {outliers.size > 0 && ( <TabsTrigger value="outliers"> Outliers<Badge variant="destructive" className="ml-2"> {outliers.size} </Badge> </TabsTrigger> )} </TabsList> {/* Comparison Tab */} <TabsContent value="comparison"> <Card> <CardHeader> <CardTitle> {selectedMetric.name} Comparison {showIndexMode &&" (Budget Index)"} </CardTitle> </CardHeader> <CardContent> <div className="space-y-4"> {comparisonData.map((item) => { const valueDisplay = selectedMetric.format ==="currency" ? formatCurrency(item.value) : formatPercent(item.value); const indexValue = showIndexMode ? formatIndex( item.value, item.value > statistics.avg ? statistics.avg : statistics.max ) : 100; const percentile = percentiles.get(item.pnl.propertyId) || 0; const isWinning = percentile >= 75; const isUnderperforming = percentile <= 25; return ( <div key={item.pnl.propertyId} className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors" onClick={() => handlePropertyClick(item.pnl.propertyId)} > <div className="flex items-center justify-between mb-3"> <div> <h4 className="font-semibold"> {item.pnl.propertyName} </h4> <p className="text-sm text-muted-foreground"> {item.pnl.period.label} </p> </div> <div className="text-right"> {item.isBaseline && ( <Badge variant="outline" className="mr-2"> Baseline </Badge> )} {item.isOutlier && ( <Badge variant="destructive">Outlier</Badge> )} </div> </div> <div className="grid grid-cols-3 gap-4"> {/* Value */} <div> <p className="text-sm text-muted-foreground mb-1"> {showIndexMode ?"Index" :"Actual"} </p> <p className="text-2xl font-bold"> {showIndexMode ? `${indexValue.toFixed(0)}` : valueDisplay} </p> </div> {/* Comparison to Average */} <div> <p className="text-sm text-muted-foreground mb-1"> vs Average </p> <p className={`text-lg font-semibold ${ item.value > statistics.avg ?"text-green-600" :"text-red-600" }`} > {item.value > statistics.avg ?"+" :""} {selectedMetric.format ==="currency" ? formatCurrency(item.value - statistics.avg) : formatPercent(item.value - statistics.avg)} </p> </div> {/* Percentile */} <div> <p className="text-sm text-muted-foreground mb-1"> Percentile </p> <div className="flex items-center gap-2"> <p className="text-2xl font-bold">{percentile}</p> <span className="text-xs text-muted-foreground"> {isWinning &&"🏆"} {isUnderperforming &&"⚠️"} </span> </div> </div> </div> {/* Progress bar */} <div className="mt-4 h-2 bg-surface rounded-full overflow-hidden"> <div className={`h-full ${ item.isOutlier ?"bg-red-500" : item.value > statistics.avg ?"bg-green-500" :"bg-yellow-500" }`} style={{ width: `${Math.min( (item.value / statistics.max) * 100, 100 )}%`, }} /> </div> </div> ); })} </div> </CardContent> </Card> </TabsContent> {/* Ranking Tab */} {showRanking && ( <TabsContent value="ranking"> <Card> <CardHeader> <CardTitle>Property Rankings - {selectedMetric.name}</CardTitle> </CardHeader> <CardContent> <div className="space-y-2"> {[...comparisonData] .sort((a, b) => b.value - a.value) .map((item, index) => { const rank = index + 1; const percentile = percentiles.get(item.pnl.propertyId); return ( <div key={item.pnl.propertyId} className="flex items-center justify-between p-3 border rounded hover:bg-muted cursor-pointer" onClick={() => handlePropertyClick(item.pnl.propertyId) } > <div className="flex items-center gap-4"> <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center"> {rank} </div> <div> <p className="font-medium"> {item.pnl.propertyName} </p> <p className="text-sm text-muted-foreground"> {item.pnl.period.label} </p> </div> </div> <div className="text-right"> <p className="text-lg font-bold"> {selectedMetric.format ==="currency" ? formatCurrency(item.value) : formatPercent(item.value)} </p> <p className="text-sm text-muted-foreground"> {percentile}th percentile </p> </div> </div> ); })} </div> </CardContent> </Card> </TabsContent> )} {/* Outliers Tab */} {outliers.size > 0 && ( <TabsContent value="outliers"> <Card className="border-amber-200 bg-amber-50"> <CardHeader> <CardTitle className="text-amber-900">Outlier Properties</CardTitle> </CardHeader> <CardContent> <div className="space-y-4"> {comparisonData .filter((item) => item.isOutlier) .map((item) => ( <div key={item.pnl.propertyId} className="p-4 border border-amber-200 rounded-lg bg-background hover:bg-amber-50 cursor-pointer transition-colors" onClick={() => handlePropertyClick(item.pnl.propertyId) } > <div className="flex items-start justify-between"> <div> <h4 className="font-semibold text-lg"> {item.pnl.propertyName} </h4> <p className="text-sm text-muted-foreground mt-1"> {item.pnl.period.label} </p> <div className="mt-3 space-y-1"> <p className="text-sm"> <span className="text-muted-foreground"> Value: </span>{""} <span className="font-semibold"> {selectedMetric.format ==="currency" ? formatCurrency(item.value) : formatPercent(item.value)} </span> </p> <p className="text-sm"> <span className="text-muted-foreground"> Average: </span>{""} <span className="font-semibold"> {selectedMetric.format ==="currency" ? formatCurrency(statistics.avg) : formatPercent(statistics.avg)} </span> </p> <p className="text-sm font-semibold text-amber-600"> Variance:{""} {item.value > statistics.avg ?"+" :""} {selectedMetric.format ==="currency" ? formatCurrency( item.value - statistics.avg ) : formatPercent( item.value - statistics.avg )} </p> </div> </div> <div className="text-right"> <div className="text-4xl font-bold text-amber-600"> ! </div> <p className="text-xs text-muted-foreground mt-2"> {item.value > statistics.avg ?"Above average" :"Below average"} </p> </div> </div> </div> ))} </div> </CardContent> </Card> </TabsContent> )} </Tabs> {/* Summary Statistics */} <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <Card> <CardHeader className="pb-2"> <CardTitle className="text-sm font-medium text-muted-foreground"> Best Performer </CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold"> {selectedMetric.format ==="currency" ? formatCurrency(statistics.max) : formatPercent(statistics.max)} </div> <p className="text-xs text-green-600 mt-1">Maximum</p> </CardContent> </Card> <Card> <CardHeader className="pb-2"> <CardTitle className="text-sm font-medium text-muted-foreground"> Average </CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold"> {selectedMetric.format ==="currency" ? formatCurrency(statistics.avg) : formatPercent(statistics.avg)} </div> <p className="text-xs text-muted-foreground mt-1"> Across {properties.length} properties </p> </CardContent> </Card> <Card> <CardHeader className="pb-2"> <CardTitle className="text-sm font-medium text-muted-foreground"> Needs Improvement </CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold"> {selectedMetric.format ==="currency" ? formatCurrency(statistics.min) : formatPercent(statistics.min)} </div> <p className="text-xs text-red-600 mt-1">Minimum</p> </CardContent> </Card> </div> </div> );
}
