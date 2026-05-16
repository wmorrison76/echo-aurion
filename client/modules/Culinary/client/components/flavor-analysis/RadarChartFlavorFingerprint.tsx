/**
 * Radar Chart - Flavor Fingerprint Visualization
 * 
 * Displays the 18 flavor dimensions as a radar chart.
 * Uses Chart.js for rendering.
 * 
 * Props:
 * - recipeJson: Recipe data as JSON string
 * - apiUrl: Base API URL (default: /api)
 */

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader } from "lucide-react";
import type { FlavorAnalysisResult } from "@/shared/echo/flavor-engine";

interface RadarChartProps {
  recipeJson?: string;
  apiUrl?: string;
}

export const RadarChartFlavorFingerprint: React.FC<RadarChartProps> = ({
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

  // Render radar chart using Chart.js
  useEffect(() => {
    if (!analysis || !chartRef.current) return;

    const loadChart = async () => {
      try {
        // Dynamically import Chart.js to avoid bundling issues
        const { Chart, registerables } = await import("chart.js");
        Chart.register(...registerables);

        // Destroy previous chart instance
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }

        const ctx = chartRef.current.getContext("2d");
        if (!ctx) return;

        const labels = analysis.fingerprint.attributes.map(a => a.label);
        const data = analysis.fingerprint.attributes.map(a => a.intensity);

        chartInstanceRef.current = new Chart(ctx, {
          type: "radar",
          data: {
            labels,
            datasets: [
              {
                label: analysis.fingerprint.recipeName,
                data,
                borderColor: "rgb(75, 192, 192)",
                backgroundColor: "rgba(75, 192, 192, 0.2)",
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: "rgb(75, 192, 192)",
                pointHoverRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                position: "top" as const,
              },
            },
            scales: {
              r: {
                beginAtZero: true,
                max: 1,
                ticks: {
                  stepSize: 0.2,
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
            No recipe data provided. Pass recipeJson prop to visualize flavor fingerprint.
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
        <h3 className="text-lg font-semibold">Flavor Fingerprint</h3>
        {analysis && (
          <p className="text-sm text-gray-600">
            {analysis.fingerprint.recipeName}
          </p>
        )}
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

          {/* Descriptors */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Character:</div>
            <div className="flex flex-wrap gap-2">
              {analysis.fingerprint.descriptors.map((desc, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium"
                >
                  {desc}
                </span>
              ))}
            </div>
          </div>

          {/* Top 5 attributes */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Dominant Notes:</div>
            <div className="grid grid-cols-1 gap-1">
              {analysis.fingerprint.attributes
                .sort((a, b) => b.intensity - a.intensity)
                .slice(0, 5)
                .map((attr, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs">{attr.label}</span>
                    <div className="w-32 bg-gray-200 rounded h-2">
                      <div
                        className="h-2 rounded bg-blue-500"
                        style={{ width: `${attr.intensity * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">
                      {(attr.intensity * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

export default RadarChartFlavorFingerprint;
