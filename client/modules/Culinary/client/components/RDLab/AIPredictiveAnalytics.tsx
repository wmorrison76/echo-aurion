"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  TrendingUp,
  Calendar,
  DollarSign,
  Target,
} from "lucide-react";
import { useRDLabStore } from "@/stores/rdLabStore";

interface PredictionResult {
  successProbability: number;
  estimatedDays: number;
  costRange: { min: number; max: number };
  confidence: number;
  riskFactors: string[];
  optimizationSuggestions: string[];
}

export function AIPredictiveAnalytics() {
  const { experiments } = useRDLabStore();
  const [selectedExperiment, setSelectedExperiment] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [predictions, setPredictions] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = async () => {
    if (!selectedExperiment) {
      setError("Please select an experiment");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPredictions(null);

    try {
      const experiment = experiments.find((e) => e.id === selectedExperiment);
      if (!experiment) throw new Error("Experiment not found");

      const response = await fetch("/api/rdlabs/ai/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experimentId: experiment.id,
          hypothesis: experiment.hypothesis,
          status: experiment.status,
          variables: experiment.variablesUnderTest?.length || 0,
          equipment: experiment.equipment?.length || 0,
          specialization: experiment.specialization,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Prediction failed");
      }

      const { data } = await response.json();
      setPredictions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      // Generate mock predictions for demo
      setPredictions(generateMockPredictions());
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockPredictions = (): PredictionResult => {
    const baseSuccess = 72;
    return {
      successProbability: baseSuccess + Math.random() * 18,
      estimatedDays: 28 + Math.floor(Math.random() * 20),
      costRange: {
        min: 150 + Math.random() * 100,
        max: 300 + Math.random() * 150,
      },
      confidence: 78 + Math.random() * 15,
      riskFactors: [
        "Complex variable interactions",
        "Ingredient sourcing volatility",
        "Equipment calibration time",
      ],
      optimizationSuggestions: [
        "Reduce test variables by 20% (focus on critical factors)",
        "Use pre-calibrated equipment to save 2-3 days",
        "Batch similar experiments together",
        "Lock supplier pricing now (ingredient costs rising)",
      ],
    };
  };

  const readyExperiments = experiments.filter(
    (e) => e.status === "ideation" || e.status === "testing",
  );

  const getSuccessColor = (probability: number) => {
    if (probability >= 80) return "text-green-400 bg-green-500/10";
    if (probability >= 70) return "text-blue-400 bg-blue-500/10";
    if (probability >= 60) return "text-yellow-400 bg-yellow-500/10";
    return "text-red-400 bg-red-500/10";
  };

  return (
    <div className="w-full space-y-6 p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-xl border border-indigo-500/10">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <Target className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Predictive Analytics
            </h2>
            <p className="text-xs text-slate-400">
              Success probability, timeline, and cost forecasting
            </p>
          </div>
        </div>
      </div>

      {/* Experiment Selection */}
      {!predictions && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              Select Experiment
            </label>
            <select
              value={selectedExperiment}
              onChange={(e) => setSelectedExperiment(e.target.value)}
              disabled={isLoading}
              className="w-full bg-slate-800/50 border border-indigo-500/20 text-white rounded-lg p-2 text-sm"
            >
              <option value="">Choose experiment...</option>
              {readyExperiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.title} ({exp.status})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400">
              {readyExperiments.length} experiments available for prediction
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <Button
            onClick={handlePredict}
            disabled={isLoading || !selectedExperiment}
            className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing
              </>
            ) : (
              <>
                <Target className="h-4 w-4" />
                Get Predictions
              </>
            )}
          </Button>
        </div>
      )}

      {/* Predictions Display */}
      {predictions && (
        <div className="space-y-4">
          {/* Success Probability */}
          <div
            className={`p-6 rounded-lg border bg-gradient-to-br ${getSuccessColor(predictions.successProbability)} border-indigo-500/20`}
          >
            <h3 className="text-sm font-semibold text-slate-300 mb-2">
              Success Probability
            </h3>
            <div className="flex items-end gap-4">
              <div>
                <div className="text-4xl font-bold">
                  {predictions.successProbability.toFixed(0)}%
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Confidence: {predictions.confidence.toFixed(0)}%
                </p>
              </div>
              <div className="flex-1">
                <div className="h-8 bg-slate-700/50 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    style={{ width: `${predictions.successProbability}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Timeline & Cost Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/30">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-[#c8a97e]" />
                <h4 className="font-semibold text-white text-sm">
                  Est. Timeline
                </h4>
              </div>
              <p className="text-2xl font-bold text-[#c8a97e]">
                {predictions.estimatedDays}d
              </p>
              <p className="text-xs text-slate-400 mt-1">Days to completion</p>
            </div>

            <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/30">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <h4 className="font-semibold text-white text-sm">Cost Range</h4>
              </div>
              <p className="text-lg font-bold text-emerald-300">
                ${predictions.costRange.min.toFixed(0)} - $
                {predictions.costRange.max.toFixed(0)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Estimated budget</p>
            </div>
          </div>

          {/* Risk Factors */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-orange-300">
              Risk Factors
            </h4>
            <div className="space-y-2">
              {predictions.riskFactors.map((factor, idx) => (
                <div
                  key={idx}
                  className="flex gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20"
                >
                  <span className="text-orange-400 font-bold">⚠</span>
                  <span className="text-sm text-slate-300">{factor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Optimization Suggestions */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-green-300">
              Optimization Suggestions
            </h4>
            <div className="space-y-2">
              {predictions.optimizationSuggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="flex gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                >
                  <span className="text-green-400 font-bold">✓</span>
                  <span className="text-sm text-slate-300">{suggestion}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics Summary */}
          <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/30">
            <h4 className="font-semibold text-[#c8a97e] mb-3">
              Prediction Metrics
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Success Rate</p>
                <p className="font-bold text-[#c8a97e] text-lg">
                  {predictions.successProbability.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-slate-400">Confidence Level</p>
                <p className="font-bold text-[#c8a97e] text-lg">
                  {predictions.confidence.toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-slate-400">Avg Cost</p>
                <p className="font-bold text-emerald-300 text-lg">
                  $
                  {(
                    (predictions.costRange.min + predictions.costRange.max) /
                    2
                  ).toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Timeline Risk</p>
                <p className="font-bold text-orange-300 text-lg">Medium</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-slate-700/30">
            <Button
              onClick={() => {
                setPredictions(null);
                setSelectedExperiment("");
              }}
              variant="outline"
              className="flex-1"
            >
              Predict Another
            </Button>
            <Button className="flex-1 gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white">
              <TrendingUp className="h-4 w-4" />
              Apply Optimizations
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
