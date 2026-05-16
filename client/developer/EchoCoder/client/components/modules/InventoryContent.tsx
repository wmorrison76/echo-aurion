import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  AlertTriangle,
  TrendingDown,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  sku: string;
  quantity: number;
  unit: string;
  minLevel: number;
  maxLevel: number;
  unitCost: number;
  supplier: string;
  lastRestocked: string;
  expiryDate?: string;
}

const defaultInventory: InventoryItem[] = [
  {
    id: "1",
    name: "Premium Olive Oil",
    category: "Oils & Vinegars",
    sku: "OIL-001",
    quantity: 15,
    unit: "bottles",
    minLevel: 5,
    maxLevel: 20,
    unitCost: 28.5,
    supplier: "Italian Imports Ltd",
    lastRestocked: "2025-01-10",
  },
  {
    id: "2",
    name: "All-Purpose Flour",
    category: "Dry Goods",
    sku: "FLR-001",
    quantity: 3,
    unit: "25lb bags",
    minLevel: 4,
    maxLevel: 8,
    unitCost: 12.0,
    supplier: "Grain & Mills Co",
    lastRestocked: "2025-01-08",
  },
  {
    id: "3",
    name: "Sea Salt (Fine)",
    category: "Seasonings",
    sku: "SAL-002",
    quantity: 8,
    unit: "kg",
    minLevel: 5,
    maxLevel: 15,
    unitCost: 4.5,
    supplier: "Salt & Spice",
    lastRestocked: "2025-01-12",
  },
  {
    id: "4",
    name: "Organic Chicken Breast",
    category: "Proteins",
    sku: "CHI-001",
    quantity: 22,
    unit: "lbs",
    minLevel: 20,
    maxLevel: 40,
    unitCost: 6.75,
    supplier: "Organic Farms Direct",
    lastRestocked: "2025-01-13",
    expiryDate: "2025-01-20",
  },
  {
    id: "5",
    name: "Wild Salmon Fillet",
    category: "Proteins",
    sku: "SAL-001",
    quantity: 8,
    unit: "lbs",
    minLevel: 10,
    maxLevel: 25,
    unitCost: 15.5,
    supplier: "Seafood Premium",
    lastRestocked: "2025-01-11",
    expiryDate: "2025-01-16",
  },
  {
    id: "6",
    name: "Heavy Cream",
    category: "Dairy",
    sku: "DRY-001",
    quantity: 12,
    unit: "quarts",
    minLevel: 8,
    maxLevel: 16,
    unitCost: 3.25,
    supplier: "Dairy Direct",
    lastRestocked: "2025-01-12",
    expiryDate: "2025-01-18",
  },
];

export default function InventoryContent() {
  const [inventory, setInventory] = useState<InventoryItem[]>(defaultInventory);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const categories = ["all", ...new Set(inventory.map((i) => i.category))];

  const filteredItems = inventory.filter(
    (item) =>
      (filterCategory === "all" || item.category === filterCategory) &&
      (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const getLowStockItems = () =>
    inventory.filter((i) => i.quantity <= i.minLevel).length;
  const getTotalValue = () =>
    inventory
      .reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
      .toFixed(2);

  const getStatusColor = (item: InventoryItem) => {
    if (item.quantity <= item.minLevel)
      return "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30";
    if (item.quantity >= item.maxLevel)
      return "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30";
    return "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30";
  };

  const handleAdjustQuantity = (itemId: string, newQuantity: number) => {
    setInventory(
      inventory.map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.max(0, newQuantity) }
          : item,
      ),
    );

    if (selectedItem?.id === itemId) {
      setSelectedItem({ ...selectedItem, quantity: Math.max(0, newQuantity) });
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {/* List & Summary */}
      <div className="col-span-1 flex flex-col gap-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-2">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{inventory.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-red-600">
                  {getLowStockItems()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
        <div className="space-y-2">
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-sm"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full text-sm border rounded px-2 py-1"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "all" ? "All Categories" : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Items List */}
        <div className="overflow-y-auto space-y-2 flex-1">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className={`cursor-pointer transition-colors ${
                selectedItem?.id === item.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
              onClick={() => setSelectedItem(item)}
            >
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm line-clamp-2">
                      {item.name}
                    </p>
                    {item.quantity <= item.minLevel && (
                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                  <Badge className={getStatusColor(item)} variant="secondary">
                    {item.quantity} {item.unit}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Item Details */}
      <div className="col-span-2 overflow-y-auto">
        {selectedItem ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{selectedItem.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    SKU: {selectedItem.sku}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status */}
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Current Stock
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={selectedItem.quantity}
                          onChange={(e) =>
                            handleAdjustQuantity(
                              selectedItem.id,
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="border rounded px-2 py-1 w-20 font-bold"
                        />
                        <span className="text-sm">{selectedItem.unit}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Status
                      </p>
                      <Badge className={getStatusColor(selectedItem)}>
                        {selectedItem.quantity <= selectedItem.minLevel
                          ? "Low Stock"
                          : selectedItem.quantity >= selectedItem.maxLevel
                            ? "Overstock"
                            : "Optimal"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Stock Levels */}
                <div className="border-t pt-4">
                  <p className="font-semibold text-sm mb-3">Stock Levels</p>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Min: {selectedItem.minLevel}</span>
                        <span>Max: {selectedItem.maxLevel}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            selectedItem.quantity <= selectedItem.minLevel
                              ? "bg-red-500"
                              : selectedItem.quantity >= selectedItem.maxLevel
                                ? "bg-blue-500"
                                : "bg-green-500"
                          }`}
                          style={{
                            width: `${Math.min(100, (selectedItem.quantity / selectedItem.maxLevel) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="border-t pt-4">
                  <p className="font-semibold text-sm mb-3">Details</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Category</p>
                      <p className="font-semibold">{selectedItem.category}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Unit Cost</p>
                      <p className="font-semibold">
                        ${selectedItem.unitCost.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Supplier</p>
                      <p className="font-semibold">{selectedItem.supplier}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Restocked</p>
                      <p className="font-semibold">
                        {selectedItem.lastRestocked}
                      </p>
                    </div>
                    {selectedItem.expiryDate && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Expiry Date</p>
                        <p className="font-semibold text-orange-600">
                          {selectedItem.expiryDate}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stock Value */}
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm">
                    <strong>Total Value:</strong> $
                    {(selectedItem.quantity * selectedItem.unitCost).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="flex items-center justify-center h-full">
            <CardContent>
              <p className="text-muted-foreground">
                Select an item to view details
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
