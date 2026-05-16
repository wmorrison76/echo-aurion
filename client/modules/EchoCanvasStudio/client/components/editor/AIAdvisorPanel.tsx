/**
 * AI Advisor Panel
 * Master Chef + CPA Intelligence for Cake Design
 * 
 * Features:
 * - Design Advice (AI-powered suggestions)
 * - Cost Estimation (ingredient cost + labor time + pricing)
 * - Trend Analysis (trending designs, colors, flavors)
 * - Recipe Mapping (flavor-matched recipes from knowledge base)
 */

import React, { useState, useCallback } from "react";
import { ChefHat, TrendingUp, DollarSign, BookOpen, Loader2, AlertCircle } from "lucide-react";

interface DesignSuggestion {
  id: string;
  title: string;
  description: string;
  complexity: number;
  estimatedTime: number;
  confidence: number;
  reasoning: string;
}

interface CostBreakdown {
  ingredientCost: number;
  laborCost: number;
  totalCost: number;
  suggestedRetailPrice: number;
  profitMargin: number;
  profitMarginPercent: number;
}

interface TrendItem {
  name: string;
  popularity: number;
  growthTrend: "up" | "down" | "stable";
}

export function AIAdvisorPanel() {
  // State management
  const [activeTab, setActiveTab] = useState<"advisor" | "cost" | "trends">("advisor");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Design Advisor state
  const [designParams, setDesignParams] = useState({
    cakeSize: "8-inch",
    flavor: "vanilla",
    occasion: "birthday",
    budget: "moderate",
  });
  const [suggestions, setSuggestions] = useState<DesignSuggestion[]>([]);

  // Cost Estimator state
  const [costParams, setCostParams] = useState({
    estimatedHours: 3,
    baseIngredientCost: 25,
    bakerSkillLevel: "intermediate",
    rushOrder: false,
  });
  const [costEstimate, setCostEstimate] = useState<CostBreakdown | null>(null);

  // Trends state
  const [trends, setTrends] = useState<{
    topDesigns: TrendItem[];
    colorTrends: TrendItem[];
    flavorTrends: TrendItem[];
  } | null>(null);

  /**
   * Get design advice from AI
   */
  const getDesignAdvice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/design-advice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bakery-Id": localStorage.getItem("bakeryId") || "test-bakery",
          "X-User-Id": localStorage.getItem("userId") || "test-user",
        },
        body: JSON.stringify(designParams),
      });

      if (!response.ok) throw new Error("Failed to get design advice");
      const result = await response.json();
      setSuggestions(result.data?.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error getting design advice");
    } finally {
      setLoading(false);
    }
  }, [designParams]);

  /**
   * Estimate costs
   */
  const estimateCosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/cost-estimate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bakery-Id": localStorage.getItem("bakeryId") || "test-bakery",
          "X-User-Id": localStorage.getItem("userId") || "test-user",
        },
        body: JSON.stringify(costParams),
      });

      if (!response.ok) throw new Error("Failed to estimate costs");
      const result = await response.json();
      setCostEstimate(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error estimating costs");
    } finally {
      setLoading(false);
    }
  }, [costParams]);

  /**
   * Get trend analysis
   */
  const getTrendAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/trends", {
        method: "GET",
        headers: {
          "X-Bakery-Id": localStorage.getItem("bakeryId") || "test-bakery",
          "X-User-Id": localStorage.getItem("userId") || "test-user",
        },
      });

      if (!response.ok) throw new Error("Failed to get trends");
      const result = await response.json();
      setTrends({
        topDesigns: result.data?.topDesigns || [],
        colorTrends: result.data?.colorTrends || [],
        flavorTrends: result.data?.flavorTrends || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error getting trends");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#0b0f1a",
        borderLeft: "1px solid #444",
        color: "#c8a97e",
        fontFamily: "monospace",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid #444",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <ChefHat size={16} color="#c8a97e" />
        <span style={{ fontWeight: "bold", fontSize: "12px" }}>AI ADVISOR</span>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #444",
          backgroundColor: "rgba(200, 169, 126, 0.02)",
        }}
      >
        {[
          { id: "advisor", label: "Design", icon: "🎨" },
          { id: "cost", label: "Cost", icon: "💰" },
          { id: "trends", label: "Trends", icon: "📈" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              backgroundColor:
                activeTab === tab.id ? "rgba(200, 169, 126, 0.1)" : "transparent",
              color: activeTab === tab.id ? "#c8a97e" : "#666",
              cursor: "pointer",
              fontSize: "10px",
              fontWeight: "bold",
              textTransform: "uppercase",
              borderBottom: activeTab === tab.id ? "2px solid #c8a97e" : "none",
              transition: "all 0.3s",
            }}
          >
            <span style={{ marginRight: "4px" }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: "10px",
            backgroundColor: "rgba(255, 100, 100, 0.1)",
            borderBottom: "1px solid #f64",
            color: "#f64",
            fontSize: "9px",
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        {/* DESIGN ADVISOR TAB */}
        {activeTab === "advisor" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "9px", color: "#888", textTransform: "uppercase" }}>
                Cake Size
              </label>
              <select
                value={designParams.cakeSize}
                onChange={(e) =>
                  setDesignParams({ ...designParams, cakeSize: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "6px",
                  marginTop: "4px",
                  backgroundColor: "rgba(200, 169, 126, 0.05)",
                  border: "1px solid #444",
                  color: "#c8a97e",
                  fontSize: "10px",
                  borderRadius: "3px",
                }}
              >
                <option>6-inch</option>
                <option>8-inch</option>
                <option>10-inch</option>
                <option>12-inch</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "9px", color: "#888", textTransform: "uppercase" }}>
                Flavor Profile
              </label>
              <select
                value={designParams.flavor}
                onChange={(e) =>
                  setDesignParams({ ...designParams, flavor: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "6px",
                  marginTop: "4px",
                  backgroundColor: "rgba(200, 169, 126, 0.05)",
                  border: "1px solid #444",
                  color: "#c8a97e",
                  fontSize: "10px",
                  borderRadius: "3px",
                }}
              >
                <option>vanilla</option>
                <option>chocolate</option>
                <option>strawberry</option>
                <option>lemon</option>
                <option>lavender</option>
                <option>earl-grey</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "9px", color: "#888", textTransform: "uppercase" }}>
                Occasion
              </label>
              <select
                value={designParams.occasion}
                onChange={(e) =>
                  setDesignParams({ ...designParams, occasion: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "6px",
                  marginTop: "4px",
                  backgroundColor: "rgba(200, 169, 126, 0.05)",
                  border: "1px solid #444",
                  color: "#c8a97e",
                  fontSize: "10px",
                  borderRadius: "3px",
                }}
              >
                <option>birthday</option>
                <option>wedding</option>
                <option>anniversary</option>
                <option>corporate</option>
                <option>celebration</option>
              </select>
            </div>

            <button
              onClick={getDesignAdvice}
              disabled={loading}
              style={{
                padding: "8px",
                backgroundColor: loading ? "#444" : "#c8a97e",
                color: loading ? "#888" : "#000",
                border: "none",
                borderRadius: "3px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "10px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "all 0.3s",
              }}
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <ChefHat size={12} />}
              {loading ? "Analyzing..." : "Get Design Advice"}
            </button>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    style={{
                      padding: "10px",
                      backgroundColor: "rgba(200, 169, 126, 0.05)",
                      border: "1px solid #c8a97e",
                      borderRadius: "3px",
                    }}
                  >
                    <div style={{ fontWeight: "bold", fontSize: "10px", marginBottom: "4px" }}>
                      {suggestion.title}
                    </div>
                    <div style={{ fontSize: "8px", color: "#999", marginBottom: "6px" }}>
                      {suggestion.description}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "8px" }}>
                      <div>⏱️ {suggestion.estimatedTime}h</div>
                      <div>📊 {suggestion.complexity}/10</div>
                      <div>✓ {(suggestion.confidence * 100).toFixed(0)}%</div>
                      <div>💭 {suggestion.reasoning.substring(0, 30)}...</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COST ESTIMATOR TAB */}
        {activeTab === "cost" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "9px", color: "#888", textTransform: "uppercase" }}>
                Estimated Hours
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={costParams.estimatedHours}
                onChange={(e) =>
                  setCostParams({ ...costParams, estimatedHours: parseFloat(e.target.value) })
                }
                style={{
                  width: "100%",
                  padding: "6px",
                  marginTop: "4px",
                  backgroundColor: "rgba(200, 169, 126, 0.05)",
                  border: "1px solid #444",
                  color: "#c8a97e",
                  fontSize: "10px",
                  borderRadius: "3px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "9px", color: "#888", textTransform: "uppercase" }}>
                Base Ingredient Cost
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={costParams.baseIngredientCost}
                onChange={(e) =>
                  setCostParams({ ...costParams, baseIngredientCost: parseFloat(e.target.value) })
                }
                style={{
                  width: "100%",
                  padding: "6px",
                  marginTop: "4px",
                  backgroundColor: "rgba(200, 169, 126, 0.05)",
                  border: "1px solid #444",
                  color: "#c8a97e",
                  fontSize: "10px",
                  borderRadius: "3px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "9px", color: "#888", textTransform: "uppercase" }}>
                <input
                  type="checkbox"
                  checked={costParams.rushOrder}
                  onChange={(e) =>
                    setCostParams({ ...costParams, rushOrder: e.target.checked })
                  }
                  style={{ marginRight: "6px" }}
                />
                Rush Order (+25%)
              </label>
            </div>

            <button
              onClick={estimateCosts}
              disabled={loading}
              style={{
                padding: "8px",
                backgroundColor: loading ? "#444" : "#c8a97e",
                color: loading ? "#888" : "#000",
                border: "none",
                borderRadius: "3px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "10px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "all 0.3s",
              }}
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <DollarSign size={12} />}
              {loading ? "Calculating..." : "Estimate Costs"}
            </button>

            {/* Cost Breakdown */}
            {costEstimate && (
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div
                  style={{
                    padding: "10px",
                    backgroundColor: "rgba(200, 169, 126, 0.1)",
                    border: "1px solid #c8a97e",
                    borderRadius: "3px",
                  }}
                >
                  <div style={{ fontSize: "8px", color: "#999", marginBottom: "4px" }}>COST BREAKDOWN</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "9px" }}>
                    <div>Ingredients: ${costEstimate.ingredientCost.toFixed(2)}</div>
                    <div>Labor: ${costEstimate.laborCost.toFixed(2)}</div>
                    <div style={{ fontWeight: "bold", gridColumn: "1 / -1" }}>
                      Total Cost: ${costEstimate.totalCost.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: "10px",
                    backgroundColor: "rgba(100, 255, 100, 0.1)",
                    border: "1px solid #6f6",
                    borderRadius: "3px",
                  }}
                >
                  <div style={{ fontSize: "8px", color: "#999", marginBottom: "4px" }}>PRICING</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "9px" }}>
                    <div style={{ fontWeight: "bold", color: "#6f6" }}>
                      Suggested Price: ${costEstimate.suggestedRetailPrice.toFixed(2)}
                    </div>
                    <div>
                      Profit: ${costEstimate.profitMargin.toFixed(2)} ({costEstimate.profitMarginPercent}%)
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TRENDS TAB */}
        {activeTab === "trends" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              onClick={getTrendAnalysis}
              disabled={loading}
              style={{
                padding: "8px",
                backgroundColor: loading ? "#444" : "#c8a97e",
                color: loading ? "#888" : "#000",
                border: "none",
                borderRadius: "3px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "10px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "all 0.3s",
              }}
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <TrendingUp size={12} />}
              {loading ? "Loading..." : "Analyze Trends"}
            </button>

            {trends && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {/* Top Designs */}
                {trends.topDesigns.length > 0 && (
                  <div>
                    <div style={{ fontSize: "8px", color: "#999", marginBottom: "4px", fontWeight: "bold" }}>
                      🎨 TOP DESIGNS
                    </div>
                    {trends.topDesigns.slice(0, 3).map((design, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "6px",
                          backgroundColor: "rgba(200, 169, 126, 0.05)",
                          borderRadius: "2px",
                          fontSize: "8px",
                          marginBottom: "4px",
                        }}
                      >
                        {design.name} - {design.popularity}% popularity
                      </div>
                    ))}
                  </div>
                )}

                {/* Color Trends */}
                {trends.colorTrends.length > 0 && (
                  <div>
                    <div style={{ fontSize: "8px", color: "#999", marginBottom: "4px", fontWeight: "bold" }}>
                      🎨 COLOR TRENDS
                    </div>
                    {trends.colorTrends.slice(0, 3).map((color, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "6px",
                          backgroundColor: "rgba(200, 169, 126, 0.05)",
                          borderRadius: "2px",
                          fontSize: "8px",
                          marginBottom: "4px",
                        }}
                      >
                        {color.name} - Score: {color.popularity}
                      </div>
                    ))}
                  </div>
                )}

                {/* Flavor Trends */}
                {trends.flavorTrends.length > 0 && (
                  <div>
                    <div style={{ fontSize: "8px", color: "#999", marginBottom: "4px", fontWeight: "bold" }}>
                      🍰 FLAVOR TRENDS
                    </div>
                    {trends.flavorTrends.slice(0, 3).map((flavor, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "6px",
                          backgroundColor: "rgba(200, 169, 126, 0.05)",
                          borderRadius: "2px",
                          fontSize: "8px",
                          marginBottom: "4px",
                        }}
                      >
                        {flavor.name} - {flavor.popularity}% trending
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
