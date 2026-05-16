/** * Inventory Reserve * Mark ingredients during planning, auto-deduct from inventory * Integrates with Inventory module */ import React, {
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
import { Package, CheckCircle, AlertTriangle } from "lucide-react";
interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  unit: string;
  requiredQty: number;
  available: boolean;
}
interface InventoryReserveProps {
  items: InventoryItem[];
  onReserve?: (items: InventoryItem[]) => void;
}
export const InventoryReserve: React.FC<InventoryReserveProps> = ({
  items,
  onReserve,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reserved, setReserved] = useState<InventoryItem[]>([]);
  const handleToggleReserve = (item: InventoryItem) => {
    const isReserved = reserved.find((r) => r.id === item.id);
    if (isReserved) {
      setReserved(reserved.filter((r) => r.id !== item.id));
    } else {
      setReserved([...reserved, item]);
    }
    onReserve?.([...reserved, item]);
  };
  const shortItems = items.filter((i) => !i.available);
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className={cn(
          "gap-2 rounded-lg",
          shortItems.length > 0
            ? "border-orange-400/30 text-orange-600"
            : "border-green-400/30 text-green-600",
          "dark:text-green-400",
        )}
      >
        {" "}
        <Package size={16} /> Inventory ({shortItems.length} short){" "}
      </Button>
    );
  }
  return (
    <div
      className={cn(
        "absolute top-44 left-20 bg-background dark:bg-slate-800",
        "border border-slate-200 dark:border-border rounded-lg",
        "shadow-2xl p-6 z-50 max-w-sm w-96 max-h-96 overflow-y-auto",
      )}
    >
      {" "}
      <div className="flex items-center justify-between mb-4">
        {" "}
        <h3 className="text-lg font-semibold text-foreground dark:text-white">
          {" "}
          Inventory Reserve{" "}
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
      {shortItems.length > 0 && (
        <div
          className={cn(
            "p-3 rounded mb-4 border",
            "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
          )}
        >
          {" "}
          <div className="flex gap-2">
            {" "}
            <AlertTriangle
              size={16}
              className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5"
            />{" "}
            <div>
              {" "}
              <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
                {" "}
                {shortItems.length} items short{" "}
              </p>{" "}
              <p className="text-xs text-orange-600 dark:text-orange-300">
                {" "}
                Check with suppliers or adjust menu{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
      <div className="space-y-2">
        {" "}
        {items.map((item) => {
          const isReserved = reserved.find((r) => r.id === item.id);
          const isShort = !item.available;
          return (
            <button
              key={item.id}
              onClick={() => handleToggleReserve(item)}
              className={cn(
                "w-full p-2 rounded border text-left transition-colors",
                isReserved
                  ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-primary"
                  : isShort
                    ? "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-600"
                    : "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600",
              )}
            >
              {" "}
              <div className="flex justify-between items-start">
                {" "}
                <div className="flex-1">
                  {" "}
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isReserved
                        ? "text-blue-900 dark:text-blue-100"
                        : isShort
                          ? "text-orange-900 dark:text-orange-100"
                          : "text-foreground",
                    )}
                  >
                    {" "}
                    {item.name}{" "}
                  </p>{" "}
                  <p
                    className={cn(
                      "text-xs",
                      isShort
                        ? "text-orange-700 dark:text-orange-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {" "}
                    Have: {item.currentStock} {item.unit} | Need:{" "}
                    {item.requiredQty} {item.unit}{" "}
                  </p>{" "}
                </div>{" "}
                {isReserved && (
                  <CheckCircle
                    size={16}
                    className="text-primary dark:text-blue-400"
                  />
                )}{" "}
              </div>{" "}
            </button>
          );
        })}{" "}
      </div>{" "}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-border flex gap-2">
        {" "}
        <Button
          onClick={() => setReserved([])}
          variant="ghost"
          size="sm"
          className="flex-1"
        >
          {" "}
          Clear All{" "}
        </Button>{" "}
        <Button
          onClick={() => {
            onReserve?.(reserved);
            setIsOpen(false);
          }}
          size="sm"
          className="flex-1 bg-primary hover:opacity-90"
        >
          {" "}
          Reserve ({reserved.length}){" "}
        </Button>{" "}
      </div>{" "}
    </div>
  );
};
export default InventoryReserve;
