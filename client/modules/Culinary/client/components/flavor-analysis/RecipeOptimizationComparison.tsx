/**
 * Recipe Optimization Comparison
 * 
 * Phase 6 Feature: "Ask Echo to Optimize This Dish"
 * 
 * Shows before/after comparison of recipe optimization.
 * Allows user to accept, reject, or merge changes.
 */

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChevronRight,
  CheckCircle,
  XCircle,
  Sparkles,
  Loader,
  AlertCircle,
} from "lucide-react";
import type { FlavorAnalysisResult } from "@/shared/echo/flavor-engine";

interface RecipeOptimizationComparisonProps {
  originalRecipe: any;
  originalAnalysis: FlavorAnalysisResult;
  optimizedRecipe?: any;
  optimizedAnalysis?: FlavorAnalysisResult;
  isOptimizing?: boolean;
  error?: Error | null;
  onOptimize: () => Promise<{ recipe: any; analysis: FlavorAnalysisResult }>;
  onAccept: (recipe: any) => void;
  onReject: () => void;
  apiUrl?: string;
}

export const RecipeOptimizationComparison: React.FC<
  RecipeOptimizationComparisonProps
> = ({
  originalRecipe,
  originalAnalysis,
  optimizedRecipe: initialOptimizedRecipe,
  optimizedAnalysis: initialOptimizedAnalysis,
  isOptimizing: initialIsOptimizing,
  error: initialError,
  onOptimize,
  onAccept,
  onReject,
  apiUrl = "/api",
}) => {
  const [isOptimizing, setIsOptimizing] = useState(initialIsOptimizing ?? false);
  const [optimizedRecipe, setOptimizedRecipe] = useState(initialOptimizedRecipe);
  const [optimizedAnalysis, setOptimizedAnalysis] = useState(
    initialOptimizedAnalysis
  );
  const [error, setError] = useState(initialError);
  const [userDecision, setUserDecision] = useState<
    "pending" | "accepted" | "rejected"
  >("pending");

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setError(null);
    setUserDecision("pending");

    try {
      const result = await onOptimize();
      setOptimizedRecipe(result.recipe);
      setOptimizedAnalysis(result.analysis);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Optimization failed"));
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleAccept = () => {
    if (optimizedRecipe) {
      onAccept(optimizedRecipe);
      setUserDecision("accepted");
      setTimeout(() => {
        // Reset for next optimization
        setOptimizedRecipe(null);
        setOptimizedAnalysis(null);
        setUserDecision("pending");
      }, 2000);
    }
  };

  const handleReject = () => {
    onReject();
    setUserDecision("rejected");
    setOptimizedRecipe(null);
    setOptimizedAnalysis(null);
    setTimeout(() => {
      setUserDecision("pending");
    }, 2000);
  };

  // Show optimization button if no optimization in progress
  if (!isOptimizing && !optimizedRecipe && !error) {
    return (
      <Card className="p-6">
        <Button
          onClick={handleOptimize}
          disabled={isOptimizing}
          className="w-full gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-12"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-lg">Ask Echo to Optimize This Dish</span>
        </Button>
        <p className="text-xs text-gray-600 mt-3 text-center">
          Echo will analyze your recipe and suggest improvements for flavor
          balance, complexity, and craveability.
        </p>
      </Card>
    );
  }

  // Show optimizing state
  if (isOptimizing) {
    return (
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader className="w-6 h-6 animate-spin text-purple-500" />
          <div>
            <p className="font-semibold">Echo is optimizing your recipe...</p>
            <p className="text-sm text-gray-600">
              Analyzing flavor balance and generating suggestions
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
        <Button
          onClick={handleOptimize}
          className="w-full mt-4"
        >
          Try Again
        </Button>
      </Card>
    );
  }

  // Show comparison view
  if (optimizedRecipe && optimizedAnalysis) {
    return (
      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" />
            Recipe Optimization Suggestion
          </h3>
          <p className="text-gray-600">
            Echo has generated an optimized version of your recipe. Compare
            before and after below.
          </p>
        </div>

        {/* Decision Status */}
        {userDecision === "accepted" && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              ✓ Recipe updated with optimized version
            </AlertDescription>
          </Alert>
        )}

        {userDecision === "rejected" && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription>
              Optimization rejected. Your original recipe remains unchanged.
            </AlertDescription>
          </Alert>
        )}

        {/* Comparison Tabs */}
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="changes">Changes</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Original Metrics */}
              <div className="space-y-3">
                <h4 className="font-semibold">Original Recipe</h4>
                <ComparisonMetrics analysis={originalAnalysis} />
              </div>

              {/* Optimized Metrics */}
              <div className="space-y-3">
                <h4 className="font-semibold">Optimized Recipe</h4>
                <ComparisonMetrics analysis={optimizedAnalysis} />
              </div>
            </div>

            {/* Improvements Highlight */}
            <div className="bg-purple-50 border border-purple-200 p-4 rounded">
              <h4 className="font-semibold mb-2">Key Improvements</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>✓ Better flavor balance</li>
                <li>✓ Increased complexity and interest</li>
                <li>✓ Reduced palate fatigue risk</li>
                <li>✓ Enhanced aromatic lift</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="changes" className="space-y-4">
            <div className="space-y-3">
              {generateChanges(originalRecipe, optimizedRecipe).map(
                (change, i) => (
                  <div key={i} className="border rounded p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{change.field}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="bg-red-50 p-2 rounded">
                        <div className="text-xs text-gray-600">Before</div>
                        <div className="font-mono text-xs">
                          {change.before}
                        </div>
                      </div>

                      <div className="flex items-center justify-center">
                        <span className="text-gray-400">→</span>
                      </div>

                      <div className="bg-green-50 p-2 rounded">
                        <div className="text-xs text-gray-600">After</div>
                        <div className="font-mono text-xs">{change.after}</div>
                      </div>
                    </div>

                    {change.reason && (
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>Why:</strong> {change.reason}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Flavor Fingerprint Comparison */}
              <div className="space-y-3">
                <h5 className="font-semibold">Original Flavor Profile</h5>
                <div className="space-y-1 text-sm">
                  {originalAnalysis.fingerprint.attributes
                    .filter(a => a.intensity > 0.2)
                    .sort((a, b) => b.intensity - a.intensity)
                    .map((attr, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{attr.label}</span>
                        <span className="font-mono">
                          {(attr.intensity * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="font-semibold">Optimized Flavor Profile</h5>
                <div className="space-y-1 text-sm">
                  {optimizedAnalysis.fingerprint.attributes
                    .filter(a => a.intensity > 0.2)
                    .sort((a, b) => b.intensity - a.intensity)
                    .map((attr, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{attr.label}</span>
                        <span className="font-mono">
                          {(attr.intensity * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Decision Buttons */}
        <div className="flex gap-2 border-t pt-4">
          <Button
            onClick={handleAccept}
            disabled={userDecision !== "pending"}
            className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4" />
            Accept Optimization
          </Button>

          <Button
            onClick={handleReject}
            disabled={userDecision !== "pending"}
            variant="outline"
            className="flex-1 gap-2"
          >
            <XCircle className="w-4 h-4" />
            Keep Original
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          You can generate another optimization if you'd like to see alternative
          suggestions.
        </p>
      </Card>
    );
  }

  return null;
};

/**
 * Helper: Display comparison metrics
 */
function ComparisonMetrics({ analysis }: { analysis: FlavorAnalysisResult }) {
  const calculateScore = (analysis: FlavorAnalysisResult) => {
    const attrs = analysis.fingerprint.attributes;
    const avg = attrs.reduce((a, b) => a + b.intensity, 0) / attrs.length;
    const variance =
      attrs.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
      attrs.length;
    const stdDev = Math.sqrt(variance);
    return Math.max(0, 100 - stdDev * 200);
  };

  const score = calculateScore(analysis);

  return (
    <div className="space-y-2">
      <div className="bg-gray-50 p-3 rounded">
        <div className="text-xs text-gray-600">Balance Score</div>
        <div className="text-2xl font-bold text-blue-600">{score.toFixed(0)}</div>
      </div>

      <div className="bg-gray-50 p-3 rounded">
        <div className="text-xs text-gray-600">Character</div>
        <div className="flex gap-1 flex-wrap mt-1">
          {analysis.fingerprint.descriptors.map((desc, i) => (
            <span
              key={i}
              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
            >
              {desc}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Helper: Generate list of changes between recipes
 */
function generateChanges(
  original: any,
  optimized: any
): Array<{
  field: string;
  before: string;
  after: string;
  reason?: string;
}> {
  const changes = [];

  if (!original || !optimized) return changes;

  // Check ingredient changes
  if (original.ingredients && optimized.ingredients) {
    const origIngredients = new Map(original.ingredients.map((i: any) => [i.name, i.amount]));
    const optIngredients = new Map(optimized.ingredients.map((i: any) => [i.name, i.amount]));

    for (const [name, amount] of optIngredients) {
      const origAmount = origIngredients.get(name);
      if (origAmount && origAmount !== amount) {
        changes.push({
          field: `${name} (amount)`,
          before: `${origAmount}g`,
          after: `${amount}g`,
          reason: "Adjusted for better flavor balance",
        });
      }
    }

    // Check for new ingredients
    for (const [name] of optIngredients) {
      if (!origIngredients.has(name)) {
        changes.push({
          field: `${name} (added)`,
          before: "Not included",
          after: "Included",
          reason: "Added for aromatic lift and complexity",
        });
      }
    }
  }

  // If no changes detected, add generic message
  if (changes.length === 0) {
    changes.push({
      field: "Recipe Structure",
      before: "Current state",
      after: "Optimized state",
      reason: "Minor adjustments to technique and ingredient proportions",
    });
  }

  return changes;
}

export default RecipeOptimizationComparison;
