import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Search, Loader2, Check } from "lucide-react";
import FoodRecallNotificationOverlay from "@/components/FoodRecallNotificationOverlay";
import { TabletNav } from "@/components/TabletNav";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

interface WasteEntry {
  id: string;
  category: string;
  itemName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  reason: string;
  timestamp: number;
  employeeId?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  item_type: string;
  unit: string;
}

const WASTE_CATEGORIES = [
  { value: "spoilage", label: "Spoilage", color: "bg-red-100" },
  { value: "prep-loss", label: "Prep Loss", color: "bg-orange-100" },
  { value: "cooking-loss", label: "Cooking Loss", color: "bg-yellow-100" },
  { value: "plate-waste", label: "Plate Waste", color: "bg-blue-100" },
  { value: "overproduction", label: "Overproduction", color: "bg-purple-100" },
  { value: "other", label: "Other", color: "bg-gray-100" },
];

export default function TabletWasteTracking() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<WasteEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deviceId] = useState(
    () => localStorage.getItem("tablet:deviceToken") || "unknown-device",
  );

  // Form state
  const [category, setCategory] = useState("spoilage");
  const [itemSearch, setItemSearch] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("lb");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [reason, setReason] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  // Autocomplete state
  const [suggestedItems, setSuggestedItems] = useState<InventoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Listen for online/offline changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch suggestions when searching
  const searchItems = useCallback(async (search: string) => {
    if (!search.trim()) {
      setSuggestedItems([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/inventory/items?q=${encodeURIComponent(search)}`,
      );
      if (response.ok) {
        const items = await response.json();
        setSuggestedItems(items.slice(0, 10));
      }
    } catch (error) {
      console.error("Failed to search items:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (itemSearch.trim()) {
        searchItems(itemSearch);
        setShowSuggestions(true);
      } else {
        setSuggestedItems([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [itemSearch, searchItems]);

  const handleSelectItem = (item: InventoryItem) => {
    setItemSearch(item.name);
    setUnit(item.unit);
    setSuggestedItems([]);
    setShowSuggestions(false);
  };

  const resetForm = () => {
    setCategory("spoilage");
    setItemSearch("");
    setQuantity("");
    setUnit("lb");
    setCostPerUnit("");
    setReason("");
  };

  const handleAddEntry = useCallback(async () => {
    if (!itemSearch.trim() || !quantity || !unit) {
      toast({
        title: "Missing Information",
        description: "Please fill in item name, quantity, and unit",
        variant: "destructive",
      });
      return;
    }

    const cost = parseFloat(costPerUnit) || 0;
    const newEntry: WasteEntry = {
      id: `waste-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      category,
      itemName: itemSearch,
      quantity: parseFloat(quantity),
      unit,
      costPerUnit: cost,
      reason,
      timestamp: Date.now(),
      employeeId,
    };

    // Save to local storage for offline support
    const savedEntries = JSON.parse(
      localStorage.getItem("tablet:wasteEntries") || "[]",
    );
    savedEntries.push(newEntry);
    localStorage.setItem("tablet:wasteEntries", JSON.stringify(savedEntries));

    // If online, try to sync immediately
    if (isOnline) {
      setSubmitting(true);
      try {
        const response = await fetch("/api/tablet/waste", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEntry),
        });

        if (!response.ok) {
          throw new Error("Failed to save waste entry");
        }

        toast({
          title: "Success",
          description: "Waste entry recorded",
        });
      } catch (error) {
        console.error("Failed to sync waste entry:", error);
        toast({
          title: "Note",
          description: "Entry saved locally. Will sync when online.",
        });
      } finally {
        setSubmitting(false);
      }
    } else {
      toast({
        title: "Offline Mode",
        description: "Entry saved locally. Will sync when back online.",
      });
    }

    setEntries((prev) => [newEntry, ...prev]);
    resetForm();
    setShowForm(false);
  }, [
    itemSearch,
    category,
    quantity,
    unit,
    costPerUnit,
    reason,
    employeeId,
    isOnline,
    toast,
  ]);

  const handleRemoveEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    const savedEntries = JSON.parse(
      localStorage.getItem("tablet:wasteEntries") || "[]",
    );
    const updated = savedEntries.filter((e: WasteEntry) => e.id !== id);
    localStorage.setItem("tablet:wasteEntries", JSON.stringify(updated));
  };

  const totalWasteCost = useMemo(
    () =>
      entries.reduce(
        (sum, entry) => sum + entry.quantity * entry.costPerUnit,
        0,
      ),
    [entries],
  );

  const categoryColor =
    WASTE_CATEGORIES.find((c) => c.value === category)?.color || "bg-gray-100";

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 flex flex-row overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-64 flex-shrink-0 border-r border-slate-200/50">
        <TabletNav />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <FoodRecallNotificationOverlay deviceId={deviceId} />
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Waste Tracking
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Quick line-level entry •{" "}
                {isOnline ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                    Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                    Offline Mode
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Today's Waste
              </p>
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(totalWasteCost)}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Add Entry Button */}
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-5 text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Waste Entry
            </Button>
          )}

          {/* Entry Form */}
          {showForm && (
            <Card className="bg-white shadow-lg border border-red-200">
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-50/50 border-b border-red-200">
                <CardTitle className="text-red-900">New Waste Entry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Category *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {WASTE_CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setCategory(cat.value)}
                        className={`py-3 px-2 rounded-lg text-sm font-medium transition-all border-2 ${
                          category === cat.value
                            ? `${cat.color} ring-2 ring-red-500 border-red-500 shadow-sm`
                            : `${cat.color} border-gray-200 hover:border-gray-300`
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Item Search with Autocomplete */}
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Item Name *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <Input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search item (e.g., 'bananas', 'chicken stock')..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      onFocus={() =>
                        itemSearch.trim() && setShowSuggestions(true)
                      }
                      className="pl-10 bg-white"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-slate-400" />
                    )}
                  </div>

                  {/* Suggestions Dropdown */}
                  {showSuggestions && suggestedItems.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      {suggestedItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelectItem(item)}
                          className="w-full text-left px-4 py-2 hover:bg-slate-100 border-b last:border-b-0"
                        >
                          <div className="font-medium text-slate-900">
                            {item.name}
                          </div>
                          <div className="text-xs text-slate-600">
                            {item.category} • {item.unit}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quantity and Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Quantity *
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      step="0.1"
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Unit *
                    </label>
                    <Select value={unit} onValueChange={setUnit}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lb">lb</SelectItem>
                        <SelectItem value="oz">oz</SelectItem>
                        <SelectItem value="gallon">gallon</SelectItem>
                        <SelectItem value="quart">quart</SelectItem>
                        <SelectItem value="cup">cup</SelectItem>
                        <SelectItem value="pan">pan</SelectItem>
                        <SelectItem value="batch">batch</SelectItem>
                        <SelectItem value="piece">piece</SelectItem>
                        <SelectItem value="unit">unit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Cost Information */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cost Per Unit ($)
                  </label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(e.target.value)}
                    step="0.01"
                    className="bg-white"
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Reason
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., 'Overcooked', 'Dropped', 'Expired'..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="bg-white"
                  />
                </div>

                {/* Employee ID */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Your Name/ID
                  </label>
                  <Input
                    type="text"
                    placeholder="Optional"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="bg-white"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6 border-t border-slate-200">
                  <Button
                    onClick={handleAddEntry}
                    disabled={submitting}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Save Entry
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    variant="outline"
                    className="flex-1 py-2.5 rounded-lg border-slate-300 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Entries List */}
          {entries.length === 0 && !showForm && (
            <div className="text-center py-12 text-slate-500">
              <div className="text-4xl mb-3 opacity-30">🗑️</div>
              <p className="font-medium">No waste entries yet</p>
              <p className="text-sm text-slate-400 mt-1">
                Record waste to track costs and patterns
              </p>
            </div>
          )}

          <div className="space-y-3">
            {entries.map((entry) => (
              <Card
                key={entry.id}
                className="bg-white shadow-sm hover:shadow-md border border-red-200/50 transition-all"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 ${categoryColor}`}
                        >
                          {
                            WASTE_CATEGORIES.find(
                              (c) => c.value === entry.category,
                            )?.label
                          }
                        </span>
                        <span className="text-xs text-slate-500 ml-auto">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900">
                        {entry.itemName}
                      </h3>
                      <div className="text-sm text-slate-600 mt-2 space-y-0.5">
                        <p className="font-medium text-slate-700">
                          {entry.quantity} {entry.unit}
                        </p>
                        {entry.reason && (
                          <p className="text-slate-500 text-xs">
                            Reason: {entry.reason}
                          </p>
                        )}
                        {entry.employeeId && (
                          <p className="text-slate-500 text-xs">
                            By: {entry.employeeId}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4 flex flex-col items-end justify-start">
                      <p className="text-base font-bold text-red-600">
                        {formatCurrency(entry.quantity * entry.costPerUnit)}
                      </p>
                      <button
                        onClick={() => handleRemoveEntry(entry.id)}
                        className="mt-2 text-slate-400 hover:text-red-600 transition-colors"
                        title="Remove entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
