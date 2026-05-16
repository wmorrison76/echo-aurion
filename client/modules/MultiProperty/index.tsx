import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader,
  BarChart3,
  DollarSign,
  Users,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
interface PropertyMetrics {
  propertyId: string;
  propertyName: string;
  location: string;
  type: "restaurant" | "bar" | "banquet" | "spa";
  metrics: {
    revenue: number;
    covers: number;
    avgCheck: number;
    laborCost: number;
    laborPercent: number;
    foodCost: number;
    foodCostPercent: number;
    occupancyRate: number;
    staffingLevel: number;
    demandForecast: number;
  };
  performance: {
    rank: number;
    trend: "up" | "down" | "stable";
    percentChange: number;
  };
  alerts: string[];
}
interface MultiPropertyAnalysis {
  properties: PropertyMetrics[];
  totalProperties: number;
  consolidatedMetrics: {
    totalRevenue: number;
    totalCovers: number;
    avgLaborPercent: number;
    avgFoodCostPercent: number;
    topPerformer: string;
    needsAttention: string[];
  };
  insights: string[];
  recommendations: string[];
}
export const MultiProperty: React.FC = () => {
  const { t } = useI18n();
  const [analysis, setAnalysis] = useState<MultiPropertyAnalysis | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const handleGenerateAnalytics = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/analytics/multi-property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: "company-001", timeframe: "week" }),
      });
      if (response.ok) {
        setAnalysis(await response.json());
      }
    } catch (error) {
      console.error("Multi-property analytics error:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return (
          <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
        );
      case "down":
        return (
          <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
        );
      case "stable":
        return (
          <div className="w-4 h-4 bg-primary dark:bg-blue-400 rounded-full" />
        );
    }
  };
  return (
    <div className="w-full h-full flex flex-col p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {" "}
      <div className="mb-6">
        {" "}
        <div className="flex items-center justify-between mb-2">
          {" "}
          <div className="flex items-center gap-3">
            {" "}
            <Building2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />{" "}
            <div>
              {" "}
              <h1 className="text-3xl font-bold text-foreground dark:text-white">
                {" "}
                {t("module.multi-property.title")}{" "}
              </h1>{" "}
              <p className="text-muted-foreground">
                {" "}
                {t("module.multi-property.description")}{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <ModuleChatButton
            moduleId="multi-property"
            moduleName={t("module.multi-property.title")}
          />{" "}
        </div>{" "}
      </div>{" "}
      {!analysis ? (
        <div className="flex flex-col items-center justify-center flex-1">
          {" "}
          <Building2 className="w-16 h-16 text-purple-600 dark:text-purple-400 mx-auto mb-4 opacity-50" />{" "}
          <h2 className="text-2xl font-bold text-foreground dark:text-white mb-6">
            {" "}
            Generate Portfolio Analysis{" "}
          </h2>{" "}
          <Button
            onClick={handleGenerateAnalytics}
            disabled={isGenerating}
            size="lg"
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {" "}
            {isGenerating ? (
              <>
                {" "}
                <Loader className="w-4 h-4 animate-spin" /> Analyzing...{" "}
              </>
            ) : (
              <>
                {" "}
                <Building2 className="w-4 h-4" /> Analyze Portfolio{" "}
              </>
            )}{" "}
          </Button>{" "}
        </div>
      ) : (
        <>
          {" "}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            {" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-border">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                {" "}
                Properties{" "}
              </p>{" "}
              <p className="text-2xl font-bold text-foreground dark:text-white">
                {" "}
                {analysis.totalProperties}{" "}
              </p>{" "}
            </div>{" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-border">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                {" "}
                Total Revenue{" "}
              </p>{" "}
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {" "}
                ${(analysis.consolidatedMetrics.totalRevenue / 1000).toFixed(
                  0,
                )}{" "}
                K{" "}
              </p>{" "}
            </div>{" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-border">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                {" "}
                Total Covers{" "}
              </p>{" "}
              <p className="text-2xl font-bold text-foreground dark:text-white">
                {" "}
                {analysis.consolidatedMetrics.totalCovers}{" "}
              </p>{" "}
            </div>{" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-border">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                {" "}
                Avg Labor %{" "}
              </p>{" "}
              <p className="text-2xl font-bold text-foreground dark:text-white">
                {" "}
                {analysis.consolidatedMetrics.avgLaborPercent.toFixed(1)}%{" "}
              </p>{" "}
            </div>{" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-border">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                {" "}
                Top Performer{" "}
              </p>{" "}
              <p className="text-xs font-bold text-purple-600 dark:text-purple-400 truncate">
                {" "}
                {analysis.consolidatedMetrics.topPerformer}{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          {analysis.consolidatedMetrics.needsAttention.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              {" "}
              <div className="flex gap-3">
                {" "}
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />{" "}
                <div>
                  {" "}
                  <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">
                    {" "}
                    Properties Needing Attention{" "}
                  </h3>{" "}
                  <ul className="space-y-1 text-sm text-red-800 dark:text-red-300">
                    {" "}
                    {analysis.consolidatedMetrics.needsAttention.map(
                      (alert, i) => (
                        <li key={i}>• {alert}</li>
                      ),
                    )}{" "}
                  </ul>{" "}
                </div>{" "}
              </div>{" "}
            </div>
          )}{" "}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 flex-1 overflow-y-auto">
            {" "}
            {analysis.properties.map((property) => (
              <div
                key={property.propertyId}
                className="bg-background dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-border flex flex-col"
              >
                {" "}
                <div className="flex justify-between items-start mb-3">
                  {" "}
                  <div>
                    {" "}
                    <h3 className="font-semibold text-foreground dark:text-white">
                      {" "}
                      {property.propertyName}{" "}
                    </h3>{" "}
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      {property.location}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div className="flex items-center gap-1">
                    {" "}
                    {getTrendIcon(property.performance.trend)}{" "}
                    <span className="text-xs font-bold text-foreground dark:text-white">
                      {" "}
                      #{property.performance.rank}{" "}
                    </span>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="grid grid-cols-3 gap-2 mb-3 text-sm border-b border-slate-200 dark:border-border pb-3">
                  {" "}
                  <div>
                    {" "}
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      Revenue{" "}
                    </p>{" "}
                    <p className="font-bold text-foreground dark:text-white">
                      {" "}
                      ${property.metrics.revenue.toLocaleString()}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      Covers{" "}
                    </p>{" "}
                    <p className="font-bold text-foreground dark:text-white">
                      {" "}
                      {property.metrics.covers}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      Avg Check{" "}
                    </p>{" "}
                    <p className="font-bold text-foreground dark:text-white">
                      {" "}
                      ${property.metrics.avgCheck.toFixed(2)}{" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                  {" "}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                    {" "}
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      Labor %{" "}
                    </p>{" "}
                    <p className="font-bold text-primary dark:text-blue-400">
                      {" "}
                      {property.metrics.laborPercent}%{" "}
                    </p>{" "}
                  </div>{" "}
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
                    {" "}
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      Food %{" "}
                    </p>{" "}
                    <p className="font-bold text-orange-600 dark:text-orange-400">
                      {" "}
                      {property.metrics.foodCostPercent}%{" "}
                    </p>{" "}
                  </div>{" "}
                  <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                    {" "}
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      Occupancy{" "}
                    </p>{" "}
                    <p className="font-bold text-green-600 dark:text-green-400">
                      {" "}
                      {property.metrics.occupancyRate}%{" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
                {property.alerts.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded mb-2">
                    {" "}
                    <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                      {" "}
                      ⚠️ {property.alerts[0]}{" "}
                    </p>{" "}
                  </div>
                )}{" "}
                <div className="text-xs text-muted-foreground">
                  {" "}
                  <span
                    className={
                      property.performance.percentChange > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {" "}
                    {property.performance.percentChange > 0 ? "+" : ""}{" "}
                    {property.performance.percentChange}%{" "}
                  </span>
                  {""} from last period{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {" "}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-lg p-4 border border-blue-200 dark:border-slate-600">
              {" "}
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                {" "}
                <BarChart3 className="w-4 h-4" /> Key Insights{" "}
              </h3>{" "}
              <ul className="space-y-2 text-sm text-blue-800 dark:text-primary">
                {" "}
                {analysis.insights.map((insight, i) => (
                  <li key={i}>• {insight}</li>
                ))}{" "}
              </ul>{" "}
            </div>{" "}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-700 rounded-lg p-4 border border-green-200 dark:border-slate-600">
              {" "}
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3">
                {" "}
                Recommendations{" "}
              </h3>{" "}
              <ul className="space-y-2 text-sm text-green-800 dark:text-green-300">
                {" "}
                {analysis.recommendations.map((rec, i) => (
                  <li key={i}>→ {rec}</li>
                ))}{" "}
              </ul>{" "}
            </div>{" "}
          </div>{" "}
          <Button
            onClick={() => setAnalysis(null)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {" "}
            Generate New Analysis{" "}
          </Button>{" "}
        </>
      )}{" "}
    </div>
  );
};
export default MultiProperty;
