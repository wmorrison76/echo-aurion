import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
import { TrendingUp, DollarSign, AlertCircle, Loader } from "lucide-react";
interface PricingRecommendation {
  dishName: string;
  currentPrice: number;
  recommendedPrice: number;
  priceChange: number;
  reason: string;
  expectedImpact: {
    demandChange: string;
    revenueChange: string;
    marginChange: string;
  };
  confidenceLevel: number;
}
export const DynamicPricing: React.FC = () => {
  const [recommendations, setRecommendations] = useState<
    PricingRecommendation[]
  >([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analyzePricing = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/pricing/dynamic-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisType: "comprehensive",
          timeframe: "current",
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);
      }
    } catch (error) {
      console.error("Pricing analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };
  return (
    <div className="w-full h-full flex flex-col p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {" "}
      <div className="mb-6">
        {" "}
        <div className="flex items-center gap-3 mb-2">
          {" "}
          <DollarSign className="w-8 h-8 text-amber-600 dark:text-amber-400" />{" "}
          <h1 className="text-3xl font-bold text-foreground dark:text-white">
            {" "}
            Dynamic Pricing{" "}
          </h1>{" "}
        </div>{" "}
        <p className="text-muted-foreground">
          {" "}
          AI-powered pricing optimization based on demand, inventory, and
          competition{" "}
        </p>{" "}
      </div>{" "}
      {recommendations.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1">
          {" "}
          <DollarSign className="w-16 h-16 text-amber-600 dark:text-amber-400 mx-auto mb-4 opacity-50" />{" "}
          <h2 className="text-2xl font-bold text-foreground dark:text-white mb-6">
            {" "}
            Analyze Pricing{" "}
          </h2>{" "}
          <Button
            onClick={analyzePricing}
            disabled={isAnalyzing}
            size="lg"
            className="gap-2 bg-amber-600 hover:bg-amber-700"
          >
            {" "}
            {isAnalyzing ? (
              <>
                {" "}
                <Loader className="w-4 h-4 animate-spin" /> Analyzing...{" "}
              </>
            ) : (
              <>
                {" "}
                <TrendingUp className="w-4 h-4" /> Run Analysis{" "}
              </>
            )}{" "}
          </Button>{" "}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {" "}
          <div className="space-y-3">
            {" "}
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={cn(
                  "bg-background dark:bg-slate-800 rounded-lg border p-4",
                  rec.priceChange > 0
                    ? "border-green-200 dark:border-green-800"
                    : "border-orange-200 dark:border-orange-800",
                )}
              >
                {" "}
                <div className="flex items-start justify-between mb-3">
                  {" "}
                  <div>
                    {" "}
                    <h3 className="font-semibold text-foreground dark:text-white">
                      {" "}
                      {rec.dishName}{" "}
                    </h3>{" "}
                    <p className="text-sm text-muted-foreground mt-1">
                      {" "}
                      {rec.reason}{" "}
                    </p>{" "}
                  </div>{" "}
                  <span className="text-xs font-semibold text-muted-foreground">
                    {" "}
                    {rec.confidenceLevel}% Confidence{" "}
                  </span>{" "}
                </div>{" "}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {" "}
                  <div>
                    {" "}
                    <p className="text-xs text-muted-foreground mb-1">
                      {" "}
                      Current{" "}
                    </p>{" "}
                    <p className="font-semibold text-foreground dark:text-white">
                      {" "}
                      ${rec.currentPrice.toFixed(2)}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div className="text-center">
                    {" "}
                    <p className="text-xs text-muted-foreground mb-1">
                      {" "}
                      →{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-xs text-muted-foreground mb-1">
                      {" "}
                      Recommended{" "}
                    </p>{" "}
                    <p
                      className={cn(
                        "font-semibold",
                        rec.priceChange > 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-orange-600 dark:text-orange-400",
                      )}
                    >
                      {" "}
                      ${rec.recommendedPrice.toFixed(2)}{" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {" "}
                  <div className="bg-slate-100 dark:bg-slate-700 rounded p-2">
                    {" "}
                    <p className="text-muted-foreground">Demand</p>{" "}
                    <p className="font-semibold">
                      {rec.expectedImpact.demandChange}
                    </p>{" "}
                  </div>{" "}
                  <div className="bg-slate-100 dark:bg-slate-700 rounded p-2">
                    {" "}
                    <p className="text-muted-foreground">Revenue</p>{" "}
                    <p className="font-semibold">
                      {rec.expectedImpact.revenueChange}
                    </p>{" "}
                  </div>{" "}
                  <div className="bg-slate-100 dark:bg-slate-700 rounded p-2">
                    {" "}
                    <p className="text-muted-foreground">Margin</p>{" "}
                    <p className="font-semibold">
                      {rec.expectedImpact.marginChange}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
          <Button
            onClick={() => setRecommendations([])}
            variant="outline"
            size="sm"
            className="mt-6"
          >
            {" "}
            Run New Analysis{" "}
          </Button>{" "}
        </div>
      )}{" "}
    </div>
  );
};
export default DynamicPricing;
