/**
 * Ingredient Network Graph - Flavor Synergy Visualization
 * 
 * Displays ingredient nodes with weighted edges representing synergy/complementarity.
 * Shows how ingredients work together to create harmony.
 * 
 * Props:
 * - recipeJson: Recipe data as JSON string
 * - apiUrl: Base API URL (default: /api)
 */

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader } from "lucide-react";
import type { FlavorAnalysisResult, IngredientNode, IngredientEdge } from "@/shared/echo/flavor-engine";

interface NetworkGraphProps {
  recipeJson?: string;
  apiUrl?: string;
}

export const IngredientNetworkGraph: React.FC<NetworkGraphProps> = ({
  recipeJson,
  apiUrl = "/api",
}) => {
  const [analysis, setAnalysis] = useState<FlavorAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

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

  // Draw network graph using canvas
  useEffect(() => {
    if (!analysis || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Set up canvas
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);

    const nodes = analysis.ingredientNetwork.nodes;
    const edges = analysis.ingredientNetwork.edges;

    // Position nodes in a circle
    const radius = Math.min(width, height) / 3;
    const centerX = width / 2;
    const centerY = height / 2;

    const nodePositions: Map<string, [number, number]> = new Map();
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      nodePositions.set(node.id, [x, y]);
    });

    // Draw edges
    edges.forEach(edge => {
      const from = nodePositions.get(edge.from);
      const to = nodePositions.get(edge.to);
      if (!from || !to) return;

      // Line width based on strength
      ctx.lineWidth = 1 + edge.strength * 3;
      ctx.strokeStyle = `rgba(100, 150, 255, ${0.3 + edge.strength * 0.5})`;

      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.lineTo(to[0], to[1]);
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(node => {
      const [x, y] = nodePositions.get(node.id) || [0, 0];

      // Node size based on weight
      const radius = 15 + node.weight * 30;

      // Node color based on role
      const roleColors: Record<string, string> = {
        acid: "#fbbf24",
        protein: "#f87171",
        starch: "#93c5fd",
        aromatic: "#d8b4fe",
        "": "#34d399",
      };
      const color = roleColors[node.role || ""];

      // Draw node
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Draw border
      ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw label
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Truncate label if needed
      const label =
        node.label.length > 12
          ? node.label.substring(0, 10) + ".."
          : node.label;

      ctx.fillText(label, x, y - 5);
      ctx.font = "10px sans-serif";
      ctx.fillText(`${(node.weight * 100).toFixed(0)}%`, x, y + 8);
    });

    // Draw title
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Ingredient Synergy Network", 20, 25);
  }, [analysis]);

  if (!recipeJson) {
    return (
      <Card className="p-6">
        <Alert>
          <AlertDescription>
            No recipe data provided. Pass recipeJson prop to visualize ingredient network.
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
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Ingredient Network Graph</h3>
        <p className="text-sm text-gray-600">
          How ingredients interact and complement each other
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-80">
          <Loader className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {analysis && (
        <>
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            className="w-full border rounded bg-white"
          />

          {/* Legend */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Legend:</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-400" />
                <span>Acid</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-400" />
                <span>Protein</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-400" />
                <span>Starch</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-400" />
                <span>Aromatic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-400" />
                <span>Other</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-4 bg-blue-500" />
                <span>Synergy Edge</span>
              </div>
            </div>
          </div>

          {/* Ingredient List */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Ingredients by Dominance:</div>
            <div className="space-y-1">
              {analysis.ingredientNetwork.nodes
                .sort((a, b) => b.weight - a.weight)
                .map(node => (
                  <div key={node.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span>{node.label}</span>
                      {node.role && (
                        <span className="text-gray-500">({node.role})</span>
                      )}
                    </div>
                    <span className="font-medium">
                      {(node.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Top Synergies */}
          {analysis.ingredientNetwork.edges.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Strongest Synergies:</div>
              <div className="space-y-1">
                {analysis.ingredientNetwork.edges
                  .sort((a, b) => b.strength - a.strength)
                  .slice(0, 5)
                  .map((edge, i) => {
                    const fromNode = analysis.ingredientNetwork.nodes.find(
                      n => n.id === edge.from
                    );
                    const toNode = analysis.ingredientNetwork.nodes.find(
                      n => n.id === edge.to
                    );
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span>
                          {fromNode?.label} ↔ {toNode?.label}
                        </span>
                        <span className="font-medium">
                          {(edge.strength * 100).toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default IngredientNetworkGraph;
