import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { TrendingUp, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
interface PriceRecommendation {
  menuItemId: string;
  itemName: string;
  currentPrice: number;
  ingredientCost: number;
  currentMargin: number;
  recommendedPrice: number;
  recommendedMargin: number;
  demandElasticity: number;
  priceChangePercent: number;
  potentialRevenueLift: number;
  confidence: number;
  rationale: string;
}
interface PriceRecommendationPanelProps {
  organizationId: string;
  outletId: string;
  onPriceApply?: (itemId: string, newPrice: number) => void;
}
const getPriceChangeColor = (percent: number): string => {
  if (percent > 5) return "text-red-600";
  if (percent < -5) return "text-green-600";
  return "text-muted-foreground";
};
export const PriceRecommendationPanel: React.FC<
  PriceRecommendationPanelProps
> = ({ organizationId, outletId, onPriceApply }) => {
  const [recommendations, setRecommendations] = useState<PriceRecommendation[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/dynamic-pricing/price-recommendations?organization_id=${organizationId}&outlet_id=${outletId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          },
        );
        if (!response.ok) {
          throw new Error("Failed to fetch recommendations");
        }
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, [organizationId, outletId]);
  if (loading) {
    return <div className="h-64 bg-surface rounded-lg animate-pulse" />;
  }
  const highImpactCount = recommendations.filter(
    (r) => Math.abs(r.priceChangePercent) > 5,
  ).length;
  const avgConfidence =
    recommendations.length > 0
      ? recommendations.reduce((sum, r) => sum + r.confidence, 0) /
        recommendations.length
      : 0;
  const totalRevenueLift = recommendations.reduce(
    (sum, r) => sum + r.potentialRevenueLift,
    0,
  );
  return (
    <div className="space-y-6">
      {" "}
      {/* Summary Cards */}{" "}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {" "}
        <Card>
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Items
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <p className="text-3xl font-bold">{recommendations.length}</p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High Impact
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <p className="text-3xl font-bold text-orange-600">
              {highImpactCount}
            </p>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              Price change &gt; 5%
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Confidence
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <p className="text-3xl font-bold text-primary">
              {(avgConfidence * 100).toFixed(0)}%
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="border-green-200 bg-green-50">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm font-medium text-green-600">
              Potential Revenue Lift
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <p className="text-3xl font-bold text-green-600">
              ${totalRevenueLift.toFixed(0)}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Warnings */}{" "}
      {error && (
        <Alert variant="destructive">
          {" "}
          <AlertTriangle className="h-4 w-4" />{" "}
          <AlertDescription>{error}</AlertDescription>{" "}
        </Alert>
      )}{" "}
      {/* Recommendations List */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Menu Price Recommendations</CardTitle>{" "}
          <CardDescription>
            {" "}
            AI-powered pricing based on ingredient costs, demand elasticity, and
            margin targets{" "}
          </CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          {recommendations.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              {" "}
              No price recommendations available. Check back after analyzing
              sales data.{" "}
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {" "}
              {recommendations.map((rec) => (
                <div
                  key={rec.menuItemId}
                  className="p-4 rounded-lg border hover:bg-surface"
                >
                  {" "}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    {" "}
                    <div>
                      {" "}
                      <h4 className="font-medium text-lg">
                        {rec.itemName}
                      </h4>{" "}
                      <p className="text-sm text-muted-foreground mt-1">
                        {rec.rationale}
                      </p>{" "}
                    </div>{" "}
                    <Badge
                      variant={rec.confidence > 0.8 ? "default" : "outline"}
                    >
                      {" "}
                      {(rec.confidence * 100).toFixed(0)}% Confidence{" "}
                    </Badge>{" "}
                  </div>{" "}
                  {/* Pricing Grid */}{" "}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 bg-surface p-3 rounded">
                    {" "}
                    <div>
                      {" "}
                      <p className="text-xs text-muted-foreground">
                        Current Price
                      </p>{" "}
                      <p className="text-lg font-semibold">
                        ${rec.currentPrice.toFixed(2)}
                      </p>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <p className="text-xs text-muted-foreground">
                        Recommended Price
                      </p>{" "}
                      <p className="text-lg font-semibold">
                        ${rec.recommendedPrice.toFixed(2)}
                      </p>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <p className="text-xs text-muted-foreground">
                        Change
                      </p>{" "}
                      <p
                        className={`text-lg font-semibold ${getPriceChangeColor(rec.priceChangePercent)}`}
                      >
                        {" "}
                        {rec.priceChangePercent > 0 ? "+" : ""}
                        {rec.priceChangePercent.toFixed(1)}%{" "}
                      </p>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <p className="text-xs text-muted-foreground">
                        Revenue Potential
                      </p>{" "}
                      <p className="text-lg font-semibold text-green-600">
                        {" "}
                        ${rec.potentialRevenueLift.toFixed(0)}{" "}
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                  {/* Costs & Margins */}{" "}
                  <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                    {" "}
                    <div>
                      {" "}
                      <p className="text-xs text-muted-foreground">
                        Ingredient Cost
                      </p>{" "}
                      <p className="font-semibold">
                        ${rec.ingredientCost.toFixed(2)}
                      </p>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <p className="text-xs text-muted-foreground">
                        Current Margin
                      </p>{" "}
                      <p className="font-semibold">
                        {rec.currentMargin.toFixed(1)}%
                      </p>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <p className="text-xs text-muted-foreground">
                        Recommended Margin
                      </p>{" "}
                      <p className="font-semibold text-green-600">
                        {rec.recommendedMargin.toFixed(1)}%
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                  {/* Demand Elasticity */}{" "}
                  <div className="flex items-center justify-between mb-3 p-2 bg-blue-50 rounded text-sm">
                    {" "}
                    <span className="text-muted-foreground">
                      {" "}
                      Demand Elasticity: {rec.demandElasticity.toFixed(2)}{" "}
                    </span>{" "}
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      {rec.demandElasticity > 1
                        ? "Price sensitive"
                        : rec.demandElasticity < 1
                          ? "Price inelastic"
                          : "Unit elastic"}{" "}
                    </span>{" "}
                  </div>{" "}
                  {/* Action Button */}{" "}
                  {Math.abs(rec.priceChangePercent) > 1 && (
                    <Button
                      size="sm"
                      onClick={() =>
                        onPriceApply?.(rec.menuItemId, rec.recommendedPrice)
                      }
                      className="w-full"
                    >
                      {" "}
                      {rec.recommendedPrice > rec.currentPrice ? (
                        <>
                          {" "}
                          <ArrowUp className="h-4 w-4 mr-2" /> Apply Price
                          Increase{" "}
                        </>
                      ) : (
                        <>
                          {" "}
                          <ArrowDown className="h-4 w-4 mr-2" /> Apply Price
                          Decrease{" "}
                        </>
                      )}{" "}
                    </Button>
                  )}{" "}
                </div>
              ))}{" "}
            </div>
          )}{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Info Card */}{" "}
      <Card className="bg-blue-50 border-blue-200">
        {" "}
        <CardHeader className="pb-2">
          {" "}
          <CardTitle className="text-sm flex items-center gap-2">
            {" "}
            <TrendingUp className="h-4 w-4" /> Smart Pricing Algorithm{" "}
          </CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent className="text-sm text-foreground">
          {" "}
          <ul className="list-disc pl-4 space-y-1">
            {" "}
            <li>
              Calculates optimal prices based on ingredient costs and 65% target
              margin
            </li>{" "}
            <li>
              Adjusts prices based on demand elasticity (price sensitivity)
            </li>{" "}
            <li>
              Detects cost spikes and recommends immediate price adjustments
            </li>{" "}
            <li>Predicts revenue impact and customer response</li>{" "}
            <li>
              Confidence scores reflect data quality and historical consistency
            </li>{" "}
          </ul>{" "}
        </CardContent>{" "}
      </Card>{" "}
    </div>
  );
};
