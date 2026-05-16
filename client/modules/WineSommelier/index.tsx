import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wine, Loader, TrendingUp, DollarSign } from "lucide-react";
interface WinePairing {
  wine: string;
  region: string;
  grapeVariety: string;
  pricePerBottle: number;
  costPerGlass: number;
  retailPrice: number;
  margin: number;
  marginPercent: number;
  pairings: string[];
  flavorProfile: string;
  acidity: "Low" | "Medium" | "High";
  body: "Light" | "Medium" | "Full";
  recommendations: string[];
  score: number;
}
interface WinePairingAnalysis {
  pairings: WinePairing[];
  totalWines: number;
  averageMargin: number;
  highestMarginWine: string;
  topRecommendations: string[];
  pairedDishes: string[];
  revenue_potential: number;
}
export const WineSommelier: React.FC = () => {
  const [analysis, setAnalysis] = useState<WinePairingAnalysis | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const handleGeneratePairings = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/wine/pairings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuDishes: ["Duck", "Fish", "Steak"],
          budget: "all",
        }),
      });
      if (response.ok) {
        setAnalysis(await response.json());
      }
    } catch (error) {
      console.error("Wine pairing error:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  return (
    <div className="w-full h-full flex flex-col p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {" "}
      <div className="mb-6">
        {" "}
        <div className="flex items-center gap-3 mb-2">
          {" "}
          <Wine className="w-8 h-8 text-red-600 dark:text-red-400" />{" "}
          <h1 className="text-3xl font-bold text-foreground dark:text-white">
            {" "}
            Wine Sommelier{" "}
          </h1>{" "}
        </div>{" "}
        <p className="text-muted-foreground">
          {" "}
          AI pairing suggestions & margin optimization{" "}
        </p>{" "}
      </div>{" "}
      {!analysis ? (
        <div className="flex flex-col items-center justify-center flex-1">
          {" "}
          <Wine className="w-16 h-16 text-red-600 dark:text-red-400 mx-auto mb-4 opacity-50" />{" "}
          <h2 className="text-2xl font-bold text-foreground dark:text-white mb-6">
            {" "}
            Generate Wine Pairings{" "}
          </h2>{" "}
          <Button
            onClick={handleGeneratePairings}
            disabled={isGenerating}
            size="lg"
            className="gap-2 bg-red-600 hover:bg-red-700"
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
                <Wine className="w-4 h-4" /> Generate Pairings{" "}
              </>
            )}{" "}
          </Button>{" "}
        </div>
      ) : (
        <>
          {" "}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-border">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                {" "}
                Total Wines{" "}
              </p>{" "}
              <p className="text-2xl font-bold text-foreground dark:text-white">
                {" "}
                {analysis.totalWines}{" "}
              </p>{" "}
            </div>{" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-border">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                {" "}
                Avg Margin{" "}
              </p>{" "}
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {" "}
                {analysis.averageMargin.toFixed(1)}%{" "}
              </p>{" "}
            </div>{" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-border">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                {" "}
                Top Wine{" "}
              </p>{" "}
              <p className="text-sm font-bold text-foreground dark:text-white truncate">
                {" "}
                {analysis.highestMarginWine}{" "}
              </p>{" "}
            </div>{" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-border">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                {" "}
                Revenue Potential{" "}
              </p>{" "}
              <p className="text-2xl font-bold text-primary dark:text-blue-400">
                {" "}
                ${analysis.revenue_potential}{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {" "}
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-slate-800 dark:to-slate-700 rounded-lg p-4 border border-amber-200 dark:border-slate-600">
              {" "}
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-3">
                {" "}
                📌 Top Recommendations{" "}
              </h3>{" "}
              <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                {" "}
                {analysis.topRecommendations.map((rec, i) => (
                  <li key={i} className="flex gap-2">
                    {" "}
                    <span className="flex-shrink-0">✓</span> {rec}{" "}
                  </li>
                ))}{" "}
              </ul>{" "}
            </div>{" "}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-lg p-4 border border-purple-200 dark:border-slate-600">
              {" "}
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">
                {" "}
                🍽️ Menu Pairings{" "}
              </h3>{" "}
              <div className="flex flex-wrap gap-2">
                {" "}
                {analysis.pairedDishes.slice(0, 6).map((dish, i) => (
                  <span
                    key={i}
                    className="text-xs bg-background dark:bg-slate-700 px-2 py-1 rounded text-purple-700 dark:text-purple-300"
                  >
                    {" "}
                    {dish}{" "}
                  </span>
                ))}{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex-1 overflow-y-auto">
            {" "}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {" "}
              {analysis.pairings.map((wine, idx) => (
                <div
                  key={idx}
                  className="bg-background dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-border flex flex-col"
                >
                  {" "}
                  <div className="flex justify-between items-start mb-3">
                    {" "}
                    <div>
                      {" "}
                      <h3 className="font-semibold text-foreground dark:text-white">
                        {" "}
                        {wine.wine}{" "}
                      </h3>{" "}
                      <p className="text-xs text-muted-foreground">
                        {" "}
                        {wine.grapeVariety} • {wine.region}{" "}
                      </p>{" "}
                    </div>{" "}
                    <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-bold px-2 py-1 rounded">
                      {" "}
                      ⭐ {wine.score}{" "}
                    </span>{" "}
                  </div>{" "}
                  <p className="text-xs text-muted-foreground mb-3 italic">
                    "{wine.flavorProfile}"{" "}
                  </p>{" "}
                  <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                    {" "}
                    <div className="bg-slate-50 dark:bg-slate-700 p-2 rounded">
                      {" "}
                      <p className="text-muted-foreground"> Acidity </p>{" "}
                      <p className="font-bold text-foreground dark:text-white">
                        {" "}
                        {wine.acidity}{" "}
                      </p>{" "}
                    </div>{" "}
                    <div className="bg-slate-50 dark:bg-slate-700 p-2 rounded">
                      {" "}
                      <p className="text-muted-foreground">Body</p>{" "}
                      <p className="font-bold text-foreground dark:text-white">
                        {" "}
                        {wine.body}{" "}
                      </p>{" "}
                    </div>{" "}
                    <div className="bg-green-50 dark:bg-slate-700 p-2 rounded">
                      {" "}
                      <p className="text-muted-foreground"> Margin </p>{" "}
                      <p className="font-bold text-green-600 dark:text-green-400">
                        {" "}
                        {wine.marginPercent.toFixed(0)}%{" "}
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs border-t border-slate-200 dark:border-border pt-3">
                    {" "}
                    <div>
                      {" "}
                      <p className="text-muted-foreground"> Cost/Glass </p>{" "}
                      <p className="font-bold text-foreground dark:text-white">
                        {" "}
                        ${wine.costPerGlass.toFixed(2)}{" "}
                      </p>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <p className="text-muted-foreground">
                        {" "}
                        Retail Price{" "}
                      </p>{" "}
                      <p className="font-bold text-foreground dark:text-white">
                        {" "}
                        ${wine.retailPrice.toFixed(2)}{" "}
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      {" "}
                      Pairs with:{" "}
                    </p>{" "}
                    <div className="flex flex-wrap gap-1">
                      {" "}
                      {wine.pairings.map((p, i) => (
                        <span
                          key={i}
                          className="text-xs bg-slate-100 dark:bg-slate-700 text-foreground px-2 py-1 rounded"
                        >
                          {" "}
                          {p}{" "}
                        </span>
                      ))}{" "}
                    </div>{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </div>{" "}
          <Button
            onClick={() => setAnalysis(null)}
            variant="outline"
            size="sm"
            className="mt-4 w-full"
          >
            {" "}
            Generate Again{" "}
          </Button>{" "}
        </>
      )}{" "}
    </div>
  );
};
export default WineSommelier;
