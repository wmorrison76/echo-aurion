"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  TrendingUp,
} from "lucide-react";

interface ValidationResult {
  isValid: boolean;
  confidence: number;
  summary: string;
  concerns: string[];
  recommendations: string[];
  details: {
    sampleSize: number;
    mean: number;
    standardDeviation: number;
    outlierCount: number;
    reproducibilityScore: number;
    changeFromBaseline: number;
    changePercent: number;
  };
}

export function AIValidationPanel() {
  const [results, setResults] = useState<string>("");
  const [baseline, setBaseline] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    // Parse input
    const resultsArray = results
      .split(",")
      .map((v) => parseFloat(v.trim()))
      .filter((v) => !isNaN(v));

    const baselineArray = baseline
      .split(",")
      .map((v) => parseFloat(v.trim()))
      .filter((v) => !isNaN(v));

    if (resultsArray.length < 3 || baselineArray.length < 3) {
      setError("Each dataset must have at least 3 values");
      return;
    }

    setIsLoading(true);
    setError(null);
    setValidation(null);

    try {
      const response = await fetch("/api/rdlabs/ai/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          results: resultsArray,
          baseline: baselineArray,
          notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Validation failed");
      }

      const { data } = await response.json();
      setValidation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-xl border border-violet-500/10">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <BarChart3 className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              AI Result Validation
            </h2>
            <p className="text-xs text-slate-400">
              Statistical analysis & validation
            </p>
          </div>
        </div>
      </div>

      {/* Input Section */}
      {!validation && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              Results (comma-separated values)
            </label>
            <Input
              placeholder="e.g., 100, 102, 101, 99, 100"
              value={results}
              onChange={(e) => setResults(e.target.value)}
              disabled={isLoading}
              className="bg-slate-800/50 border-violet-500/20 text-white placeholder:text-slate-500"
            />
            <p className="text-xs text-slate-400">Enter 3+ measurements</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              Baseline/Control (comma-separated values)
            </label>
            <Input
              placeholder="e.g., 95, 96, 97, 94, 95"
              value={baseline}
              onChange={(e) => setBaseline(e.target.value)}
              disabled={isLoading}
              className="bg-slate-800/50 border-violet-500/20 text-white placeholder:text-slate-500"
            />
            <p className="text-xs text-slate-400">Enter 3+ measurements</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              Notes (optional)
            </label>
            <textarea
              placeholder="Any observations about the data? (e.g., conditions, issues, notes)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              className="w-full bg-slate-800/50 border border-violet-500/20 text-white placeholder:text-slate-500 rounded-lg p-3 text-sm resize-none h-20 focus:border-violet-500/50"
            />
          </div>

          {error && (
            <div className="flex gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <Button
            onClick={handleValidate}
            disabled={isLoading}
            className="w-full gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Validating
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4" />
                Validate Results
              </>
            )}
          </Button>
        </div>
      )}

      {/* Validation Results */}
      {validation && (
        <div className="space-y-4">
          {/* Status Card */}
          <div
            className={`p-4 rounded-lg border ${
              validation.isValid
                ? "bg-green-500/10 border-green-500/20"
                : "bg-orange-500/10 border-orange-500/20"
            }`}
          >
            <div className="flex items-start gap-3">
              {validation.isValid ? (
                <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-white">
                  {validation.summary}
                </h3>
                <p className="text-sm text-slate-300 mt-1">
                  Confidence:{" "}
                  <span className="font-bold text-[#c8a97e]">
                    {validation.confidence}%
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/30">
              <p className="text-xs text-slate-400">Sample Size</p>
              <p className="text-lg font-bold text-[#c8a97e]">
                {validation.details.sampleSize}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/30">
              <p className="text-xs text-slate-400">Mean Value</p>
              <p className="text-lg font-bold text-[#c8a97e]">
                {validation.details.mean.toFixed(2)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/30">
              <p className="text-xs text-slate-400">Std Deviation</p>
              <p className="text-lg font-bold text-[#c8a97e]">
                {validation.details.standardDeviation.toFixed(2)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/30">
              <p className="text-xs text-slate-400">Reproducibility</p>
              <p className="text-lg font-bold text-[#c8a97e]">
                {validation.details.reproducibilityScore.toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Change from Baseline */}
          <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/30">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-[#c8a97e]" />
              <h3 className="font-semibold text-white">Change from Baseline</h3>
            </div>
            <div className="space-y-1">
              <p className="text-sm">
                <span className="text-slate-400">Absolute:</span>{" "}
                <span className="font-bold text-[#c8a97e]">
                  {validation.details.changeFromBaseline > 0 ? "+" : ""}
                  {validation.details.changeFromBaseline.toFixed(2)}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-slate-400">Percent:</span>{" "}
                <span className="font-bold text-[#c8a97e]">
                  {validation.details.changePercent > 0 ? "+" : ""}
                  {validation.details.changePercent.toFixed(1)}%
                </span>
              </p>
            </div>
          </div>

          {/* Outliers */}
          {validation.details.outlierCount > 0 && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-white text-sm">
                    {validation.details.outlierCount} outlier
                    {validation.details.outlierCount !== 1 ? "s" : ""} detected
                  </p>
                  <p className="text-xs text-slate-400">Review data quality</p>
                </div>
              </div>
            </div>
          )}

          {/* Concerns */}
          {validation.concerns.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-yellow-300">
                Concerns
              </h3>
              <ul className="space-y-1">
                {validation.concerns.map((concern, idx) => (
                  <li key={idx} className="text-sm text-slate-300 flex gap-2">
                    <span className="text-yellow-400">•</span>
                    {concern}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {validation.recommendations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-green-300">
                Recommendations
              </h3>
              <ul className="space-y-1">
                {validation.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-slate-300 flex gap-2">
                    <span className="text-green-400">→</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-slate-700/30">
            <Button
              onClick={() => {
                setValidation(null);
                setResults("");
                setBaseline("");
                setNotes("");
              }}
              variant="outline"
              className="flex-1"
            >
              Validate Another
            </Button>
            <Button className="flex-1 gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white">
              <CheckCircle2 className="h-4 w-4" />
              Approve Results
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!validation && !isLoading && (
        <div className="py-6 text-center">
          <p className="text-slate-400 text-sm">
            Enter your experimental results to validate
          </p>
        </div>
      )}
    </div>
  );
}
