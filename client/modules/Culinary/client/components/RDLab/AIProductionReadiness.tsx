"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Zap,
} from "lucide-react";
import { useRDLabStore } from "@/stores/rdLabStore";

interface ReadinessCheckResult {
  isReady: boolean;
  readinessScore: number;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
  documentation: {
    sop: string;
    allergenStatement: string;
    nutritionLabel: string;
  };
  recommendations: string[];
}

interface ExperimentForReadiness {
  id: string;
  title: string;
  hypothesis: string;
  sensoryTargets?: string[];
  cost_locked?: boolean;
  cost_per_portion?: number;
  equipment?: string[];
  procedure?: string;
  ingredients?: Array<{ name: string; amount: string }>;
}

export function AIProductionReadiness() {
  const { experiments } = useRDLabStore();
  const [selectedExperiment, setSelectedExperiment] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ReadinessCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!selectedExperiment) {
      setError("Please select an experiment");
      return;
    }

    const experiment = experiments.find((e) => e.id === selectedExperiment);
    if (!experiment) {
      setError("Experiment not found");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/rdlabs/ai/production-readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experimentId: experiment.id,
          title: experiment.title,
          hypothesis: experiment.hypothesis,
          sensoryTargets: experiment.sensoryTargets || [],
          procedure: experiment.testPlan?.join("\n") || "",
          ingredients: experiment.equipment || [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Check failed");
      }

      const { data } = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const readyExperiments = experiments.filter(
    (e) => e.status === "testing" || e.status === "ready",
  );

  return (
    <div className="w-full space-y-6 p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-xl border border-amber-500/10">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Zap className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Production Readiness Check
            </h2>
            <p className="text-xs text-slate-400">
              Evaluate recipe for production deployment
            </p>
          </div>
        </div>
      </div>

      {/* Experiment Selection */}
      {!result && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              Select Experiment
            </label>
            <select
              value={selectedExperiment}
              onChange={(e) => setSelectedExperiment(e.target.value)}
              disabled={isLoading}
              className="w-full bg-slate-800/50 border border-amber-500/20 text-white rounded-lg p-2 text-sm"
            >
              <option value="">Choose experiment...</option>
              {readyExperiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.title} ({exp.status})
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="flex gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <Button
            onClick={handleCheck}
            disabled={isLoading || !selectedExperiment}
            className="w-full gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Check Readiness
              </>
            )}
          </Button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Score Card */}
          <div
            className={`p-6 rounded-lg border ${
              result.isReady
                ? "bg-green-500/10 border-green-500/20"
                : "bg-orange-500/10 border-orange-500/20"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {result.isReady ? (
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-orange-400" />
                )}
                <div>
                  <h3 className="font-semibold text-white text-lg">
                    {result.isReady ? "Ready for Production" : "Not Yet Ready"}
                  </h3>
                  <p className="text-sm text-slate-300">
                    {result.isReady
                      ? "All checks passed. Ready to deploy."
                      : "Complete remaining items to deploy."}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-[#c8a97e]">
                  {result.readinessScore}%
                </p>
                <p className="text-xs text-slate-400">Readiness Score</p>
              </div>
            </div>
          </div>

          {/* Checks */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#c8a97e]">
              Production Checks
            </h3>
            <div className="space-y-2">
              {result.checks.map((check, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border flex items-start gap-3 ${
                    check.passed
                      ? "bg-green-500/10 border-green-500/20"
                      : "bg-orange-500/10 border-orange-500/20"
                  }`}
                >
                  {check.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-white text-sm">
                      {check.name}
                    </p>
                    <p className="text-xs text-slate-300">{check.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-blue-300">
                Recommendations
              </h3>
              <ul className="space-y-1">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-slate-300 flex gap-2">
                    <span className="text-blue-400">→</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* SOP Preview */}
          {result.documentation.sop && (
            <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/30">
              <h4 className="font-semibold text-emerald-300 mb-2">
                SOP Generated
              </h4>
              <p className="text-xs text-slate-400 mb-3">
                Standard Operating Procedure ready for production team
              </p>
              <div className="bg-slate-950/40 rounded p-3 text-xs text-slate-300 max-h-32 overflow-hidden">
                <p className="line-clamp-4">
                  {result.documentation.sop.substring(0, 200)}...
                </p>
              </div>
            </div>
          )}

          {/* Allergen Statement */}
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <h4 className="font-semibold text-red-300 mb-2">
              Allergen Statement
            </h4>
            <p className="text-sm text-slate-300">
              {result.documentation.allergenStatement}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-slate-700/30">
            {result.isReady && (
              <Button className="flex-1 gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white">
                <CheckCircle2 className="h-4 w-4" />
                Approve for Production
              </Button>
            )}
            <Button
              onClick={() => {
                setResult(null);
                setSelectedExperiment("");
              }}
              variant="outline"
              className="flex-1"
            >
              Check Another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
