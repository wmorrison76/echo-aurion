import React, { useState } from "react";
/** * Step 2: Menu Builder * Build event menu by selecting from menu library and adding to event */ import {
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed } from "lucide-react";
const MOCK_MENU_ITEMS = [
  {
    id: "m1",
    name: "Grilled Salmon",
    category: "Entree",
    unitPrice: 35,
    allergens: ["Fish"],
  },
  {
    id: "m2",
    name: "Beef Tenderloin",
    category: "Entree",
    unitPrice: 45,
    allergens: [],
  },
  {
    id: "m3",
    name: "Vegetable Risotto",
    category: "Entree",
    unitPrice: 28,
    allergens: [],
  },
  {
    id: "m4",
    name: "Caesar Salad",
    category: "Appetizer",
    unitPrice: 12,
    allergens: ["Dairy"],
  },
  {
    id: "m5",
    name: "Chocolate Cake",
    category: "Dessert",
    unitPrice: 8,
    allergens: ["Dairy", "Gluten"],
  },
];
interface StepMenuBuilderProps {
  onNext: () => void;
}
export function StepMenuBuilder({ onNext }: StepMenuBuilderProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const handleToggleItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };
  const groupedByCategory = MOCK_MENU_ITEMS.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, typeof MOCK_MENU_ITEMS>,
  );
  return (
    <>
      {" "}
      <CardHeader>
        {" "}
        <CardTitle className="flex items-center gap-2">
          {" "}
          <UtensilsCrossed className="h-5 w-5" /> Build Event Menu{" "}
        </CardTitle>{" "}
        <p className="text-sm text-muted-foreground mt-2">
          {" "}
          Select menu items from our library to include in this event{" "}
        </p>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-6">
        {" "}
        {/* Menu Categories */}{" "}
        <div className="space-y-4">
          {" "}
          {Object.entries(groupedByCategory).map(([category, items]) => (
            <div key={category}>
              {" "}
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                {" "}
                {category}{" "}
              </h3>{" "}
              <div className="space-y-2">
                {" "}
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleToggleItem(item.id)}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${selectedItems.includes(item.id) ? "border-primary bg-primary/5" : "border-slate-200 dark:border-border hover:border-primary/50"}`}
                  >
                    {" "}
                    <div className="flex justify-between items-start">
                      {" "}
                      <div>
                        {" "}
                        <p className="font-medium">{item.name}</p>{" "}
                        {item.allergens && item.allergens.length > 0 && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            {" "}
                            Allergens: {item.allergens.join(",")}{" "}
                          </p>
                        )}{" "}
                      </div>{" "}
                      <p className="font-semibold text-primary">
                        {" "}
                        ${item.unitPrice}{" "}
                      </p>{" "}
                    </div>{" "}
                  </button>
                ))}{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </div>{" "}
        {/* Summary */}{" "}
        {selectedItems.length > 0 && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            {" "}
            <p className="text-sm font-medium text-green-900 dark:text-green-300">
              {" "}
              {selectedItems.length} items selected{" "}
            </p>{" "}
          </div>
        )}{" "}
        {/* Action Buttons */}{" "}
        <div className="flex justify-end gap-3 pt-4 border-t">
          {" "}
          <Button
            disabled={selectedItems.length === 0}
            onClick={onNext}
            size="lg"
            className="gap-2"
          >
            {" "}
            Continue →{" "}
          </Button>{" "}
        </div>{" "}
      </CardContent>{" "}
    </>
  );
}
