/** * Displays Sales-Per-Labor-Hour metric with color variance indicators. */
import React from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
interface Props {
  sales: number;
  laborHours: number;
  target?: number;
  currency?: string;
}
export const SPLHCard: React.FC<Props> = ({
  sales,
  laborHours,
  target = 100,
  currency = "USD",
}) => {
  const splh = laborHours > 0 ? sales / laborHours : 0;
  const variance = splh - target;
  const variancePercent =
    target > 0 ? ((variance / target) * 100).toFixed(1) : "0";
  const isPositive = variance >= 0;
  const currencySymbols: Record<string, string> = {
    USD: "$",
    CAD: "C$",
    GBP: "£",
    EUR: "€",
  };
  const symbol = currencySymbols[currency] || "$";
  return (
    <Card className="p-4 space-y-2">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <div className="text-sm text-muted-foreground">
            Sales / Labor Hour
          </div>{" "}
          <div className="text-3xl font-bold">
            {" "}
            {symbol} {splh.toFixed(2)}{" "}
          </div>{" "}
        </div>{" "}
        {isPositive ? (
          <TrendingUp className="text-green-600 w-8 h-8" />
        ) : (
          <TrendingDown className="text-red-600 w-8 h-8" />
        )}{" "}
      </div>{" "}
      <div className="grid grid-cols-3 gap-2 text-xs border-t pt-2">
        {" "}
        <div>
          {" "}
          <div className="text-muted-foreground">Sales</div>{" "}
          <div className="font-medium">
            {symbol}
            {sales.toFixed(0)}
          </div>{" "}
        </div>{" "}
        <div>
          {" "}
          <div className="text-muted-foreground">Hours</div>{" "}
          <div className="font-medium">{laborHours.toFixed(1)}h</div>{" "}
        </div>{" "}
        <div>
          {" "}
          <div className="text-muted-foreground">Target</div>{" "}
          <div className="font-medium">
            {symbol}
            {target.toFixed(0)}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <div
        className={`text-sm font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}
      >
        {" "}
        {isPositive ? "+" : ""} {variancePercent}% vs target{" "}
      </div>{" "}
    </Card>
  );
};
