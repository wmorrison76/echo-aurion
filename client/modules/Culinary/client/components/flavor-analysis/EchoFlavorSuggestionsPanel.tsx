/**
 * Echo Flavor Suggestions Panel
 * 
 * Displays AI-generated improvement suggestions for recipe optimization.
 * Identifies balance issues, fatigue risks, and missing elements.
 * 
 * Props:
 * - recipeJson: Recipe data as JSON string
 * - apiUrl: Base API URL (default: /api)
 */

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader, Lightbulb, AlertCircle, CheckCircle } from "lucide-react";
import type { FlavorAnalysisResult } from "@/shared/echo/flavor-engine";

interface SuggestionsProps {
  recipeJson?: string;
  apiUrl?: string;
}

export const EchoFlavorSuggestionsPanel: React.FC<SuggestionsProps> = ({
  recipeJson,
  apiUrl = "/api",
}) => {
  const [analysis, setAnalysis] = useState<FlavorAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recipeJson) return;

    const analyzeRecipe = async () => {
      setLoading(true);
      setError(null);

      try {
        const recipeData = typeof recipeJson === "string" 
          ? JSON.parse(recipeJson) 
          : recipeJson;

        const response = await fetch(`${apiUrl}/echo/flavor/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(recipeData),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const result = await response.json();
        setAnalysis(result.analysis);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Analysis failed");
      } finally {
        setLoading(false);
      }
    };

    analyzeRecipe();
  }, [recipeJson, apiUrl]);

  if (!recipeJson) {
    return (
      <Card className="p-6">
        <Alert>
          <AlertDescription>
            No recipe data provided. Pass recipeJson prop to get flavor improvement suggestions.
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          Echo's Flavor Insights
        </h3>
        <p className="text-sm text-gray-600">
          AI-generated suggestions to optimize flavor balance and craveability
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {analysis && (
        <>
          {/* Flavor Profile Summary */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Current Flavor Profile:</h4>

            {/* Dominant notes */}
            <div className="space-y-2">
              <div className="text-xs text-gray-600">Character:</div>
              <div className="flex flex-wrap gap-2">
                {analysis.fingerprint.descriptors.map((desc, i) => (
                  <Badge key={i} variant="secondary">
                    {desc}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Top attributes */}
            <div className="text-xs text-gray-600">Dominant Flavors:</div>
            <div className="space-y-1">
              {analysis.fingerprint.attributes
                .sort((a, b) => b.intensity - a.intensity)
                .slice(0, 6)
                .map((attr, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded"
                  >
                    <span className="text-xs">{attr.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded h-1.5">
                        <div
                          className="h-1.5 rounded bg-blue-500"
                          style={{ width: `${attr.intensity * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8 text-right">
                        {(attr.intensity * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Pleasure Curve Insight */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-medium text-sm">Sensory Journey:</h4>

            <div className="space-y-2">
              {analysis.pleasureCurve.likelyFatigue ? (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Palate Fatigue Risk:</strong> The pleasure curve indicates guest enjoyment may decline toward the end of eating.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <strong>Good Engagement:</strong> The pleasure curve maintains strong guest interest throughout.
                  </AlertDescription>
                </Alert>
              )}

              <div className="text-xs text-gray-700 space-y-1 bg-blue-50 p-3 rounded">
                <div>
                  <strong>Pattern:</strong> <span className="capitalize">{analysis.pleasureCurve.pattern}</span>
                </div>
                <div>
                  <strong>Peak Pleasure:</strong> {(analysis.pleasureCurve.peak * 100).toFixed(0)}% at {(analysis.pleasureCurve.peakAt * 100).toFixed(0)}% through meal
                </div>
              </div>
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-medium text-sm">Echo's Recommendations:</h4>

            <div className="space-y-2">
              {analysis.suggestions.map((suggestion, i) => (
                <div
                  key={i}
                  className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-800">{suggestion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Metrics */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-medium text-sm">Technical Metrics:</h4>

            <div className="grid grid-cols-2 gap-3">
              {/* Balance Score */}
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-xs text-gray-600">Balance Score</div>
                <div className="text-2xl font-bold text-blue-600">
                  {calculateBalanceScore(analysis).toFixed(0)}/100
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Flavor dimension distribution
                </div>
              </div>

              {/* Craveability Index */}
              <div className="bg-purple-50 p-3 rounded">
                <div className="text-xs text-gray-600">Craveability Index</div>
                <div className="text-2xl font-bold text-purple-600">
                  {calculateCreaveability(analysis).toFixed(0)}/100
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Predicted repeat desire
                </div>
              </div>

              {/* Complexity */}
              <div className="bg-green-50 p-3 rounded">
                <div className="text-xs text-gray-600">Complexity</div>
                <div className="text-2xl font-bold text-green-600">
                  {calculateComplexity(analysis).toFixed(0)}/100
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Flavor dimension count
                </div>
              </div>

              {/* Engagement */}
              <div className="bg-orange-50 p-3 rounded">
                <div className="text-xs text-gray-600">Engagement Risk</div>
                <div className="text-2xl font-bold text-orange-600">
                  {analysis.pleasureCurve.likelyFatigue ? "High" : "Low"}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Palate fatigue probability
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="space-y-3 border-t pt-4 bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded">
            <h4 className="font-medium text-sm">Next Steps:</h4>
            <ul className="text-xs space-y-1 text-gray-700">
              <li>✓ Implement one suggestion at a time</li>
              <li>✓ Retest with Echo's flavor analyzer</li>
              <li>✓ Gather guest feedback</li>
              <li>✓ Compare before/after profiles</li>
              <li>✓ Optimize plating and presentation</li>
            </ul>
          </div>
        </>
      )}
    </Card>
  );
};

/**
 * Helper: Calculate flavor balance score (0-100)
 * Higher = more balanced across dimensions
 */
function calculateBalanceScore(analysis: FlavorAnalysisResult): number {
  const attrs = analysis.fingerprint.attributes.map(a => a.intensity);
  const avg = attrs.reduce((a, b) => a + b, 0) / attrs.length;
  const variance =
    attrs.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / attrs.length;
  const stdDev = Math.sqrt(variance);
  // Lower stdDev = more balanced. Convert to 0-100 score.
  const score = Math.max(0, 100 - stdDev * 200);
  return score;
}

/**
 * Helper: Calculate craveability (0-100)
 * Based on flavor impact, pleasure curve, and complexity
 */
function calculateCreaveability(analysis: FlavorAnalysisResult): number {
  const peak = analysis.pleasureCurve.peak * 100;
  const complexity = calculateComplexity(analysis);
  const fatiguePenalty = analysis.pleasureCurve.likelyFatigue ? -20 : 0;

  const score = (peak * 0.5 + complexity * 0.3) + fatiguePenalty;
  return Math.max(0, Math.min(100, score));
}

/**
 * Helper: Calculate flavor complexity (0-100)
 * Based on number of significant flavor dimensions
 */
function calculateComplexity(analysis: FlavorAnalysisResult): number {
  const significant = analysis.fingerprint.attributes.filter(
    a => a.intensity > 0.3
  ).length;
  // Max complexity with 12+ dimensions, 0 with 0 dimensions
  return Math.min(100, (significant / 12) * 100);
}

export default EchoFlavorSuggestionsPanel;
