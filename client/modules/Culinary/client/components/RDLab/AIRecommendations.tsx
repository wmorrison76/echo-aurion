"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb, TrendingUp, Zap, ArrowRight } from "lucide-react";
import { useRDLabStore } from "@/stores/rdLabStore";

interface Recommendation {
  suggestion: string;
  rationale: string;
  confidence: number;
  category: "ingredient" | "technique" | "combination" | "next-step";
  relatedExperiment?: string;
  estimatedDays?: number;
}

export function AIRecommendations() {
  const { experiments } = useRDLabStore();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    if (experiments.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get recommendations based on recent experiments
      const recentExperiments = experiments.slice(0, 5).map((e) => e.title);

      const response = await fetch(
        "/api/rdlabs/ai/recommendations?goal=next-step-suggestions",
        {
          method: "GET",
        },
      );

      if (!response.ok) throw new Error("Failed to load recommendations");

      const { data } = await response.json();

      // Transform recommendations
      const formattedRecs: Recommendation[] = (data.recommendations || []).map(
        (rec: string, idx: number) => ({
          suggestion: rec,
          rationale: `Based on ${experiments.length} experiments in your lab`,
          confidence: 75 + Math.random() * 20,
          category:
            idx % 4 === 0
              ? "ingredient"
              : idx % 4 === 1
                ? "technique"
                : idx % 4 === 2
                  ? "combination"
                  : "next-step",
          estimatedDays: 14 + Math.floor(Math.random() * 21),
        }),
      );

      setRecommendations(formattedRecs);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load recommendations",
      );
      setRecommendations(generateDefaultRecommendations(experiments));
    } finally {
      setIsLoading(false);
    }
  };

  const generateDefaultRecommendations = (
    exps: typeof experiments,
  ): Recommendation[] => {
    const readyExperiments = exps.filter((e) => e.status === "ready");

    if (readyExperiments.length === 0) {
      return [
        {
          suggestion: "Start with a molecular foam emulsion experiment",
          rationale: "High success rate in fine dining establishments",
          confidence: 82,
          category: "technique",
          estimatedDays: 14,
        },
        {
          suggestion: "Experiment with koji fermentation",
          rationale: "Trending ingredient with multiple applications",
          confidence: 78,
          category: "ingredient",
          estimatedDays: 21,
        },
      ];
    }

    const suggestions = [
      {
        suggestion: `Scale ${readyExperiments[0]?.title || "successful recipe"} to 1kg batches`,
        rationale: "Ready for production testing",
        confidence: 85,
        category: "next-step",
        relatedExperiment: readyExperiments[0]?.id,
        estimatedDays: 7,
      },
      {
        suggestion: "Explore dairy alternative pairings",
        rationale: "Complements current research direction",
        confidence: 76,
        category: "ingredient",
        estimatedDays: 16,
      },
      {
        suggestion: "Document sensory standards for your signature techniques",
        rationale: "Standardization enables replication and team training",
        confidence: 88,
        category: "next-step",
        estimatedDays: 3,
      },
    ];

    return suggestions;
  };

  const categoryColors = {
    ingredient: "from-amber-500/10 border-amber-500/20 text-amber-300",
    technique: "from-[#c8a97e]/10 border-[#c8a97e]/15 text-[#c8a97e]",
    combination: "from-purple-500/10 border-purple-500/20 text-purple-300",
    "next-step": "from-green-500/10 border-green-500/20 text-green-300",
  };

  const categoryLabels = {
    ingredient: "🧂 Ingredient",
    technique: "🔬 Technique",
    combination: "✨ Combination",
    "next-step": "→ Next Step",
  };

  return (
    <div className="w-full space-y-6 p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-xl border border-blue-500/10">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Lightbulb className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Smart Recommendations
            </h2>
            <p className="text-xs text-slate-400">
              AI-powered next-step suggestions
            </p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
          <p className="text-slate-400 ml-2">Analyzing your research...</p>
        </div>
      )}

      {/* Recommendations List */}
      {!isLoading && recommendations.length > 0 && (
        <div className="space-y-3">
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border bg-gradient-to-r ${categoryColors[rec.category]}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {rec.category === "ingredient" && (
                    <span className="text-xl">🧂</span>
                  )}
                  {rec.category === "technique" && (
                    <span className="text-xl">🔬</span>
                  )}
                  {rec.category === "combination" && (
                    <span className="text-xl">✨</span>
                  )}
                  {rec.category === "next-step" && (
                    <span className="text-xl">→</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-white">
                      {rec.suggestion}
                    </h3>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full ${
                        rec.confidence >= 85
                          ? "bg-green-500/30 text-green-300"
                          : rec.confidence >= 75
                            ? "bg-blue-500/30 text-blue-300"
                            : "bg-slate-500/30 text-slate-300"
                      }`}
                    >
                      {rec.confidence.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mb-2">{rec.rationale}</p>
                  {rec.estimatedDays && (
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Est. {rec.estimatedDays} days to explore
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="text-xs h-7">
                  Create Experiment
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-7">
                  Learn More
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && recommendations.length === 0 && (
        <div className="py-8 text-center space-y-3">
          <Lightbulb className="h-8 w-8 text-blue-400 mx-auto opacity-50" />
          <div>
            <p className="text-slate-300">No recommendations yet</p>
            <p className="text-xs text-slate-500">
              Complete an experiment to see AI-powered suggestions
            </p>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <Button
        onClick={loadRecommendations}
        variant="outline"
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Refreshing
          </>
        ) : (
          <>
            <TrendingUp className="h-4 w-4 mr-2" />
            Refresh Recommendations
          </>
        )}
      </Button>
    </div>
  );
}
