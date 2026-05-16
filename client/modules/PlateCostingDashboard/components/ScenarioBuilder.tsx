import React, { useState } from "react";
import { cn } from "@/lib/glass";
import { X, Plus, Trash2, RotateCcw } from "lucide-react";

export interface ScenarioChange {
  type: "ingredient_price" | "quantity" | "yield";
  ingredientName?: string;
  oldValue: number;
  newValue: number;
  impact: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  changes: ScenarioChange[];
  projectedCost: number;
  projectedMargin: number;
  baseCost: number;
  baseMargin: number;
  createdAt: Date;
}

export interface ScenarioBuilderProps {
  recipeId?: string | null;
  onClose: () => void;
}

/**
 * Scenario Builder Component
 *
 * Allows users to:
 * - Adjust ingredient quantities
 * - Change ingredient costs
 * - Modify yield percentages
 * - See real-time cost impact
 * - Save scenarios for comparison
 */
export function ScenarioBuilder({ recipeId, onClose }: ScenarioBuilderProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(
    null
  );
  const [scenarioName, setScenarioName] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Example base cost and margin
  const baseCost = 8.75;
  const baseMargin = 67.8;

  const handleCreateScenario = () => {
    if (!scenarioName.trim()) return;

    const newScenario: Scenario = {
      id: Date.now().toString(),
      name: scenarioName,
      description: "Custom scenario",
      changes: [],
      projectedCost: baseCost,
      projectedMargin: baseMargin,
      baseCost,
      baseMargin,
      createdAt: new Date(),
    };

    setScenarios([...scenarios, newScenario]);
    setSelectedScenario(newScenario);
    setScenarioName("");
    setShowForm(false);
  };

  const handleDeleteScenario = (id: string) => {
    setScenarios(scenarios.filter((s) => s.id !== id));
    if (selectedScenario?.id === id) {
      setSelectedScenario(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-foreground">Scenario Builder</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6">
          {/* Create New Scenario */}
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors w-fit"
            >
              <Plus className="w-4 h-4" />
              Create Scenario
            </button>
          ) : (
            <div className="border border-border rounded-lg p-4 bg-secondary/20">
              <input
                type="text"
                placeholder="Scenario name (e.g., 'Reduce waste 5%')"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateScenario}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Scenario List */}
          {scenarios.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                Saved Scenarios
              </h3>
              {scenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => setSelectedScenario(scenario)}
                  className={cn(
                    "p-4 rounded-lg border transition-colors text-left",
                    selectedScenario?.id === scenario.id
                      ? "bg-primary/10 border-primary"
                      : "bg-secondary/20 border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {scenario.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {scenario.createdAt.toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteScenario(scenario.id);
                      }}
                      className="p-1 hover:bg-red-500/20 rounded transition-colors"
                      title="Delete scenario"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Cost Impact</p>
                      <p className="font-semibold text-foreground">
                        ${(scenario.projectedCost - scenario.baseCost).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Projected Cost</p>
                      <p className="font-semibold text-foreground">
                        ${scenario.projectedCost.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Margin</p>
                      <p
                        className={cn(
                          "font-semibold",
                          scenario.projectedMargin >= 30
                            ? "text-green-600"
                            : "text-red-600"
                        )}
                      >
                        {scenario.projectedMargin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected Scenario Details */}
          {selectedScenario && (
            <div className="border border-border rounded-lg p-4 bg-secondary/20">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                {selectedScenario.name} - Details
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="rounded-lg bg-card p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Base Cost
                  </p>
                  <p className="text-xl font-bold text-foreground">
                    ${selectedScenario.baseCost.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg bg-card p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Projected Cost
                  </p>
                  <p className="text-xl font-bold text-foreground">
                    ${selectedScenario.projectedCost.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg bg-card p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Base Margin
                  </p>
                  <p className="text-xl font-bold text-green-600">
                    {selectedScenario.baseMargin.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-lg bg-card p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Projected Margin
                  </p>
                  <p
                    className={cn(
                      "text-xl font-bold",
                      selectedScenario.projectedMargin >= 30
                        ? "text-green-600"
                        : "text-red-600"
                    )}
                  >
                    {selectedScenario.projectedMargin.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Cost Impact */}
              <div className="rounded-lg bg-card p-3 mb-4">
                <p className="text-sm font-semibold text-foreground mb-2">
                  Total Impact
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">
                    ${(selectedScenario.projectedCost - selectedScenario.baseCost).toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({(
                      ((selectedScenario.projectedCost - selectedScenario.baseCost) /
                        selectedScenario.baseCost) *
                      100
                    ).toFixed(1)}
                    %)
                  </span>
                </div>
              </div>

              {/* Changes Applied */}
              {selectedScenario.changes.length > 0 && (
                <div className="rounded-lg bg-card p-3">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Changes ({selectedScenario.changes.length})
                  </p>
                  <div className="space-y-2">
                    {selectedScenario.changes.map((change, idx) => (
                      <div key={idx} className="text-sm text-muted-foreground">
                        <p>
                          {change.ingredientName || change.type}:{" "}
                          {change.oldValue} → {change.newValue}
                          <span className="text-foreground ml-2 font-medium">
                            Impact: ${change.impact.toFixed(2)}
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedScenario.changes.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  No changes yet. Adjust ingredient costs or quantities to see impact.
                </p>
              )}
            </div>
          )}

          {scenarios.length === 0 && !showForm && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No scenarios created yet.</p>
              <p className="text-sm mt-2">
                Create a scenario to explore cost optimization opportunities.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Close
          </button>
          {selectedScenario && (
            <button
              onClick={() => {
                // TODO: Export scenario
                console.log("Export scenario:", selectedScenario);
              }}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Apply Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
