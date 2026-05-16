import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  Calendar,
  Package,
} from "lucide-react";
import { format } from "date-fns";

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  location: string;
  notes?: string;
}

interface ShelfCountSession {
  id: string;
  countDate: string;
  items: InventoryItem[];
  employeeId: string;
  notes?: string;
  recordedAt?: string;
}

export interface TabletInventoryShelfCountProps {
  deviceId: string;
  onClose?: () => void;
}

const STORAGE_UNITS = [
  "pcs",
  "lbs",
  "kg",
  "oz",
  "ml",
  "L",
  "cups",
  "tbsp",
  "tsp",
];
const STORAGE_LOCATIONS = [
  "Walk-in Cooler",
  "Walk-in Freezer",
  "Dry Storage",
  "Pantry",
  "Shelf",
];

export function TabletInventoryShelfCount({
  deviceId,
  onClose,
}: TabletInventoryShelfCountProps) {
  const { toast } = useToast();

  const [countSession, setCountSession] = useState<ShelfCountSession>({
    id: `count-${Date.now()}`,
    countDate: format(new Date(), "yyyy-MM-dd"),
    items: [],
    employeeId: localStorage.getItem("tablet:employeeId") || "",
    notes: "",
  });

  const [newItem, setNewItem] = useState({
    name: "",
    quantity: 0,
    unit: "pcs",
    location: "Shelf",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);

  const handleAddItem = () => {
    if (!newItem.name.trim()) {
      toast({
        title: "Validation",
        description: "Please enter item name",
        variant: "destructive",
      });
      return;
    }

    const item: InventoryItem = {
      id: `item-${Date.now()}`,
      ...newItem,
    };

    setCountSession((prev) => ({
      ...prev,
      items: [...prev.items, item],
    }));

    setNewItem({
      name: "",
      quantity: 0,
      unit: "pcs",
      location: "Shelf",
      notes: "",
    });

    setShowAddItem(false);
    toast({
      title: "Item added",
      description: `${item.name} added to inventory count`,
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setCountSession((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  };

  const handleSubmit = async () => {
    if (countSession.items.length === 0) {
      toast({
        title: "Validation",
        description: "Please add at least one item to the count",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/tablet/inventory/shelf-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          items: countSession.items,
          countDate: countSession.countDate,
          employeeId: countSession.employeeId,
          notes: countSession.notes,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit inventory count");

      const data = await response.json();

      toast({
        title: "Success",
        description: `Inventory count recorded: ${countSession.items.length} items`,
      });

      setCountSession({
        id: `count-${Date.now()}`,
        countDate: format(new Date(), "yyyy-MM-dd"),
        items: [],
        employeeId: localStorage.getItem("tablet:employeeId") || "",
        notes: "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to submit count",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="dark:text-slate-50">
                  Monthly Inventory Shelf Count
                </CardTitle>
              </div>
              <CardDescription className="dark:text-slate-400">
                Record current inventory quantities for all storage locations
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg">
              <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Count Date
                </p>
                <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-50">
                  {format(new Date(countSession.countDate), "MMM d")}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Employee ID (Optional)
              </label>
              <Input
                placeholder="Your employee ID"
                value={countSession.employeeId}
                onChange={(e) =>
                  setCountSession((prev) => ({
                    ...prev,
                    employeeId: e.target.value,
                  }))
                }
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Count Date
              </label>
              <Input
                type="date"
                value={countSession.countDate}
                onChange={(e) =>
                  setCountSession((prev) => ({
                    ...prev,
                    countDate: e.target.value,
                  }))
                }
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Count Notes (Optional)
            </label>
            <textarea
              value={countSession.notes}
              onChange={(e) =>
                setCountSession((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              placeholder="Any notes about the count or inventory issues..."
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                  Items Counted
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Total items: <span className="font-semibold">{countSession.items.length}</span>
                </p>
              </div>
              <Button
                onClick={() => setShowAddItem(true)}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>

            {countSession.items.length === 0 ? (
              <Alert className="border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                <AlertCircle className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <AlertDescription className="text-slate-700 dark:text-slate-300">
                  No items added yet. Click "Add Item" to start counting.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Item Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Unit
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Notes
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {countSession.items.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                        >
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {item.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-mono">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {item.unit}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {item.location}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                            {item.notes || "-"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
            {onClose && (
              <Button
                variant="outline"
                onClick={onClose}
                className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || countSession.items.length === 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Submit Inventory Count
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="sm:max-w-lg dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-50">
              Add Inventory Item
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Enter details for the inventory item you're counting
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Item Name *
              </label>
              <Input
                placeholder="e.g., Tomatoes, Chicken Breast, Olive Oil"
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Quantity *
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newItem.quantity}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Unit *
                </label>
                <Select
                  value={newItem.unit}
                  onValueChange={(value) =>
                    setNewItem({ ...newItem, unit: value })
                  }
                >
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    {STORAGE_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Storage Location *
              </label>
              <Select
                value={newItem.location}
                onValueChange={(value) =>
                  setNewItem({ ...newItem, location: value })
                }
              >
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  {STORAGE_LOCATIONS.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                placeholder="Any observations about this item..."
                value={newItem.notes}
                onChange={(e) =>
                  setNewItem({ ...newItem, notes: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddItem(false)}
                className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddItem}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
