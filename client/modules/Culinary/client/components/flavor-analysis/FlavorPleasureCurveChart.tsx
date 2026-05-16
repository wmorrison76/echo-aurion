/**
 * Pleasure Curve Chart - Multi-Bite Sensory Analysis
 * 
 * Displays how pleasure/craving changes from first bite to last bite.
 * Models palate fatigue, acid refresh, and richness effects.
 * 
 * Props:
 * - recipeJson: Recipe data as JSON string
 * - apiUrl: Base API URL (default: /api)
 */

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { Loader } from "lucide-react";
import type { FlavorAnalysisResult } from "@/shared/echo/flavor-engine";

interface PleasureCurveProps {
  recipeJson?: string;
  apiUrl?: string;
}

export const FlavorPleasureCurveChart: React.FC<PleasureCurveProps> = ({
  recipeJson,
  apiUrl = "/api",
}) => {
  const [analysis, setAnalysis] = useState<FlavorAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chartRef = React.useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = React.useRef<any>(null);

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

  // Render pleasure curve chart
  useEffect(() => {
    if (!analysis || !chartRef.current) return;

    const loadChart = async () => {
      try {
        const { Chart, registerables } = await import("chart.js");
        Chart.register(...registerables);

        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }

        const ctx = chartRef.current.getContext("2d");
        if (!ctx) return;

        const curve = analysis.pleasureCurve;
        const labels = curve.points.map((_, i) => `Bite ${i + 1}`);
        const data = curve.points.map(p => p.pleasure);

        chartInstanceRef.current = new Chart(ctx, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "Pleasure Curve",
                data,
                borderColor: curve.likelyFatigue 
                  ? "rgb(239, 68, 68)" 
                  : "rgb(34, 197, 94)",
                backgroundColor: curve.likelyFatigue
                  ? "rgba(239, 68, 68, 0.1)"
                  : "rgba(34, 197, 94, 0.1)",
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: curve.likelyFatigue 
                  ? "rgb(239, 68, 68)" 
                  : "rgb(34, 197, 94)",
                pointHoverRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                display: true,
                position: "top" as const,
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const value = context.parsed.y;
                    return `Pleasure: ${(value * 100).toFixed(0)}%`;
                  },
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 1,
                title: {
                  display: true,
                  text: "Pleasure / Craving",
                },
                ticks: {
                  callback: (value) => {
                    if (typeof value === "number") {
                      return `${(value * 100).toFixed(0)}%`;
                    }
                    return value;
                  },
                },
              },
              x: {
                title: {
                  display: true,
                  text: "Timeline (First Bite → Last Bite)",
                },
              },
            },
          },
        });
      } catch (err) {
        console.error("Failed to load Chart.js:", err);
      }
    };

    loadChart();

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [analysis]);

  if (!recipeJson) {
    return (
      <Card className="p-6">
        <Alert>
          <AlertDescription>
            No recipe data provided. Pass recipeJson prop to visualize pleasure curve.
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
        <h3 className="text-lg font-semibold">Multi-Bite Pleasure Curve</h3>
        <p className="text-sm text-gray-600">
          Predicted guest enjoyment from first bite to last
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {analysis && (
        <>
          <div className="relative h-96">
            <canvas ref={chartRef} />
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-xs text-gray-600">Peak Pleasure</div>
              <div className="text-2xl font-bold text-blue-600">
                {(analysis.pleasureCurve.peak * 100).toFixed(0)}%
              </div>
            </div>

            <div className="bg-purple-50 p-3 rounded">
              <div className="text-xs text-gray-600">Peak Timing</div>
              <div className="text-2xl font-bold text-purple-600">
                {(analysis.pleasureCurve.peakAt * 100).toFixed(0)}%
              </div>
            </div>

            <div className="bg-amber-50 p-3 rounded">
              <div className="text-xs text-gray-600">Curve Pattern</div>
              <div className="text-sm font-bold text-amber-600 capitalize">
                {analysis.pleasureCurve.pattern}
              </div>
            </div>
          </div>

          {/* Fatigue Alert */}
          {analysis.pleasureCurve.likelyFatigue && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Palate Fatigue Risk:</strong> Predicted decrease in enjoyment over the course of eating. 
                Consider adding textural contrast, temperature variation, or aromatic lift to maintain engagement.
              </AlertDescription>
            </Alert>
          )}

          {/* Interpretation */}
          <div className="bg-gray-50 p-4 rounded space-y-2">
            <div className="text-sm font-medium">Interpretation:</div>
            <div className="text-xs text-gray-700 space-y-1">
              {analysis.pleasureCurve.pattern === "early_peak" && (
                <p>🎯 <strong>Early Peak:</strong> Guests love the first bites but interest drops. Ideal for appetizer courses.</p>
              )}
              {analysis.pleasureCurve.pattern === "balanced" && (
                <p>✨ <strong>Balanced:</strong> Consistent enjoyment throughout. Great for main courses and single dishes.</p>
              )}
              {analysis.pleasureCurve.pattern === "fatigue" && (
                <p>⚠️ <strong>Fatigue Pattern:</strong> Enjoyment decreases over time. Add finishing garnish or palate-cleansing component.</p>
              )}
              {analysis.pleasureCurve.pattern === "creeps_up" && (
                <p>📈 <strong>Creeps Up:</strong> Interest builds toward the end. Excellent finale for multi-course progression.</p>
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

export default FlavorPleasureCurveChart;
