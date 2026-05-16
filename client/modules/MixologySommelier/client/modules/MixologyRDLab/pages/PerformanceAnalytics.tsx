/** * Performance Analytics Page * View sales and performance metrics for a recipe */ import React, {
  useEffect,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { useRecipeStore } from "../stores/recipeStore";
export function PerformanceAnalytics() {
  const { recipeId } = useParams<{ recipeId: string }>();
  const navigate = useNavigate();
  const { currentRecipe, loading, loadRecipe } = useRecipeStore();
  useEffect(() => {
    if (recipeId) {
      loadRecipe(recipeId);
    }
  }, [recipeId, loadRecipe]);
  if (loading || !currentRecipe) {
    return (
      <div className="flex items-center justify-center h-full">
        {" "}
        <div className="text-center">
          {" "}
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>{" "}
          <p className="text-muted-foreground">Loading analytics...</p>{" "}
        </div>{" "}
      </div>
    );
  }
  const perf = currentRecipe.performance;
  const TrendIcon =
    perf.last30Days.trend === "up"
      ? TrendingUp
      : perf.last30Days.trend === "down"
        ? TrendingDown
        : Minus;
  return (
    <div className="h-full flex flex-col p-6">
      {" "}
      <div className="flex items-center gap-4 mb-6">
        {" "}
        <button
          onClick={() => navigate(`/workspace/${recipeId}`)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          {" "}
          <ArrowLeft size={20} />{" "}
        </button>{" "}
        <div>
          {" "}
          <h1 className="text-2xl font-bold text-foreground">
            Performance Analytics
          </h1>{" "}
          <p className="text-sm text-muted-foreground">
            {currentRecipe.name}
          </p>{" "}
        </div>{" "}
      </div>{" "}
      <div className="flex-1 overflow-y-auto space-y-6">
        {" "}
        {/* Overview */}{" "}
        <div className="grid grid-cols-4 gap-4">
          {" "}
          <div className="bg-card border border-border rounded-lg p-4">
            {" "}
            <p className="text-sm text-muted-foreground mb-1">
              Total Sales
            </p>{" "}
            <p className="text-2xl font-bold text-foreground">
              {perf.salesCount}
            </p>{" "}
          </div>{" "}
          <div className="bg-card border border-border rounded-lg p-4">
            {" "}
            <p className="text-sm text-muted-foreground mb-1">Revenue</p>{" "}
            <p className="text-2xl font-bold text-foreground">
              ${perf.revenue.toFixed(2)}
            </p>{" "}
          </div>{" "}
          <div className="bg-card border border-border rounded-lg p-4">
            {" "}
            <p className="text-sm text-muted-foreground mb-1">Profit</p>{" "}
            <p className="text-2xl font-bold text-primary">
              ${perf.profit.toFixed(2)}
            </p>{" "}
          </div>{" "}
          <div className="bg-card border border-border rounded-lg p-4">
            {" "}
            <p className="text-sm text-muted-foreground mb-1">Rating</p>{" "}
            <p className="text-2xl font-bold text-foreground">
              {" "}
              {perf.averageRating.toFixed(1)} ⭐{" "}
            </p>{" "}
            <p className="text-xs text-muted-foreground">
              {perf.reviewCount} reviews
            </p>{" "}
          </div>{" "}
        </div>{" "}
        {/* Last 30 Days */}{" "}
        <div className="bg-card border border-border rounded-lg p-6">
          {" "}
          <div className="flex items-center gap-2 mb-4">
            {" "}
            <BarChart3 className="text-primary" size={20} />{" "}
            <h2 className="text-lg font-semibold text-foreground">
              Last 30 Days
            </h2>{" "}
          </div>{" "}
          <div className="grid grid-cols-3 gap-4">
            {" "}
            <div>
              {" "}
              <p className="text-sm text-muted-foreground mb-1">Sales</p>{" "}
              <div className="flex items-center gap-2">
                {" "}
                <p className="text-xl font-bold text-foreground">
                  {perf.last30Days.sales}
                </p>{" "}
                <TrendIcon
                  size={18}
                  className={
                    perf.last30Days.trend === "up"
                      ? "text-green-500"
                      : perf.last30Days.trend === "down"
                        ? "text-red-500"
                        : "text-muted-foreground"
                  }
                />{" "}
                <span
                  className={`text-sm ${perf.last30Days.trend === "up" ? "text-green-500" : perf.last30Days.trend === "down" ? "text-red-500" : "text-muted-foreground"}`}
                >
                  {" "}
                  {perf.last30Days.trendPercent > 0 ? "+" : ""}{" "}
                  {perf.last30Days.trendPercent.toFixed(1)}%{" "}
                </span>{" "}
              </div>{" "}
            </div>{" "}
            <div>
              {" "}
              <p className="text-sm text-muted-foreground mb-1">Revenue</p>{" "}
              <p className="text-xl font-bold text-foreground">
                {" "}
                ${perf.last30Days.revenue.toFixed(2)}{" "}
              </p>{" "}
            </div>{" "}
            <div>
              {" "}
              <p className="text-sm text-muted-foreground mb-1">Profit</p>{" "}
              <p className="text-xl font-bold text-primary">
                {" "}
                ${perf.last30Days.profit.toFixed(2)}{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        {/* Last 90 Days */}{" "}
        <div className="bg-card border border-border rounded-lg p-6">
          {" "}
          <div className="flex items-center gap-2 mb-4">
            {" "}
            <BarChart3 className="text-primary" size={20} />{" "}
            <h2 className="text-lg font-semibold text-foreground">
              Last 90 Days
            </h2>{" "}
          </div>{" "}
          <div className="grid grid-cols-3 gap-4">
            {" "}
            <div>
              {" "}
              <p className="text-sm text-muted-foreground mb-1">Sales</p>{" "}
              <p className="text-xl font-bold text-foreground">
                {perf.last90Days.sales}
              </p>{" "}
            </div>{" "}
            <div>
              {" "}
              <p className="text-sm text-muted-foreground mb-1">Revenue</p>{" "}
              <p className="text-xl font-bold text-foreground">
                {" "}
                ${perf.last90Days.revenue.toFixed(2)}{" "}
              </p>{" "}
            </div>{" "}
            <div>
              {" "}
              <p className="text-sm text-muted-foreground mb-1">Profit</p>{" "}
              <p className="text-xl font-bold text-primary">
                {" "}
                ${perf.last90Days.profit.toFixed(2)}{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
