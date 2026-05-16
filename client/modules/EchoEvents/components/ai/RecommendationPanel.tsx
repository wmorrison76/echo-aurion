import React, { useState, useCallback, useEffect } from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { TrendingUp, Users, UtensilsCrossed, Eye } from "lucide-react";
interface Recommendation {
  id: string;
  title: string;
  description: string;
  confidence: number;
  category: "vendor" | "pricing" | "menu" | "demand";
  icon: React.ReactNode;
  details: Record<string, any>;
}
interface RecommendationPanelProps {
  eventId: string;
  onApplyRecommendation?: (recommendation: Recommendation) => void;
}
const categoryConfig: Record<
  string,
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  vendor: {
    icon: <Users size={20} />,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  pricing: {
    icon: <TrendingUp size={20} />,
    color: "text-primary",
    bgColor: "bg-blue-50",
  },
  menu: {
    icon: <UtensilsCrossed size={20} />,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  demand: {
    icon: <Eye size={20} />,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
};
export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  eventId,
  onApplyRecommendation,
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string>("all");
  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        const [vendors, pricing, menu, forecast] = await Promise.all([
          fetch(`/api/v1/ai-recommendations/vendors?eventId=${eventId}`).then(
            (r) => r.json(),
          ),
          fetch(`/api/v1/ai-recommendations/pricing?eventId=${eventId}`).then(
            (r) => r.json(),
          ),
          fetch(`/api/v1/ai-recommendations/menu?eventId=${eventId}`).then(
            (r) => r.json(),
          ),
          fetch(
            `/api/v1/ai-recommendations/demand-forecast?eventId=${eventId}`,
          ).then((r) => r.json()),
        ]);
        const allRecs: Recommendation[] = [];
        if (vendors.data) {
          vendors.data.slice(0, 3).forEach((v: any, idx: number) => {
            allRecs.push({
              id: `vendor-${idx}`,
              title: v.vendorName,
              description: `${v.category} vendor with ${(v.costSavings * 100).toFixed(0)}% potential savings`,
              confidence: v.matchScore,
              category: "vendor",
              icon: categoryConfig.vendor.icon,
              details: {
                costSavings: `${(v.costSavings * 100).toFixed(0)}%`,
                quality: (v.quality * 100).toFixed(0),
                reliability: (v.reliability * 100).toFixed(0),
              },
            });
          });
        }
        if (pricing.data) {
          pricing.data.slice(0, 2).forEach((p: any, idx: number) => {
            allRecs.push({
              id: `pricing-${idx}`,
              title: `Optimize ${p.itemName}`,
              description: `Adjust price from $${p.currentPrice} to $${p.recommendedPrice}`,
              confidence: p.confidence,
              category: "pricing",
              icon: categoryConfig.pricing.icon,
              details: {
                currentPrice: `$${p.currentPrice}`,
                recommendedPrice: `$${p.recommendedPrice}`,
                marginImprovement: `${(p.estimatedMarginImprovement * 100).toFixed(0)}%`,
              },
            });
          });
        }
        if (menu.data) {
          menu.data.slice(0, 2).forEach((m: any, idx: number) => {
            allRecs.push({
              id: `menu-${idx}`,
              title: `${m.action === "promote" ? "Promote" : m.action === "discontinue" ? "Remove" : "Adjust"} ${m.itemName}`,
              description: m.reason,
              confidence: m.confidence,
              category: "menu",
              icon: categoryConfig.menu.icon,
              details: { action: m.action, impact: m.expectedImpact },
            });
          });
        }
        if (forecast.data) {
          allRecs.push({
            id: "demand-forecast",
            title: "Demand Forecast",
            description: `Predicted ${forecast.data.predictedDemand} units demand next month`,
            confidence: forecast.data.confidence,
            category: "demand",
            icon: categoryConfig.demand.icon,
            details: {
              predictedDemand: forecast.data.predictedDemand,
              recommendations: forecast.data.recommendations,
            },
          });
        }
        setRecommendations(allRecs);
      } catch (error) {
        console.error("Failed to fetch recommendations:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, [eventId]);
  const filteredRecs =
    selectedTab === "all"
      ? recommendations
      : recommendations.filter((r) => r.category === selectedTab);
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return "text-green-600";
    if (confidence >= 0.8) return "text-primary";
    if (confidence >= 0.7) return "text-yellow-600";
    return "text-muted-foreground";
  };
  if (loading) {
    return (
      <div className="p-6 text-center">
        {" "}
        <div className="inline-block animate-spin">
          {" "}
          <TrendingUp size={24} className="text-primary" />{" "}
        </div>{" "}
        <p className="text-sm text-muted-foreground mt-2">
          Loading recommendations...
        </p>{" "}
      </div>
    );
  }
  return (
    <div className="space-y-4 p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg">
      {" "}
      {/* Tab Navigation */}{" "}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {" "}
        <Button
          size="sm"
          variant={selectedTab === "all" ? "default" : "outline"}
          onClick={() => setSelectedTab("all")}
        >
          {" "}
          All ({recommendations.length}){" "}
        </Button>{" "}
        {["vendor", "pricing", "menu", "demand"].map((cat) => (
          <Button
            key={cat}
            size="sm"
            variant={selectedTab === cat ? "default" : "outline"}
            onClick={() => setSelectedTab(cat)}
          >
            {" "}
            {cat.charAt(0).toUpperCase() + cat.slice(1)} ({" "}
            {recommendations.filter((r) => r.category === cat).length}){" "}
          </Button>
        ))}{" "}
      </div>{" "}
      {/* Recommendations Grid */}{" "}
      {filteredRecs.length === 0 ? (
        <Card className="p-8 text-center text-gray-400">
          {" "}
          <p className="text-sm">No recommendations available</p>{" "}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
          {" "}
          {filteredRecs.map((rec) => {
            const config = categoryConfig[rec.category];
            return (
              <Card
                key={rec.id}
                className={`p-4 cursor-pointer transition hover:shadow-md border-l-4 ${config.bgColor} border-l-gray-300`}
              >
                {" "}
                <div className="flex justify-between items-start mb-2">
                  {" "}
                  <div className="flex items-start gap-3 flex-1">
                    {" "}
                    <div className={`${config.color} mt-0.5`}>
                      {" "}
                      {config.icon}{" "}
                    </div>{" "}
                    <div className="flex-1">
                      {" "}
                      <h4 className="font-semibold text-sm">
                        {rec.title}
                      </h4>{" "}
                      <p className="text-xs text-muted-foreground mt-1">
                        {" "}
                        {rec.description}{" "}
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="text-right ml-4">
                    {" "}
                    <Badge
                      className={`${getConfidenceColor(rec.confidence)} text-xs`}
                      variant="secondary"
                    >
                      {" "}
                      {(rec.confidence * 100).toFixed(0)}%{" "}
                    </Badge>{" "}
                  </div>{" "}
                </div>{" "}
                {/* Details */}{" "}
                {Object.keys(rec.details).length > 0 && (
                  <div className="mt-3 p-2 bg-background rounded text-xs space-y-1">
                    {" "}
                    {rec.category === "demand" &&
                      rec.details.recommendations && (
                        <div>
                          {" "}
                          <strong>Actions:</strong>{" "}
                          <ul className="ml-2 mt-1 space-y-0.5">
                            {" "}
                            {rec.details.recommendations.map(
                              (r: string, i: number) => (
                                <li key={i}>• {r}</li>
                              ),
                            )}{" "}
                          </ul>{" "}
                        </div>
                      )}{" "}
                    {rec.category !== "demand" &&
                      Object.entries(rec.details).map(([key, value]) => (
                        <div key={key}>
                          {" "}
                          <strong>{key}:</strong> {JSON.stringify(value)}{" "}
                        </div>
                      ))}{" "}
                  </div>
                )}{" "}
                {/* Action Button */}{" "}
                <Button
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => onApplyRecommendation?.(rec)}
                >
                  {" "}
                  Apply{" "}
                </Button>{" "}
              </Card>
            );
          })}{" "}
        </div>
      )}{" "}
      {/* Summary Stats */}{" "}
      {recommendations.length > 0 && (
        <Card className="p-4 bg-background grid grid-cols-4 gap-2 text-center">
          {" "}
          <div>
            {" "}
            <div className="text-lg font-bold text-purple-600">
              {" "}
              {
                recommendations.filter((r) => r.category === "vendor").length
              }{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground">Vendors</p>{" "}
          </div>{" "}
          <div>
            {" "}
            <div className="text-lg font-bold text-primary">
              {" "}
              {
                recommendations.filter((r) => r.category === "pricing").length
              }{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground">Pricing</p>{" "}
          </div>{" "}
          <div>
            {" "}
            <div className="text-lg font-bold text-orange-600">
              {" "}
              {recommendations.filter((r) => r.category === "menu").length}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground">Menu</p>{" "}
          </div>{" "}
          <div>
            {" "}
            <div className="text-lg font-bold text-green-600">
              {" "}
              {
                recommendations.filter((r) => r.category === "demand").length
              }{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground">Demand</p>{" "}
          </div>{" "}
        </Card>
      )}{" "}
    </div>
  );
};
