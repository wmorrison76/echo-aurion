import { useState, type FC, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
import {
  TrendingUp,
  DollarSign,
  PieChart,
  AlertCircle,
  Loader,
} from "lucide-react";
import { fetchWithLucccaSession } from "./client/modules/auth";
interface MenuItem {
  name: string;
  cost: number;
  price: number;
  demandForecast: number;
  seasonality?: number;
}
interface FinancialForecast {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  grossMargin: number;
  costPercentage: number;
  breakEvenCovers: number;
  profitPerCover: number;
  recommendations: string[];
  riskFactors: string[];
  opportunitiesFlags: string[];
  nextWeekForecast: { revenue: number; cost: number; profit: number }[];
}
interface EchoAurumModuleProps {
  menuItems?: MenuItem[];
  laborCost?: number;
  fixedCosts?: number;
  onForecastGenerated?: (forecast: FinancialForecast) => void;
}
export const EchoAurumModule: FC<EchoAurumModuleProps> = ({
  menuItems = [],
  laborCost = 2500,
  fixedCosts = 1500,
  onForecastGenerated,
}) => {
  const [forecast, setForecast] = useState<FinancialForecast | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<
    "revenue" | "cost" | "margin"
  >("revenue");
  const generateFinancialForecast = async () => {
    setIsGenerating(true);
    try {
      const response = await fetchWithLucccaSession("/api/forecast/financial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuItems,
          laborCost,
          fixedCosts,
          timeframe: "weekly",
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to generate forecast");
      }
      const result = (await response.json()) as FinancialForecast;
      setForecast(result);
      onForecastGenerated?.(result);
    } catch (error) {
      console.error("Error generating forecast:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  return (
    <div className="w-full h-full flex flex-col p-6 bg-gradient-to-br from-background to-muted/40">
      {" "}
      {/* Header */}{" "}
      <div className="mb-6">
        {" "}
        <div className="flex items-center gap-3 mb-2">
          {" "}
          <DollarSign className="w-8 h-8 text-aurum-500" />{" "}
          <h1 className="text-3xl font-bold text-foreground">EchoAurum</h1>{" "}
        </div>{" "}
        <p className="text-muted-foreground">
          {" "}
          Financial forecasting & P&L impact analysis{" "}
        </p>{" "}
      </div>{" "}
      {!forecast ? (
        <div className="flex flex-col items-center justify-center flex-1">
          {" "}
          <div className="text-center mb-6">
            {" "}
            <TrendingUp className="w-16 h-16 text-aurum-500 mx-auto mb-4 opacity-50" />{" "}
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {" "}
              Ready to forecast your financials?{" "}
            </h2>{" "}
            <p className="text-muted-foreground max-w-md">
              {" "}
              EchoAurum analyzes your menu items, costs, and demand to predict
              P&L impact and identify opportunities.{" "}
            </p>{" "}
          </div>{" "}
          <Button
            onClick={generateFinancialForecast}
            disabled={isGenerating || menuItems.length === 0}
            size="lg"
            className="gap-2 bg-amber-600 hover:bg-amber-700"
          >
            {" "}
            {isGenerating ? (
              <>
                {" "}
                <Loader className="w-4 h-4 animate-spin" /> Analyzing...{" "}
              </>
            ) : (
              <>
                {" "}
                <TrendingUp className="w-4 h-4" /> Generate Forecast{" "}
              </>
            )}{" "}
          </Button>{" "}
          {menuItems.length === 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              {" "}
              Add menu items to get started{" "}
            </p>
          )}{" "}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {" "}
          {/* Key Metrics */}{" "}
          <MetricCard
            label="Projected Weekly Revenue"
            value={`$${forecast.totalRevenue.toFixed(2)}`}
            subtext={`${forecast.profitPerCover > 0 ? "+" : ""}$${forecast.profitPerCover.toFixed(2)} per cover`}
            icon={TrendingUp}
            color="green"
          />{" "}
          <MetricCard
            label="Total Cost"
            value={`$${forecast.totalCost.toFixed(2)}`}
            subtext={`${forecast.costPercentage.toFixed(1)}% of revenue`}
            icon={DollarSign}
            color="red"
          />{" "}
          <MetricCard
            label="Gross Profit"
            value={`$${forecast.grossProfit.toFixed(2)}`}
            subtext={`${forecast.grossMargin.toFixed(1)}% margin`}
            icon={PieChart}
            color={forecast.grossMargin > 60 ? "green" : "yellow"}
          />{" "}
        </div>
      )}{" "}
      {/* Additional Content */}{" "}
      {forecast && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
          {" "}
          {/* Alerts & Risks */}{" "}
          <div className="bg-background dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-border">
            {" "}
            <h3 className="font-semibold text-foreground dark:text-white mb-3 flex items-center gap-2">
              {" "}
              <AlertCircle className="w-4 h-4 text-red-500" /> Risk Factors{" "}
            </h3>{" "}
            <ul className="space-y-2 text-sm">
              {" "}
              {forecast.riskFactors.map((risk, idx) => (
                <li key={idx} className="text-muted-foreground flex gap-2">
                  {" "}
                  <span className="text-red-500 flex-shrink-0">⚠</span>{" "}
                  <span>{risk}</span>{" "}
                </li>
              ))}{" "}
            </ul>{" "}
          </div>{" "}
          {/* Opportunities */}{" "}
          <div className="bg-background dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-border">
            {" "}
            <h3 className="font-semibold text-foreground dark:text-white mb-3 flex items-center gap-2">
              {" "}
              <TrendingUp className="w-4 h-4 text-green-500" />{" "}
              Opportunities{" "}
            </h3>{" "}
            <ul className="space-y-2 text-sm">
              {" "}
              {forecast.opportunitiesFlags.map((opp, idx) => (
                <li key={idx} className="text-muted-foreground flex gap-2">
                  {" "}
                  <span className="text-green-500 flex-shrink-0">✓</span>{" "}
                  <span>{opp}</span>{" "}
                </li>
              ))}{" "}
            </ul>{" "}
          </div>{" "}
          {/* Recommendations */}{" "}
          <div className="lg:col-span-2 bg-background dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-border">
            {" "}
            <h3 className="font-semibold text-foreground dark:text-white mb-3">
              {" "}
              Recommendations{" "}
            </h3>{" "}
            <ul className="space-y-2 text-sm">
              {" "}
              {forecast.recommendations.map((rec, idx) => (
                <li key={idx} className="text-muted-foreground flex gap-2">
                  {" "}
                  <span className="text-amber-600 dark:text-amber-400 flex-shrink-0">
                    {" "}
                    •{" "}
                  </span>{" "}
                  <span>{rec}</span>{" "}
                </li>
              ))}{" "}
            </ul>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Reset Button */}{" "}
      {forecast && (
        <Button
          onClick={() => setForecast(null)}
          variant="outline"
          size="sm"
          className="mt-4 w-full"
        >
          {" "}
          Generate New Forecast{" "}
        </Button>
      )}{" "}
    </div>
  );
};
interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: ReactNode;
  color: "green" | "red" | "yellow";
}
function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  color,
}: MetricCardProps) {
  const colorClass =
    color === "green"
      ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
      : color === "red"
        ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
        : "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800";
  const textColorClass =
    color === "green"
      ? "text-green-600 dark:text-green-400"
      : color === "red"
        ? "text-red-600 dark:text-red-400"
        : "text-yellow-600 dark:text-yellow-400";
  return (
    <div className={cn("rounded-lg p-4 border", colorClass)}>
      {" "}
      <div className={cn("flex items-center gap-2 mb-2", textColorClass)}>
        {" "}
        {Icon && typeof Icon === "function" ? (
          <Icon className="w-4 h-4" />
        ) : (
          Icon
        )}{" "}
        <p className="text-xs font-semibold uppercase">{label}</p>{" "}
      </div>{" "}
      <p className="text-2xl font-bold text-foreground dark:text-white">
        {" "}
        {value}{" "}
      </p>{" "}
      {subtext && (
        <p className={cn("text-xs mt-1", textColorClass)}>{subtext}</p>
      )}{" "}
    </div>
  );
}
export default EchoAurumModule;
