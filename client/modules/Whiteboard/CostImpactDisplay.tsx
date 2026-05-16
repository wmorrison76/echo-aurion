/** * Cost Impact Display * Shows real-time cost impact of menu items during whiteboard planning * Integrates with Culinary & Inventory modules */ import React, {
  useState,
  useEffect,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
interface MenuItem {
  id: string;
  name: string;
  ingredients: Array<{
    id: string;
    name: string;
    quantity: number;
    unitCost: number;
  }>;
  currentPrice: number;
  foodCost: number;
  margin: number;
}
interface CostImpactDisplayProps {
  selectedItems: MenuItem[];
  onCostUpdate?: (totalCost: number, margin: number) => void;
}
export const CostImpactDisplay: React.FC<CostImpactDisplayProps> = ({
  selectedItems,
  onCostUpdate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const totals = React.useMemo(() => {
    const totalCost = selectedItems.reduce(
      (sum, item) => sum + item.foodCost,
      0,
    );
    const totalPrice = selectedItems.reduce(
      (sum, item) => sum + item.currentPrice,
      0,
    );
    const avgMargin =
      selectedItems.length > 0
        ? ((totalPrice - totalCost) / totalPrice) * 100
        : 0;
    onCostUpdate?.(totalCost, avgMargin);
    return {
      totalCost,
      totalPrice,
      avgMargin: Math.round(avgMargin * 10) / 10,
      itemCount: selectedItems.length,
    };
  }, [selectedItems, onCostUpdate]);
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className={cn(
          "gap-2 rounded-lg",
          "border-green-400/30 hover:border-green-400",
          "text-green-600 dark:text-green-400",
        )}
      >
        {" "}
        <DollarSign size={16} /> Cost Impact ({selectedItems.length}){" "}
      </Button>
    );
  }
  return (
    <div
      className={cn(
        "absolute top-20 left-20 bg-background dark:bg-slate-800",
        "border border-slate-200 dark:border-border rounded-lg",
        "shadow-2xl p-6 z-50 max-w-sm w-96 max-h-96 overflow-y-auto",
      )}
    >
      {" "}
      <div className="flex items-center justify-between mb-4">
        {" "}
        <h3 className="text-lg font-semibold text-foreground dark:text-white">
          {" "}
          Cost Impact Analysis{" "}
        </h3>{" "}
        <Button
          onClick={() => setIsOpen(false)}
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
        >
          {" "}
          ✕{" "}
        </Button>{" "}
      </div>{" "}
      {/* Summary Cards */}{" "}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {" "}
        <div
          className={cn(
            "bg-green-50 dark:bg-green-950/30 p-3 rounded",
            "border border-green-200 dark:border-green-800",
          )}
        >
          {" "}
          <p className="text-xs text-green-700 dark:text-green-400">
            Total Food Cost
          </p>{" "}
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
            {" "}
            ${totals.totalCost.toFixed(2)}{" "}
          </p>{" "}
        </div>{" "}
        <div
          className={cn(
            "bg-blue-50 dark:bg-blue-950/30 p-3 rounded",
            "border border-blue-200 dark:border-blue-800",
          )}
        >
          {" "}
          <p className="text-xs text-blue-700 dark:text-blue-400">
            Avg Margin
          </p>{" "}
          <div className="flex items-center gap-1 mt-1">
            {" "}
            {totals.avgMargin >= 60 ? (
              <TrendingUp size={16} className="text-green-600" />
            ) : (
              <TrendingDown size={16} className="text-red-600" />
            )}{" "}
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {" "}
              {totals.avgMargin}%{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Items List */}{" "}
      <div className="space-y-2 mb-6">
        {" "}
        <h4 className="text-sm font-semibold text-foreground">
          {" "}
          Items ({totals.itemCount}){" "}
        </h4>{" "}
        {selectedItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "p-2 rounded bg-slate-50 dark:bg-slate-700/50",
              "border border-slate-200 dark:border-slate-600",
            )}
          >
            {" "}
            <div className="flex justify-between items-start">
              {" "}
              <div>
                {" "}
                <p className="text-sm font-medium text-foreground dark:text-white">
                  {" "}
                  {item.name}{" "}
                </p>{" "}
                <p className="text-xs text-muted-foreground">
                  {" "}
                  Cost: ${item.foodCost.toFixed(2)} | Price: $
                  {item.currentPrice.toFixed(2)}{" "}
                </p>{" "}
              </div>{" "}
              <span
                className={cn(
                  "text-xs px-2 py-1 rounded font-medium",
                  item.margin >= 60
                    ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
                )}
              >
                {" "}
                {item.margin}%{" "}
              </span>{" "}
            </div>{" "}
          </div>
        ))}{" "}
      </div>{" "}
      {/* Recommendations */}{" "}
      {totals.avgMargin < 60 && (
        <div
          className={cn(
            "p-3 rounded bg-yellow-50 dark:bg-yellow-950/30",
            "border border-yellow-200 dark:border-yellow-800",
            "text-sm text-yellow-900 dark:text-yellow-100",
          )}
        >
          {" "}
          <p className="font-medium mb-1">⚠️ Margin Alert</p>{" "}
          <p className="text-xs">
            {" "}
            Average margin is below 60%. Consider: adjusting prices, reducing
            costs, or swapping items.{" "}
          </p>{" "}
        </div>
      )}{" "}
    </div>
  );
};
export default CostImpactDisplay;
