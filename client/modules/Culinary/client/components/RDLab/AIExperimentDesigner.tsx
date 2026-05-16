"use client";

import React, { useState } from "react";
import { useRDLabStore } from "@/stores/rdLabStore";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import { ExperimentDesignResponse } from "@/server/lib/ai-llm-service";
import { RecipeSimilaritySearch } from "./RecipeSimilaritySearch";
import { CrossTrackLearning } from "./CrossTrackLearning";

export function AIExperimentDesigner() {
  const [goal, setGoal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [design, setDesign] = useState<ExperimentDesignResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDraft, setShowDraft] = useState(false);
  const [showSimilarRecipes, setShowSimilarRecipes] = useState(false);
  const [recipeTrack, setRecipeTrack] = useState<
    "fine-dining" | "manufacturing"
  >("fine-dining");
  const { createExperiment } = useRDLabStore();
  const { user } = useAuth();

  const handleDesign = async () => {
    if (!goal.trim()) {
      setError("Please describe your research goal");
      return;
    }

    setIsLoading(true);
    setError(null);
    setDesign(null);

    try {
      const response = await fetch("/api/rdlabs/ai/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          context: {
            specialization: "culinary",
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to design experiment",
        );
      }

      const { data } = await response.json();
      setDesign(data);
      setShowDraft(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateExperiment = () => {
    if (!design) return;

    const experimentId = createExperiment({
      title: goal,
      hypothesis: design.hypothesis,
      owner: "Current User",
      tags: ["ai-designed", "v1"],
      variablesUnderTest: design.variables.map(
        (v) => `${v.name} (${v.min}-${v.max} ${v.unit})`,
      ),
      sensoryTargets: design.successCriteria.map((c) => c.metric),
      testPlan: design.estimatedTimeline.phases,
      equipment: design.equipmentNeeded,
      textureObjectives: [],
      flavorConstellations: [],
      futureFoodAngles: [],
      notes: `AI-Generated Design Confidence: ${design.confidenceScore}%\n\nHypothesis: ${design.hypothesis}`,
    });

    // Reset form
    setGoal("");
    setDesign(null);
    setError(null);
  };

  return (
    <div className="w-full space-y-6 p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-xl border border-[#c8a97e]/10">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#c8a97e]/08 border border-[#c8a97e]/15">
            <Sparkles className="h-5 w-5 text-[#c8a97e]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              AI Experiment Designer
            </h2>
            <p className="text-xs text-slate-400">
              Design rigorous experiments in seconds
            </p>
          </div>
        </div>
      </div>

      {/* Recipe Similarity Search */}
      {user && (
        <div className="space-y-2">
          <button
            onClick={() => setShowSimilarRecipes(!showSimilarRecipes)}
            className="flex items-center gap-2 text-sm font-semibold text-[#c8a97e] hover:text-[#c8a97e]/80 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            {showSimilarRecipes
              ? "Hide Inspiration"
              : "Find Recipe Inspiration"}
          </button>
          {showSimilarRecipes && (
            <>
              <RecipeSimilaritySearch
                recipeText={goal}
                userTrack={recipeTrack}
                chefId={user.id}
                organizationId={user.organization_id}
                limit={5}
              />
              {recipeTrack === "manufacturing" && (
                <CrossTrackLearning
                  recipeText={goal}
                  organizationId={user.organization_id}
                  limit={3}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="What would you like to create? (e.g., 'Stable molecular foam using dairy alternatives')"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={isLoading}
            className="bg-slate-800/50 border-[#c8a97e]/15 text-white placeholder:text-slate-500 focus:border-[#c8a97e]/50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isLoading) {
                handleDesign();
              }
            }}
          />
          <Button
            onClick={handleDesign}
            disabled={isLoading}
            className="gap-2 bg-gradient-to-r from-[#c8a97e] to-blue-600 hover:from-[#b8976c] hover:to-blue-700 text-white border-0 whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Designing
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Design
              </>
            )}
          </Button>
        </div>
        {error && (
          <div className="flex gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
      </div>

      {/* Design Output */}
      {design && (
        <div className="space-y-4">
          {/* Confidence & Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
              <p className="text-xs text-slate-400">Confidence</p>
              <p className="text-xl font-bold text-[#c8a97e]">
                {design.confidenceScore}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
              <p className="text-xs text-slate-400">Est. Duration</p>
              <p className="text-xl font-bold text-[#c8a97e]">
                {design.testMatrix.duration_days}d
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
              <p className="text-xs text-slate-400">Sample Size</p>
              <p className="text-xl font-bold text-[#c8a97e]">
                {design.testMatrix.sampleSize}
              </p>
            </div>
          </div>

          {/* Hypothesis */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#c8a97e]">Hypothesis</h3>
            <p className="text-sm text-slate-300 leading-relaxed p-3 bg-slate-800/40 rounded-lg border border-slate-700/30">
              {design.hypothesis}
            </p>
          </div>

          {/* Variables Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#c8a97e]">
              Test Variables
            </h3>
            <div className="grid gap-2">
              {design.variables.map((variable, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/30 space-y-1"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-white text-sm">
                        {variable.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {variable.rationale}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        variable.importance === "critical"
                          ? "bg-red-500/20 text-red-300"
                          : variable.importance === "important"
                            ? "bg-yellow-500/20 text-yellow-300"
                            : "bg-blue-500/20 text-blue-300"
                      }`}
                    >
                      {variable.importance}
                    </span>
                  </div>
                  <p className="text-sm text-[#c8a97e] font-mono">
                    {variable.min} — {variable.max} {variable.unit}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Success Criteria */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#c8a97e]">
              Success Criteria
            </h3>
            <div className="space-y-2">
              {design.successCriteria.map((criteria, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/30 flex items-start gap-3"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">
                      {criteria.metric}
                    </p>
                    <p className="text-xs text-slate-400">
                      {criteria.how_measured}
                    </p>
                    <p className="text-sm text-[#c8a97e] font-mono mt-1">
                      Target: {criteria.target}{" "}
                      {criteria.unit ? `(${criteria.unit})` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Flags */}
          {design.riskFlags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[#c8a97e]">
                Risk Assessment
              </h3>
              <div className="space-y-2">
                {design.riskFlags.map((flag, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      flag.severity === "high"
                        ? "bg-red-500/10 border-red-500/20"
                        : flag.severity === "medium"
                          ? "bg-yellow-500/10 border-yellow-500/20"
                          : "bg-blue-500/10 border-blue-500/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                          flag.severity === "high"
                            ? "text-red-400"
                            : flag.severity === "medium"
                              ? "text-yellow-400"
                              : "text-blue-400"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">
                          {flag.risk}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          <strong>Mitigation:</strong> {flag.mitigation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#c8a97e]">
              Timeline & Phases
            </h3>
            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/30 space-y-2">
              <p className="text-sm text-slate-300">
                <strong>Total:</strong> {design.estimatedTimeline.days} days
              </p>
              <p className="text-xs text-slate-400">
                {design.estimatedTimeline.critical_path}
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {design.estimatedTimeline.phases.map((phase, idx) => (
                  <div
                    key={idx}
                    className="text-xs p-2 bg-slate-700/40 rounded border border-slate-600/30"
                  >
                    {phase}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Equipment */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#c8a97e]">
              Equipment Required
            </h3>
            <div className="flex flex-wrap gap-2">
              {design.equipmentNeeded.map((item, idx) => (
                <span
                  key={idx}
                  className="text-xs px-3 py-1 rounded-full bg-slate-800/40 border border-slate-700/30 text-slate-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-slate-700/30">
            <Button
              onClick={handleCreateExperiment}
              className="flex-1 gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4" />
              Create Experiment
            </Button>
            <Button
              onClick={() => {
                setDesign(null);
                setGoal("");
              }}
              variant="outline"
              className="flex-1"
            >
              Start Over
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!design && !isLoading && !error && (
        <div className="py-8 text-center space-y-3">
          <div className="p-3 rounded-full bg-[#c8a97e]/08 w-fit mx-auto">
            <Sparkles className="h-6 w-6 text-[#c8a97e]" />
          </div>
          <p className="text-slate-400 text-sm">
            Describe your research goal to get started
          </p>
        </div>
      )}
    </div>
  );
}
