/** * Supplier Pricelist * Live supplier cost comparison integrated into whiteboard */ import React, {
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
import { ShoppingCart, TrendingDown } from "lucide-react";
interface SupplierPrice {
  supplierId: string;
  supplierName: string;
  itemName: string;
  unitPrice: number;
  leadTime: number;
  reliability: number;
}
interface SupplierPricelistProps {
  selectedItem?: string;
  onSelectSupplier?: (supplier: SupplierPrice) => void;
}
export const SupplierPricelist: React.FC<SupplierPricelistProps> = ({
  selectedItem = "Fresh Tomatoes",
  onSelectSupplier,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const samplePrices: SupplierPrice[] = [
    {
      supplierId: "s1",
      supplierName: "Fresh Produce Co",
      itemName: selectedItem,
      unitPrice: 2.45,
      leadTime: 2,
      reliability: 95,
    },
    {
      supplierId: "s2",
      supplierName: "Farm Direct",
      itemName: selectedItem,
      unitPrice: 2.15,
      leadTime: 3,
      reliability: 87,
    },
    {
      supplierId: "s3",
      supplierName: "Wholesale Market",
      itemName: selectedItem,
      unitPrice: 1.95,
      leadTime: 1,
      reliability: 92,
    },
  ];
  const cheapest = samplePrices.reduce((min, p) =>
    p.unitPrice < min.unitPrice ? p : min,
  );
  const savings =
    samplePrices.reduce((max, p) => (p.unitPrice > max ? p : max)).unitPrice -
    cheapest.unitPrice;
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className={cn(
          "gap-2 rounded-lg",
          "border-purple-400/30 hover:border-purple-400",
          "text-purple-600 dark:text-purple-400",
        )}
      >
        {" "}
        <ShoppingCart size={16} /> Supplier Prices{" "}
      </Button>
    );
  }
  return (
    <div
      className={cn(
        "absolute top-56 left-20 bg-background dark:bg-slate-800",
        "border border-slate-200 dark:border-border rounded-lg",
        "shadow-2xl p-6 z-50 max-w-sm w-96 max-h-96 overflow-y-auto",
      )}
    >
      {" "}
      <div className="flex items-center justify-between mb-4">
        {" "}
        <h3 className="text-lg font-semibold text-foreground dark:text-white">
          {" "}
          Supplier Prices: {selectedItem}{" "}
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
      {/* Savings Alert */}{" "}
      <div
        className={cn(
          "p-3 rounded mb-4 border",
          "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
        )}
      >
        {" "}
        <div className="flex gap-2 items-start">
          {" "}
          <TrendingDown
            className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
            size={16}
          />{" "}
          <div>
            {" "}
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              {" "}
              Save ${savings.toFixed(2)}/unit{" "}
            </p>{" "}
            <p className="text-xs text-green-600 dark:text-green-300">
              {" "}
              Use {cheapest.supplierName} instead of most expensive{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Supplier List */}{" "}
      <div className="space-y-2">
        {" "}
        {samplePrices.map((price, idx) => (
          <button
            key={price.supplierId}
            onClick={() => {
              onSelectSupplier?.(price);
              setIsOpen(false);
            }}
            className={cn(
              "w-full p-3 rounded border text-left transition-colors",
              idx === 0
                ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-primary"
                : "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:border-slate-400",
            )}
          >
            {" "}
            <div className="flex justify-between items-start mb-1">
              {" "}
              <p
                className={cn(
                  "font-medium",
                  idx === 0
                    ? "text-blue-900 dark:text-blue-100"
                    : "text-foreground dark:text-white",
                )}
              >
                {" "}
                {price.supplierName}{" "}
              </p>{" "}
              {price.supplierId === cheapest.supplierId && (
                <span className="text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-0.5 rounded font-medium">
                  {" "}
                  Best Price{" "}
                </span>
              )}{" "}
            </div>{" "}
            <div className="grid grid-cols-3 gap-2 text-xs">
              {" "}
              <div>
                {" "}
                <p className="text-muted-foreground">Price</p>{" "}
                <p
                  className={cn(
                    "font-bold",
                    idx === 0
                      ? "text-blue-700 dark:text-primary"
                      : "text-foreground",
                  )}
                >
                  {" "}
                  ${price.unitPrice.toFixed(2)}/unit{" "}
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="text-muted-foreground">Lead Time</p>{" "}
                <p
                  className={cn(
                    "font-bold",
                    idx === 0
                      ? "text-blue-700 dark:text-primary"
                      : "text-foreground",
                  )}
                >
                  {" "}
                  {price.leadTime}d{" "}
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="text-muted-foreground">Reliable</p>{" "}
                <p
                  className={cn(
                    "font-bold",
                    idx === 0
                      ? "text-blue-700 dark:text-primary"
                      : "text-foreground",
                  )}
                >
                  {" "}
                  {price.reliability}%{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
          </button>
        ))}{" "}
      </div>{" "}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-border text-xs text-muted-foreground">
        {" "}
        <p>💡 Click a supplier to use their price for menu costing</p>{" "}
      </div>{" "}
    </div>
  );
};
export default SupplierPricelist;
